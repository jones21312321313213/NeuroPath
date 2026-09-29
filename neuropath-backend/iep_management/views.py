from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics,viewsets
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import IEPDataSerializer, IEPListDetailSerializer, IEPUpdateSerializer,StandaloneIEPGoalSerializer,IEPGenerationRequestSerializer
from users.models import StudentProfile
from users.utils import get_teacher_for_user
from tracking.models import AIGenerationLog, StudentProgress
from .models import Assessment, IEPGoal, IEPModel,GeneratedAIInsight
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from .services import AIGenerationService
from .ai_engine import AIEngineService
from .rgori_service import RGORICheckerService
from .privacy_utils import (
    anonymize_student_context,
    scrub_pii_from_text,
    verify_ra10173_consent,
    ConsentRequiredException,
)
import time
import json
import re

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

                            # Auto-seed initial baseline StudentProgress data points
                            raw_difficulties = []
                            if iep_instance.difficulties:
                                for line in iep_instance.difficulties.splitlines():
                                    for item in line.split(','):
                                        d_str = item.strip()
                                        if d_str:
                                            raw_difficulties.append(d_str)
                            if isinstance(iep_instance.generatedDetails, dict) and 'barrierRows' in iep_instance.generatedDetails:
                                for r in iep_instance.generatedDetails['barrierRows']:
                                    if isinstance(r, dict) and r.get('difficulty'):
                                        d_str = str(r['difficulty']).strip()
                                        if d_str:
                                            raw_difficulties.append(d_str)

                            student_obj = iep_instance.studentID
                            if not raw_difficulties and student_obj and student_obj.profileDetails:
                                markers = student_obj.profileDetails.get('difficultyMarkers', [])
                                raw_difficulties.extend([str(m).strip() for m in markers if str(m).strip()])

                            if not raw_difficulties:
                                raw_difficulties = ['General']

                            seen_domains = set()
                            for domain in raw_difficulties:
                                norm = domain.strip()
                                if norm and norm.lower() not in seen_domains:
                                    seen_domains.add(norm.lower())
                                    StudentProgress.objects.get_or_create(
                                        student=student_obj,
                                        subjectName=norm,
                                        defaults={'performanceScore': 40}
                                    )

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
        iep = serializer.save()
        student = iep.studentID
        if student:
            raw_difficulties = []
            if iep.difficulties:
                raw_difficulties.extend([d.strip() for d in iep.difficulties.splitlines() if d.strip()])
            if isinstance(iep.generatedDetails, dict) and 'barrierRows' in iep.generatedDetails:
                for r in iep.generatedDetails['barrierRows']:
                    if isinstance(r, dict) and r.get('difficulty'):
                        d_str = str(r['difficulty']).strip()
                        if d_str:
                            raw_difficulties.append(d_str)

            if raw_difficulties:
                seen = set()
                updated_markers = []
                for item in raw_difficulties:
                    key = item.strip().lower()
                    if key and key not in seen:
                        seen.add(key)
                        updated_markers.append(item.strip())

                if updated_markers:
                    profile_details = student.profileDetails if isinstance(student.profileDetails, dict) else {}
                    profile_details['difficultyMarkers'] = updated_markers
                    student.profileDetails = profile_details
                    try:
                        import json
                        existing_prefs = json.loads(student.preferences) if student.preferences else {}
                        if not isinstance(existing_prefs, dict):
                            existing_prefs = {}
                    except Exception:
                        existing_prefs = {}
                    existing_prefs['difficultyMarkers'] = updated_markers
                    student.preferences = json.dumps(existing_prefs)
                    student.save(update_fields=['profileDetails', 'preferences'])


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
            except (StudentProfile.DoesNotExist, ValueError):
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
            target_iep = IEPModel.objects.filter(iepID=iep_id, studentID__teacher=teacher).first()
            if target_iep:
                from resources.views import _sync_goals_from_generated_details
                _sync_goals_from_generated_details(target_iep)
                return IEPGoal.objects.filter(iep=target_iep).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')
            return IEPGoal.objects.none()

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
    teacher = get_teacher_for_user(request.user)
    if not teacher or student.teacher != teacher:
        return Response(
            {"detail": "Not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    try:
        # Pass both the student and the logged-in teacher to the service
        insight = AIGenerationService.generate_and_save_summary(student, teacher)
        
        return Response({
            "id": insight.id,
            "summary_text": insight.summary_text,
            "created_at": insight.created_at
        }, status=status.HTTP_201_CREATED)
        
    except ConsentRequiredException as e:
        return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if ("AI Generation failed" in str(e) or "temporarily unavailable" in str(e) or "503" in str(e))
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        return Response({"error": str(e)}, status=status_code)

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
        studentID__teacher=teacher,
        is_archived=False
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
        pii_tokens = [data.get('student_name', '')]
        scrubbed_barriers = scrub_pii_from_text(data.get('baseline_barriers', ''), pii_tokens)
        student_context = f"Learner, Diagnosis: {data['diagnosis']}, Barriers: {scrubbed_barriers}"
        generation_prompt = (
            f"Write a specific, measurable IEP goal following ABCD criteria "
            f"(Actor: learner; Behavior: observable skill with targeted brackets; "
            f"Condition: environmental prompt level; Degree: measurable threshold) "
            f"targeting {data['target_domain']} for {student_context}."
        )
        
        # 2. Setup the Generation & R-GORI Loop variables
        max_attempts = 3
        best_goal = ""
        best_score = -1
        final_feedback = ""
        last_error = None

        # 3. The Validation Loop
        for attempt in range(max_attempts):
            try:
                # Step A: Draft the goal
                draft_goal, _ = AIEngineService.generate_text(generation_prompt, max_tokens=250)
                
                # Step B: Audit the goal using R-GORI
                evaluation = RGORICheckerService.evaluate_goal(draft_goal, student_context)
                current_score = evaluation.get('total_score', 0)
                
                # Track the best performing goal in case we never hit 65%
                if not best_goal or current_score > best_score:
                    best_score = current_score
                    best_goal = draft_goal
                    final_feedback = evaluation.get('feedback', '')
                
                # Step C: Break the loop if compliant!
                if evaluation.get('compliant') is True:
                    break
                    
            except Exception as e:
                last_error = str(e)
                if best_goal:
                    break
                time.sleep(0.5)

        if not best_goal:
            return Response(
                {"error": "AI generation service is temporarily unavailable. Please try again shortly.", "details": last_error},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # 4. Send the final, audited result back to React
        return Response({
            "generated_goal": best_goal,
            "rgori_score": max(0, best_score),
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
        if not iep_id:
            return Response(
                {"error": "iep_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            iep = IEPModel.objects.select_related('studentID__teacher').get(pk=iep_id)
        except IEPModel.DoesNotExist:
            return Response({"error": "IEP not found."}, status=status.HTTP_404_NOT_FOUND)

        teacher = get_teacher_for_user(request.user)
        if not teacher or iep.studentID.teacher != teacher:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce RA 10173 Parental/Guardian Consent
        try:
            verify_ra10173_consent(iep.studentID)
        except ConsentRequiredException as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
 
        # --- 2. Extract IEP context fields ---
        goal_area           = data.get('goal_area', '')          # e.g. "Mathematical Skills"
        accommodations      = data.get('accommodations', '')
        difficulties        = data.get('difficulties', '')
        learning_barriers   = data.get('learning_barriers', '')
        barrier_qualifiers  = data.get('barrier_qualifiers', '')
        facilitators        = data.get('learning_facilitators', '')
        fac_qualifiers      = data.get('facilitator_qualifiers', '')
        generated_details   = data.get('generatedDetails', {})
        special_factors     = generated_details.get('special_factors_considerations', [])
        
        # Anonymize student descriptor and scrub PII from free-text notes
        student_desc = anonymize_student_context(iep.studentID)
        pii_tokens = [
            getattr(iep.studentID, 'name', ''),
            getattr(iep.studentID, 'guardian_name', ''),
            data.get('student_name', '')
        ]
        special_factor_notes = scrub_pii_from_text(
            data.get('special_factor_notes') or generated_details.get('specialFactorNotes', ''),
            pii_tokens
        )
        teacher_prompt = scrub_pii_from_text(data.get('teacher_prompt', ''), pii_tokens)
 
        if not special_factors:
            return Response(
                {"error": "generatedDetails.special_factors_considerations is required and cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        # Build a shared student context string for R-GORI evaluation
        student_context = (
            f"Student: {student_desc}. "
            f"Goal Area: {goal_area}. "
            f"Difficulties: {difficulties}. "
            f"Learning Barriers: {learning_barriers} ({barrier_qualifiers}). "
            f"Facilitators: {facilitators} ({fac_qualifiers}). "
            f"Accommodations: {accommodations}."
            + (f" Special Factors: {special_factor_notes}." if special_factor_notes else "")
            + (f" Teacher Instructions: {teacher_prompt}." if teacher_prompt else "")
        )
 
        # --- 3. Consolidate ALL difficulties into one single goal + table ---
        all_difficulties = " | ".join(
            f.get('difficulty', '') for f in special_factors if f.get('difficulty', '').strip()
        )
        all_assistive_tech = " | ".join(
            f.get('assistive_technology', '') for f in special_factors if f.get('assistive_technology', '').strip()
        )

        goal_payload, error = self._generate_validated_goal(
            iep_id=iep_id,
            student_name=student_desc,
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
                {"error": "AI generation service is temporarily unavailable. Please try again shortly.", "details": error},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
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
        best_score   = -1
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
 
                # Track best so far
                if best_payload is None or score > best_score:
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
            if not best_payload.get('_rgori_score', 0) >= 65:
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
            f"The goal MUST follow the ABCD criteria:\n"
            f"- Actor: The individual learner (refer to the student by name or 'the learner').\n"
            f"- Behavior: Specific, observable skill with targeted brackets (e.g., 'count and identify numbers 5–10', 'sort classroom objects into 3 categories').\n"
            f"- Condition: Environmental prompt level and context (e.g., 'given visual counters and physical prompts', 'in a structured classroom setting').\n"
            f"- Degree: Measurable criteria/threshold (e.g., 'with 80% accuracy in 4 out of 5 consecutive trials across 2 consecutive weeks').\n"
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
            f"Write the annual IEP goal for this student following the ABCD criteria with targeted skill brackets and targeting the PRIMARY Goal Area above."
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
        system_prompt = (
            "You are an expert Special Education teacher writing IEP objective rows for a 3-month quarterly term. "
            "Output ONLY a valid JSON array of 2-3 objective row objects. "
            "Each object must have exactly these keys: "
            "enroute_objectives, month_1_target, month_2_target, month_3_target, "
            "interventions_procedures, timeline_mins_session, "
            "individuals_responsible, progress_instructional, remarks. "
            "The enroute_objectives must be concrete, sequential sub-skills following ABCD criteria with targeted skill brackets (e.g. counting 5-10). "
            "Milestones must map incremental progression across the 3-month quarter:\n"
            "- month_1_target: 1st Month milestone (baseline skill acquisition with direct prompts/cues and initial bracket, e.g., 'Given visual counters and direct physical prompts, the learner will count numbers 1-3 with 70% accuracy').\n"
            "- month_2_target: 2nd Month milestone (intermediate skill progression with faded prompts/cues and expanded bracket, e.g., 'Given visual counters and faded verbal cues, the learner will count numbers 1-5 with 75% accuracy').\n"
            "- month_3_target: 3rd Month milestone (independent mastery with target bracket, e.g., 'Given visual counters, the learner will independently count and identify numbers 5-10 with 80% accuracy in 4 of 5 trials').\n"
            f"{goal_area_instruction}"
            "Do not include markdown, backticks, or any text outside the JSON array."
        )
        user_prompt = (
            f"Student: {student_name}\n"
            f"PRIMARY Goal Area: {goal_area}\n"
            f"Areas of Difficulty (all Section B rows, consolidated): {difficulty}\n"
            f"Assistive Technology: {assistive_tech}\n"
            f"Annual Goal: {annual_goal}\n"
            f"Support Personnel: {facilitators}\n"
            f"{special_factors_line}\n"
            f"Generate 2-3 enroute objective rows as a JSON array following ABCD criteria and 3-month quarterly progression. "
            f"Each row must specify targeted skill brackets in enroute_objectives and progression across month_1_target, month_2_target, and month_3_target."
        )
        raw, _ = AIEngineService.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=1000,
            json_mode=True,
        )

        if not raw or not isinstance(raw, str):
            raise RuntimeError("AI generation service returned empty or invalid response for objective rows.")

        try:
            clean = raw.strip()
            if "```" in clean:
                clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
                clean = re.sub(r"\s*```$", "", clean)
                clean = clean.strip()

            match = re.search(r"\[.*\]|\{.*\}", clean, re.DOTALL)
            if match:
                clean = match.group(0)

            parsed = json.loads(clean)
            if isinstance(parsed, dict):
                for k in ["objective_rows", "objectives", "rows"]:
                    if k in parsed and isinstance(parsed[k], list):
                        parsed = parsed[k]
                        break
                else:
                    parsed = [parsed]

            if isinstance(parsed, list) and len(parsed) > 0:
                validated_rows = []
                for row in parsed:
                    if isinstance(row, dict) and (row.get("enroute_objectives") or row.get("objective")):
                        obj_text = str(row.get("enroute_objectives") or row.get("objective", "")).strip()
                        m1_text = str(
                            row.get("month_1_target") or row.get("month_1") or row.get("month1") or row.get("first_month") or ""
                        ).strip()
                        m2_text = str(
                            row.get("month_2_target") or row.get("month_2") or row.get("month2") or row.get("second_month") or ""
                        ).strip()
                        m3_text = str(
                            row.get("month_3_target") or row.get("month_3") or row.get("month3") or row.get("third_month") or ""
                        ).strip()

                        # Smart ABCD progression defaults if not supplied
                        if not m1_text:
                            m1_text = f"Month 1: Initial acquisition with direct physical/visual prompts (baseline bracket)."
                        if not m2_text:
                            m2_text = f"Month 2: Progressive execution with faded prompts (intermediate bracket)."
                        if not m3_text:
                            m3_text = f"Month 3: Independent mastery with 80% accuracy across consecutive trials."

                        int_text = str(row.get("interventions_procedures") or row.get("interventions") or row.get("intervention", f"Use {assistive_tech or 'visual supports'}")).strip()
                        time_text = str(row.get("timeline_mins_session") or row.get("timeline", "15-20 minutes every day")).strip()
                        resp_text = str(row.get("individuals_responsible") or row.get("responsible", facilitators or "SNED Teacher")).strip()
                        prog_text = str(row.get("progress_instructional") or row.get("progress", "Weekly skill mastery checklist.")).strip()
                        rem_text = str(row.get("remarks", "Targeted for ongoing observation.")).strip()
                        validated_rows.append({
                            "enroute_objectives": obj_text,
                            "objective": obj_text,
                            "month_1_target": m1_text,
                            "month_1": m1_text,
                            "month1": m1_text,
                            "month_2_target": m2_text,
                            "month_2": m2_text,
                            "month2": m2_text,
                            "month_3_target": m3_text,
                            "month_3": m3_text,
                            "month3": m3_text,
                            "interventions_procedures": int_text,
                            "interventions": int_text,
                            "intervention": int_text,
                            "timeline_mins_session": time_text,
                            "timeline": time_text,
                            "individuals_responsible": resp_text,
                            "progress_instructional": prog_text,
                            "remarks": rem_text,
                        })
                if validated_rows:
                    return validated_rows

            raise RuntimeError("AI generation service could not generate valid objective rows. Please try again.")
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise
            raise RuntimeError(f"AI generation service could not parse objective rows: {e}")
 
 
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


# =====================================================================
# SDD COMPONENT: IEPBinaryReportRenderEngine
# Description: Generates standard PDF byte stream for local client-side download
#              of an IEP document using ReportLab.
# =====================================================================
class IEPBinaryReportRenderEngine:
    @staticmethod
    def generate_iep_pdf_stream(iep):
        import html
        import io
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        def esc(val):
            if val is None:
                return ""
            return html.escape(str(val))

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
        )

        styles = getSampleStyleSheet()

        style_title = ParagraphStyle(
            'DocTitle',
            parent=styles['Title'],
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=3,
        )
        style_subtitle = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            alignment=TA_CENTER,
            fontName='Helvetica',
            textColor=colors.HexColor('#475569'),
            spaceAfter=8,
        )
        style_section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            leading=15,
            textColor=colors.HexColor('#0284C7'),
            spaceBefore=8,
            spaceAfter=4,
        )
        style_cell_label = ParagraphStyle(
            'CellLabel',
            parent=styles['Normal'],
            fontSize=8.5,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#334155'),
            leading=12,
        )
        style_cell_value = ParagraphStyle(
            'CellValue',
            parent=styles['Normal'],
            fontSize=8.5,
            fontName='Helvetica',
            textColor=colors.HexColor('#0F172A'),
            leading=12,
        )
        style_body = ParagraphStyle(
            'DocBody',
            parent=styles['Normal'],
            fontSize=8.5,
            fontName='Helvetica',
            textColor=colors.HexColor('#334155'),
            leading=13,
        )
        style_label_inline = ParagraphStyle(
            'DocLabelInline',
            parent=styles['Normal'],
            fontSize=8.5,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0F172A'),
            leading=13,
            spaceBefore=3,
        )

        story = []

        # Header
        story.append(Paragraph("Individualized Education Plan (IEP)", style_title))
        status_text = "Archived" if iep.is_archived else "Active"
        story.append(Paragraph(f"DepEd Special Education Program — Version {iep.version} ({status_text})", style_subtitle))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=8))

        # Student Information Grid (Section A)
        student = iep.studentID
        pd = student.profileDetails if isinstance(student.profileDetails, dict) else {}
        student_name = student.name or pd.get('studentName') or 'N/A'
        school_val = pd.get('school') or 'N/A'
        school_year_val = pd.get('schoolYear') or 'N/A'
        diagnosis_val = student.diagnosis or pd.get('disabilityCategory') or 'N/A'
        created_str = iep.createdDate.strftime('%B %d, %Y') if iep.createdDate else 'N/A'

        info_data = [
            [
                Paragraph("Student Name:", style_cell_label),
                Paragraph(esc(student_name), style_cell_value),
                Paragraph("IEP Version:", style_cell_label),
                Paragraph(esc(f"Version {iep.version}"), style_cell_value),
            ],
            [
                Paragraph("Age / Grade:", style_cell_label),
                Paragraph(esc(f"{student.age} yrs / Grade {student.grade}"), style_cell_value),
                Paragraph("Program Type:", style_cell_label),
                Paragraph(esc(iep.program_type or 'Graded'), style_cell_value),
            ],
            [
                Paragraph("School:", style_cell_label),
                Paragraph(esc(school_val), style_cell_value),
                Paragraph("School Year:", style_cell_label),
                Paragraph(esc(school_year_val), style_cell_value),
            ],
            [
                Paragraph("Diagnosis:", style_cell_label),
                Paragraph(esc(diagnosis_val), style_cell_value),
                Paragraph("Date Created:", style_cell_label),
                Paragraph(esc(created_str), style_cell_value),
            ],
        ]

        info_table = Table(info_data, colWidths=[30 * mm, 60 * mm, 30 * mm, 60 * mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 4 * mm))

        # Section A: Present Levels Summary
        story.append(Paragraph("Section A: Learner Profile & Present Levels", style_section_heading))
        present_eval = pd.get('presentEvaluation') or student.assessmentResult or "No formal assessment results recorded."
        strengths = pd.get('academicStrengths') or "No academic strengths recorded."
        needs = pd.get('academicNeeds') or student.support_needs or "No academic needs recorded."
        story.append(Paragraph(f"<b>Assessment & Evaluation:</b> {esc(present_eval)}", style_body))
        story.append(Paragraph(f"<b>Strengths:</b> {esc(strengths)}", style_body))
        story.append(Paragraph(f"<b>Needs:</b> {esc(needs)}", style_body))
        story.append(Spacer(1, 4 * mm))

        # Section B: Special Factors & Barriers
        story.append(Paragraph("Section B: Difficulties, Environmental Barriers, and Accommodations", style_section_heading))
        diff_list = [d.strip() for d in (iep.difficulties or '').split('\n') if d.strip()]
        barr_list = [b.strip() for b in (iep.learning_barriers or '').split('\n') if b.strip()]
        facil_list = [f.strip() for f in (iep.learning_facilitators or '').split('\n') if f.strip()]
        accom_list = [a.strip() for a in (iep.learning_accommodations or '').split('\n') if a.strip()]
        max_len = max(len(diff_list), len(barr_list), len(facil_list), len(accom_list), 0)

        if max_len > 0:
            sec_b_data = [[
                Paragraph("Area of Difficulty", style_cell_label),
                Paragraph("Learning Barriers", style_cell_label),
                Paragraph("Learning Facilitators", style_cell_label),
                Paragraph("Accommodations", style_cell_label),
            ]]
            for i in range(max_len):
                sec_b_data.append([
                    Paragraph(esc(diff_list[i] if i < len(diff_list) else '—'), style_cell_value),
                    Paragraph(esc(barr_list[i] if i < len(barr_list) else '—'), style_cell_value),
                    Paragraph(esc(facil_list[i] if i < len(facil_list) else '—'), style_cell_value),
                    Paragraph(esc(accom_list[i] if i < len(accom_list) else '—'), style_cell_value),
                ])
            b_table = Table(sec_b_data, colWidths=[42 * mm, 46 * mm, 46 * mm, 46 * mm])
            b_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(b_table)
        else:
            story.append(Paragraph("No Section B factors recorded.", style_body))

        # Special factor notes
        details = iep.generatedDetails if isinstance(iep.generatedDetails, dict) else {}
        special_notes = details.get('specialFactorNotes') or details.get('special_factor_notes') or ''
        if special_notes:
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph(f"<b>Special Factor Notes / Assistive Devices:</b> {esc(special_notes)}", style_body))

        story.append(Spacer(1, 4 * mm))

        # Section C: Annual Goals & Objectives
        story.append(Paragraph("Section C: Annual Goals and Short-Term Objectives", style_section_heading))
        goals = iep.individual_goals.all() if hasattr(iep, 'individual_goals') else []
        if goals.exists():
            for g in goals:
                cat_name = g.subject_category or g.goalName or 'Goal Area'
                annual_desc = g.annual_goal or g.target_metric or ''
                story.append(Paragraph(f"<b>{esc(cat_name)}:</b> {esc(annual_desc)}", style_label_inline))
                rows = g.objective_rows.all() if hasattr(g, 'objective_rows') else []
                if rows.exists():
                    g_data = [[
                        Paragraph("Objective", style_cell_label),
                        Paragraph("Month 1 Milestone (1st Month)", style_cell_label),
                        Paragraph("Month 2 Milestone (2nd Month)", style_cell_label),
                        Paragraph("Month 3 Milestone (3rd Month)", style_cell_label),
                        Paragraph("Interventions", style_cell_label),
                        Paragraph("Timeline", style_cell_label),
                        Paragraph("Responsible", style_cell_label),
                        Paragraph("Evaluation", style_cell_label),
                    ]]
                    for r in rows:
                        g_data.append([
                            Paragraph(esc(r.enroute_objectives or '—'), style_cell_value),
                            Paragraph(esc(r.month_1_target or '—'), style_cell_value),
                            Paragraph(esc(r.month_2_target or '—'), style_cell_value),
                            Paragraph(esc(r.month_3_target or '—'), style_cell_value),
                            Paragraph(esc(r.interventions_procedures or '—'), style_cell_value),
                            Paragraph(esc(r.timeline_mins_session or '—'), style_cell_value),
                            Paragraph(esc(r.individuals_responsible or '—'), style_cell_value),
                            Paragraph(esc(r.progress_instructional or '—'), style_cell_value),
                        ])
                    g_table = Table(g_data, colWidths=[28 * mm, 22 * mm, 22 * mm, 22 * mm, 26 * mm, 18 * mm, 20 * mm, 22 * mm])
                    g_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ('LEFTPADDING', (0, 0), (-1, -1), 3),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ]))
                    story.append(g_table)
                    story.append(Spacer(1, 2 * mm))
        else:
            story.append(Paragraph("No learner goals recorded for this IEP.", style_body))

        doc.build(story)
        buffer.seek(0)
        return buffer


class IEPExportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Teacher profile not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            iep = IEPModel.objects.get(pk=pk, studentID__teacher=teacher)
        except IEPModel.DoesNotExist:
            return Response({"error": "IEP document not found."}, status=status.HTTP_404_NOT_FOUND)

        pdf_stream = IEPBinaryReportRenderEngine.generate_iep_pdf_stream(iep)
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        clean_name = re.sub(r'\s+', '_', iep.studentID.name or 'Student')
        response['Content-Disposition'] = f'attachment; filename="IEP_{clean_name}_v{iep.version}.pdf"'
        return response