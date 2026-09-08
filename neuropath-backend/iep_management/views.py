from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics,viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import IEPDataSerializer, IEPListDetailSerializer, IEPUpdateSerializer,StandaloneIEPGoalSerializer,IEPGenerationRequestSerializer
from users.models import StudentProfile
from users.utils import get_teacher_for_user
from tracking.models import AIGenerationLog
from .models import Assessment, IEPGoal, IEPModel,GeneratedAIInsight
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from .services import AIGenerationService
from .ai_engine import AIEngineService
from .huggingface_service import CustomLlamaService
from .rgori_service import RGORICheckerService
import time
import json

class IEPGeneratorService:
    @staticmethod
    def generate_draft(student, baseline_input, target_domains, teacher_id):
        recent_assessments = Assessment.objects.filter(student=student).order_by('-dateTaken')[:3]
        assessment_context = ''
        if recent_assessments.exists():
            assessment_context = '\nFormal Assessment History:\n' + '\n'.join(
                [f'- {a.assessmentType}: {a.result}' for a in recent_assessments]
            )

        profile_context = student.profileDetails if isinstance(student.profileDetails, dict) else {}

        formatted_prompt = (
            'Act as an expert Special Education teacher. Generate a structured IEP draft.\n'
            f'Student Profile Data:\n'
            f'- Name: {student.name}\n'
            f'- Diagnosis: {student.diagnosis}\n'
            f'- Assessment Result: {student.assessmentResult}\n'
            f'- Support Needs: {student.support_needs}\n'
            f'- Profile Details: {json.dumps(profile_context)}\n'
            f'- Teacher Observations: {baseline_input}\n'
            f'{assessment_context}\n'
            f'- Target Educational Domains: {target_domains}'
        )

        draft_goals = (
            f'1. By the end of the school year, {student.name or "the learner"} will participate in selected learning routines '
            f'with visual supports and teacher guidance across 4 out of 5 opportunities.\n'
            f'2. {student.name or "The learner"} will demonstrate progress in {target_domains or "selected goal areas"} '
            f'through structured tasks, short sessions, and consistent reinforcement.'
        )
        draft_accommodations = (
            'Use structured routines, visual prompts, shortened tasks, sensory or movement breaks when needed, '
            'positive reinforcement, and assistive tools aligned with the learner profile and selected goal areas.'
        )

        if teacher_id:
            try:
                AIGenerationLog.objects.create(
                    teacherID_id=teacher_id,
                    prompt_text=formatted_prompt,
                    ai_response=json.dumps({
                        'draft_goals': draft_goals,
                        'draft_accommodations': draft_accommodations,
                    }),
                )
            except Exception:
                pass

        return {
            'draft_goals': draft_goals,
            'draft_accommodations': draft_accommodations,
        }


class IEPGenerationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        action = request.data.get('action')
        # Always the authenticated caller's identity — never a client-supplied value.
        teacher = get_teacher_for_user(request.user)

        if action == 'generate':
            student_id = request.data.get('studentID')
            baseline_data = request.data.get('baselineData', '')
            target_domains = request.data.get('domains', '')
            if not teacher:
                return Response({'error': 'Unable to verify teacher account.'}, status=status.HTTP_403_FORBIDDEN)

            try:
                student = StudentProfile.objects.get(pk=student_id, teacher=teacher)
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student not found for this teacher account.'}, status=status.HTTP_404_NOT_FOUND)

            draft_payload = IEPGeneratorService.generate_draft(
                student=student,
                baseline_input=baseline_data,
                target_domains=target_domains,
                teacher_id=request.user.id,
            )

            return Response({
                'message': 'Successfully synthesized draft IEP.',
                'draftData': draft_payload,
            }, status=status.HTTP_200_OK)

        if action == 'save':
            payload = request.data.copy()

            # Only allow saving an IEP for a student owned by this teacher account.
            student_id = payload.get('studentID')
            if not teacher:
                # No resolvable teacher — reject to prevent unscoped saves
                return Response({'error': 'Unable to verify teacher account.'}, status=status.HTTP_403_FORBIDDEN)
            try:
                StudentProfile.objects.get(pk=student_id, teacher=teacher)
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student not found for this teacher account.'}, status=status.HTTP_404_NOT_FOUND)

            payload.pop('teacherID', None)
            # Always assign version server-side — ignore any client-supplied value.
            payload.pop('version', None)

            MAX_VERSION_RETRIES = 3
            for attempt in range(MAX_VERSION_RETRIES):
                try:
                    with transaction.atomic():
                        # Lock the student record to serialize concurrent version calculations
                        StudentProfile.objects.select_for_update().get(pk=student_id)

                        # Compute next version from the current maximum.
                        latest_version = (
                            IEPModel.objects.filter(studentID_id=student_id)
                            .order_by('-version')
                            .values_list('version', flat=True)
                            .first()
                        )
                        payload['version'] = (latest_version + 1) if latest_version else 1

                        serializer = IEPDataSerializer(data=payload)
                        if serializer.is_valid():
                            iep_instance = serializer.save()

                            # NOTE: IEPGoal rows are NOT created here intentionally.
                            # The actual AI-generated goals are created separately by
                            # GenerateIEPGoalsFromIEPView (POST /iep/generate-goals-from-iep/)
                            # and then saved via StandaloneIEPGoalViewSet (POST /iep/goals/).
                            # Creating goals here too caused duplicate tables in the frontend.

                            return Response({
                                'message': 'IEP Created Successfully.',
                                'data': IEPListDetailSerializer(iep_instance).data,
                            }, status=status.HTTP_201_CREATED)

                        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                except IntegrityError:
                    if attempt == MAX_VERSION_RETRIES - 1:
                        return Response(
                            {'error': 'IEP version conflict. Please retry.'},
                            status=status.HTTP_409_CONFLICT,
                        )
                    continue  # retry with fresh version calculation

        return Response({'error': 'Invalid action specified.'}, status=status.HTTP_400_BAD_REQUEST)


class IEPListAPIView(generics.ListAPIView):
    serializer_class = IEPListDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        student_id = self.kwargs.get('student_id')

        # Keep View IEP scoped to the currently logged-in teacher account —
        # resolved from the authenticated request user, never a query param.
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPModel.objects.none()

        return IEPModel.objects.filter(
            studentID_id=student_id, studentID__teacher=teacher
        ).order_by('-createdDate')



class IEPDetailAPIView(generics.RetrieveAPIView):
    serializer_class = IEPListDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPModel.objects.none()
        return IEPModel.objects.filter(studentID__teacher=teacher)


class IEPEditAPIView(generics.UpdateAPIView):
    serializer_class = IEPUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPModel.objects.none()
        return IEPModel.objects.filter(studentID__teacher=teacher)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        # Return the full updated IEP using the list/detail serializer so the
        # frontend gets studentName, formattedDate, and all Section B fields back.
        from .serializers import IEPListDetailSerializer
        return Response(IEPListDetailSerializer(instance).data)

    def perform_update(self, serializer):
        serializer.save()


class IEPDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only the teacher who owns the IEP's student can delete it — scoping
        # the lookup itself means an unowned pk simply 404s via get_object().
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPModel.objects.none()
        return IEPModel.objects.filter(studentID__teacher=teacher)

    def destroy(self, request, *args, **kwargs):
        # Ownership is already enforced by get_queryset() above — a pk
        # belonging to another teacher's student simply isn't in scope, so
        # get_object() 404s before we ever reach perform_destroy.
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'IEP record successfully permanently deleted.'}, status=status.HTTP_200_OK)


class StandaloneIEPGoalViewSet(viewsets.ModelViewSet):
    serializer_class = StandaloneIEPGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPGoal.objects.none()

        student_id = self.request.query_params.get('student_id')
        iep_id = self.request.query_params.get('iep')
        latest = self.request.query_params.get('latest') == 'true'

        if student_id:
            try:
                student = StudentProfile.objects.get(pk=student_id, teacher=teacher)
            except StudentProfile.DoesNotExist:
                return IEPGoal.objects.none()

            from resources.views import _latest_saved_iep_for_student, _sync_goals_from_generated_details
            latest_iep = _latest_saved_iep_for_student(student)
            if latest_iep:
                _sync_goals_from_generated_details(latest_iep)

            if latest:
                if not latest_iep:
                    return IEPGoal.objects.none()
                return IEPGoal.objects.filter(iep=latest_iep).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')

            return IEPGoal.objects.filter(iep__studentID=student).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')

        if iep_id:
            return IEPGoal.objects.filter(iep__iepID=iep_id, iep__studentID__teacher=teacher).prefetch_related('objective_rows')

        return IEPGoal.objects.filter(iep__studentID__teacher=teacher).select_related('iep__studentID').prefetch_related('objective_rows')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        teacher = get_teacher_for_user(request.user)
        iep = serializer.validated_data.get('iep')
        if not teacher or not iep or iep.studentID.teacher_id != teacher.teacherID:
            return Response({'error': 'IEP not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    
# 1. GENERATE INSIGHT ENDPOINT
@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Forces the user to be logged in
def generate_ai_insight(request, student_id):
    student = get_object_or_404(StudentProfile, studentID=student_id)
    teacher = request.user # <-- Django automatically knows who called the API based on their token!
    
    try:
        # Pass both the student and the logged-in teacher to the service
        insight = AIGenerationService.generate_and_save_summary(student, teacher)
        
        return Response({
            "id": insight.id,
            "summary_text": insight.summary_text,
            "created_at": insight.created_at
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 2. FETCH INSIGHTS SECURELY ENDPOINT (This answers your exact question!)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_insights(request, student_id):
    # Verify the requesting teacher actually owns this student before
    # exposing any data.  Return 404 for unowned students so that the
    # endpoint doesn't leak the existence of other teachers' records.
    student = get_object_or_404(StudentProfile, studentID=student_id)
    teacher = get_teacher_for_user(request.user)
    if not teacher or student.teacher != teacher:
        return Response(
            {"detail": "Not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    insights = GeneratedAIInsight.objects.filter(
        student_id=student_id,
        teacher=request.user
    )

    # Format the data for React
    data = [
        {
            "id": insight.id,
            "summary_text": insight.summary_text,
            "created_at": insight.created_at.strftime('%Y-%m-%d %H:%M')
        }
        for insight in insights
    ]

    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/iep/dashboard-stats/
    Returns Active IEPs and AI Insights counts for the logged-in teacher.

    The app uses two separate teacher representations:
      - Django auth User  (used by DRF token auth, and by GeneratedAIInsight.teacher)
      - Custom Teacher model (used by StudentProfile.teacher, linked by matching email)

    We resolve the auth User -> Teacher via email to count IEPs correctly.
    """
    auth_user = request.user

    # Resolve auth User -> custom Teacher record via shared email
    from users.models import Teacher
    try:
        teacher = Teacher.objects.get(email=auth_user.email)
    except Teacher.DoesNotExist:
        # Auth user has no matching Teacher record yet — return zeros safely
        return Response({'active_ieps': 0, 'ai_insights': 0}, status=status.HTTP_200_OK)

    # Count IEPs belonging to students of this teacher
    active_ieps = IEPModel.objects.filter(
        studentID__teacher=teacher
    ).count()

    # Count all AI insights generated by this teacher (uses auth User FK directly)
    ai_insights = GeneratedAIInsight.objects.filter(
        teacher=auth_user
    ).count()

    return Response({
        'active_ieps': active_ieps,
        'ai_insights': ai_insights,
    }, status=status.HTTP_200_OK)


class GenerateIEPGoalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Validate the incoming data from React
        serializer = IEPGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        student_context = f"{data['student_name']}, Diagnosis: {data['diagnosis']}, Barriers: {data['baseline_barriers']}"
        generation_prompt = f"Write a specific, measurable IEP goal targeting {data['target_domain']} for {student_context}."
        
        # 2. Setup the Generation & R-GORI Loop variables
        max_attempts = 3
        best_goal = ""
        best_score = 0
        final_feedback = ""

        # 3. The Validation Loop
        for attempt in range(max_attempts):
            try:
                # Step A: Draft the goal
                draft_goal = CustomLlamaService.generate_text(generation_prompt)
                
                # Step B: Audit the goal using R-GORI
                evaluation = RGORICheckerService.evaluate_goal(draft_goal, student_context)
                current_score = evaluation.get('total_score', 0)
                
                # Track the best performing goal in case we never hit 65%
                if current_score > best_score:
                    best_score = current_score
                    best_goal = draft_goal
                    final_feedback = evaluation.get('feedback', '')
                
                # Step C: Break the loop if compliant!
                if evaluation.get('compliant') is True:
                    break
                    
                time.sleep(1) # Prevent Hugging Face rate limits
                
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Send the final, audited result back to React
        return Response({
            "generated_goal": best_goal,
            "rgori_score": best_score,
            "feedback": final_feedback,
            "attempts_taken": attempt + 1
        }, status=status.HTTP_200_OK)
class GenerateIEPGoalsFromIEPView(APIView):
    """
    POST /api/iep/generate-goals-from-iep/
 
    Accepts the IEP fields (accommodations, difficulties, learning_barriers,
    barrier_qualifiers, learning_facilitators, facilitator_qualifiers,
    generatedDetails.special_factors_considerations) plus the iep_id.
 
    For each difficulty/special factor, generates one IEP Goal payload
    (validated to R-GORI >= 65) ready to POST directly to /api/iep/goals/.
 
    Example request body:
    {
        "iep_id": 5,
        "student_name": "Alex Santos",
        "program_type": "Graded",
        "accommodations": "Use visual gestures, tablet communication board.",
        "difficulties": "Difficulty in communicating | Difficulty in displaying Interpersonal Behavior",
        "learning_barriers": "Severe barrier 5 and beyond | Mild to Severe barrier",
        "barrier_qualifiers": "(No barrier, Mild barrier, Moderate Barrier, Severe barrier)",
        "learning_facilitators": "Speech therapist, parents, SNED Teachers | SNED TEACHER",
        "facilitator_qualifiers": "Special Education Professionals and Family",
        "generatedDetails": {
            "special_factors_considerations": [
                {
                    "difficulty": "Difficulty in communicating",
                    "assistive_technology": "PECS, communication books, AAC device"
                },
                {
                    "difficulty": "Difficulty in displaying Interpersonal Behavior",
                    "assistive_technology": "Visual schedule apps, digital task boards"
                }
            ]
        }
    }
    """
 
    permission_classes = [IsAuthenticated]
    MAX_ATTEMPTS = 3

    def post(self, request):
        data = request.data
 
        # --- 1. Validate required fields ---
        iep_id = data.get('iep_id')
        student_name = data.get('student_name', 'The student')
        if not iep_id:
            return Response(
                {"error": "iep_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        # --- 2. Extract IEP context fields ---
        goal_area           = data.get('goal_area', '')          # e.g. "Mathematical Skills"
        teacher_prompt      = data.get('teacher_prompt', '')     # free-text teacher instructions
        accommodations      = data.get('accommodations', '')
        difficulties        = data.get('difficulties', '')
        learning_barriers   = data.get('learning_barriers', '')
        barrier_qualifiers  = data.get('barrier_qualifiers', '')
        facilitators        = data.get('learning_facilitators', '')
        fac_qualifiers      = data.get('facilitator_qualifiers', '')
        generated_details   = data.get('generatedDetails', {})
        special_factors     = generated_details.get('special_factors_considerations', [])
        special_factor_notes = data.get('special_factor_notes') or generated_details.get('specialFactorNotes', '')
 
        if not special_factors:
            return Response(
                {"error": "generatedDetails.special_factors_considerations is required and cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        # Build a shared student context string for R-GORI evaluation
        student_context = (
            f"Student: {student_name}. "
            f"Goal Area: {goal_area}. "
            f"Difficulties: {difficulties}. "
            f"Learning Barriers: {learning_barriers} ({barrier_qualifiers}). "
            f"Facilitators: {facilitators} ({fac_qualifiers}). "
            f"Accommodations: {accommodations}."
            + (f" Special Factors: {special_factor_notes}." if special_factor_notes else "")
            + (f" Teacher Instructions: {teacher_prompt}." if teacher_prompt else "")
        )
 
        # --- 3. Consolidate ALL difficulties into one single goal + table ---
        # Combine every difficulty row into one joined string so the AI sees
        # the full picture and produces a single consolidated annual goal.
        all_difficulties = " | ".join(
            f.get('difficulty', '') for f in special_factors if f.get('difficulty', '').strip()
        )
        all_assistive_tech = " | ".join(
            f.get('assistive_technology', '') for f in special_factors if f.get('assistive_technology', '').strip()
        )

        goal_payload, error = self._generate_validated_goal(
            iep_id=iep_id,
            student_name=student_name,
            difficulty=all_difficulties,
            assistive_tech=all_assistive_tech,
            accommodations=accommodations,
            facilitators=facilitators,
            student_context=student_context,
            goal_area=goal_area,
            teacher_prompt=teacher_prompt,
            special_factor_notes=special_factor_notes,
        )

        if error:
            return Response(
                {"error": "Goal generation failed.", "details": error},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            "iep_id": iep_id,
            "total_goals_generated": 1,
            "goals": [goal_payload],
            "warnings": []
        }, status=status.HTTP_200_OK)
 
 
    def _generate_validated_goal(
        self, iep_id, student_name, difficulty, assistive_tech,
        accommodations, facilitators, student_context,
        goal_area='', teacher_prompt='', special_factor_notes=''
    ):
        """
        Runs the R-GORI generation loop for a single difficulty area.
        Returns (goal_payload_dict, None) on success or (None, error_string) on failure.
        """
        best_payload = None
        best_score   = 0
        last_error   = None
 
        for attempt in range(self.MAX_ATTEMPTS):
            try:
                # --- Step A: Generate annual goal ---
                annual_goal = self._generate_annual_goal(
                    student_name, difficulty, assistive_tech, accommodations,
                    facilitators, goal_area, teacher_prompt,
                    special_factor_notes=special_factor_notes
                )
 
                # --- Step B: Validate with R-GORI ---
                evaluation   = RGORICheckerService.evaluate_goal(annual_goal, student_context)
                score        = evaluation.get('total_score', 0)
                feedback     = evaluation.get('feedback', '')
                is_compliant = evaluation.get('compliant', False)
 
                # --- Step C: Generate objective rows for this goal ---
                objective_rows = self._generate_objective_rows(
                    student_name, difficulty, assistive_tech,
                    annual_goal, facilitators, goal_area,
                    special_factor_notes=special_factor_notes
                )
 
                # Use the teacher-selected goal_area as the authoritative subject category;
                # fall back to difficulty-based mapping only when no area was chosen.
                subject_category = (
                    goal_area if goal_area
                    else self._map_difficulty_to_category(difficulty)
                )
 
                # Build the full goal payload (ready for POST /api/iep/goals/)
                payload = {
                    "iep": iep_id,
                    "subject_category": subject_category,
                    "annual_goal": annual_goal,
                    "goalName": self._derive_goal_name(difficulty, goal_area),
                    "target_metric": self._derive_target_metric(difficulty, assistive_tech),
                    "objective_rows": objective_rows,
                    # Meta info (not sent to /goals/ but useful for the frontend)
                    "_rgori_score": score,
                    "_rgori_feedback": feedback,
                    "_attempts": attempt + 1,
                }
 
                # Track best so far in case we never hit 65
                if score > best_score:
                    best_score   = score
                    best_payload = payload
 
                if is_compliant:
                    return best_payload, None
 
                time.sleep(0.5)
 
            except Exception as e:
                last_error = str(e)
                time.sleep(1)
 
        # Return best attempt even if never hit 65%
        if best_payload:
            best_payload["_rgori_warning"] = (
                f"Best score was {best_score}/100 (below 65 threshold). "
                "Manual review recommended."
            )
            return best_payload, None
 
        return None, last_error or "Generation failed after max attempts."
 
 
    def _generate_annual_goal(
        self, student_name, difficulty, assistive_tech, accommodations,
        facilitators, goal_area='', teacher_prompt='', special_factor_notes=''
    ):
        teacher_instructions = (
            f"Additional teacher instructions: {teacher_prompt}\n"
            if teacher_prompt else ""
        )
        special_factors_line = (
            f"Special Factors / Behavioral and Sensory Notes: {special_factor_notes}\n"
            if special_factor_notes else ""
        )
        goal_area_line = (
            f"PRIMARY Goal Area (this MUST be the focus of the goal): {goal_area}\n"
            if goal_area else ""
        )
        prompt = (
            f"☁️system☁️"
            f"You are an expert Special Education teacher writing IEP goals. "
            f"Write ONE specific, measurable, achievable, relevant, and time-bound (SMART) annual IEP goal. "
            f"The goal MUST directly address the PRIMARY Goal Area specified below. "
            f"Do NOT write a goal for a different domain. "
            f"Output ONLY the goal sentence. No explanations, no bullet points, no preamble."
            f"☁️/system☁️"
            f"☁️user☁️"
            f"Student: {student_name}\n"
            f"{goal_area_line}"
            f"Areas of Difficulty (all Section B rows, consolidated): {difficulty}\n"
            f"Assistive Technology Available: {assistive_tech}\n"
            f"Accommodations: {accommodations}\n"
            f"Support Personnel: {facilitators}\n"
            f"{special_factors_line}"
            f"{teacher_instructions}\n"
            f"Write the annual IEP goal for this student. It MUST target the PRIMARY Goal Area above."
            f"☁️/user☁️"
        )
        goal_text, _ = AIEngineService.generate_text(prompt, max_tokens=200)
        return goal_text.strip()
 
 
    def _generate_objective_rows(
        self, student_name, difficulty, assistive_tech, annual_goal, facilitators, goal_area='', special_factor_notes=''
    ):
        special_factors_line = (
            f"Special Factors / Behavioral and Sensory Notes: {special_factor_notes}\n"
            if special_factor_notes else ""
        )
        goal_area_instruction = (
            f"ALL objectives MUST be stepping-stone skills toward the PRIMARY Goal Area: {goal_area}. "
            f"Do NOT write objectives about communication, social behavior, or any other domain. "
            if goal_area else ""
        )
        prompt = (
            f"☁️system☁️"
            f"You are a Special Education teacher writing IEP objective rows. "
            f"Output ONLY a valid JSON array of 2-3 objective row objects. "
            f"Each object must have exactly these keys: "
            f"enroute_objectives, interventions_procedures, timeline_mins_session, "
            f"individuals_responsible, progress_instructional, remarks. "
            f"The enroute_objectives must be concrete, sequential sub-skills that build toward the annual goal — "
            f"NOT a restatement of the annual goal itself. "
            f"{goal_area_instruction}"
            f"Do not include markdown, backticks, or any text outside the JSON array."
            f"☁️/system☁️"
            f"☁️user☁️"
            f"Student: {student_name}\n"
            f"PRIMARY Goal Area: {goal_area}\n"
            f"Areas of Difficulty (all Section B rows, consolidated): {difficulty}\n"
            f"Assistive Technology: {assistive_tech}\n"
            f"Annual Goal: {annual_goal}\n"
            f"Support Personnel: {facilitators}\n"
            f"{special_factors_line}\n"
            f"Generate 2-3 enroute objective rows as a JSON array. "
            f"Each enroute_objectives entry must be a distinct, measurable sub-skill "
            f"that leads toward the annual goal above (e.g. 'Student will recognize numbers 0–5 with 80% accuracy')."
            f"☁️/user☁️"
        )
        raw = CustomLlamaService.generate_text(prompt, max_new_tokens=600)
 
        try:
            # Strip markdown fences if model adds them
            clean = raw.strip().lstrip('`').rstrip('`')
            if clean.startswith('json'):
                clean = clean[4:].strip()
            rows = json.loads(clean)
            # Ensure it's a list
            if isinstance(rows, dict):
                rows = [rows]
            return rows
        except (json.JSONDecodeError, ValueError):
            # Fallback: return one generic row so the payload is still usable
            return [{
                "enroute_objectives": f"Student will demonstrate an initial sub-skill toward: {annual_goal[:120]}",
                "interventions_procedures": f"Use {assistive_tech} and structured practice to support {goal_area or 'the goal area'}.",
                "timeline_mins_session": "15-20 minutes every day",
                "individuals_responsible": facilitators or "SNED Teacher",
                "progress_instructional": "Monitor weekly progress through teacher observation and skill checklists.",
                "remarks": "To be updated based on actual learning outcomes."
            }]
 
 
    def _map_difficulty_to_category(self, difficulty):
        """Maps a difficulty description to a subject category."""
        d = difficulty.lower()
        if any(w in d for w in ['communicat', 'speech', 'language']):
            return 'COMMUNICATION SKILLS'
        if any(w in d for w in ['interpersonal', 'social', 'behavior', 'behaviour']):
            return 'SOCIAL-EMOTIONAL SKILLS'
        if any(w in d for w in ['self-care', 'care', 'hygiene', 'daily living']):
            return 'CARE SKILLS'
        if any(w in d for w in ['math', 'number', 'count']):
            return 'Mathematics'
        if any(w in d for w in ['read', 'writing', 'literacy']):
            return 'LITERACY SKILLS'
        if any(w in d for w in ['motor', 'physical', 'movement']):
            return 'MOTOR SKILLS'
        return 'FUNCTIONAL SKILLS'
 
 
    def _derive_goal_name(self, difficulty, goal_area=''):
        """Derives a short goal name — prefers the teacher-selected goal_area."""
        if goal_area:
            return goal_area  # e.g. "Mathematical Skills", "Care Skills"
        d = difficulty.lower()
        if 'communicat' in d or 'speech' in d:
            return 'Communication Development'
        if 'interpersonal' in d or 'social' in d or 'behavior' in d:
            return 'Social-Behavioral Development'
        if 'self-care' in d or 'hygiene' in d:
            return 'Daily Self-Care Mastery'
        if 'math' in d or 'number' in d:
            return 'Number Sense and Math Skills'
        if 'read' in d or 'writing' in d:
            return 'Literacy Development'
        if 'motor' in d:
            return 'Motor Skills Development'
        return f'{difficulty[:40]} Goal'
 
 
    def _derive_target_metric(self, difficulty, assistive_tech):
        """Derives a target metric string."""
        if assistive_tech:
            return f"Demonstrate improvement in {difficulty} using {assistive_tech[:60]}"
        return f"Demonstrate measurable improvement in {difficulty}"