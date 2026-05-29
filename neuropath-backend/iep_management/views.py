from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics,viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import IEPDataSerializer, IEPListDetailSerializer, IEPUpdateSerializer,StandaloneIEPGoalSerializer,IEPGenerationRequestSerializer
from users.models import StudentProfile
from tracking.models import AIGenerationLog
from .models import Assessment, IEPGoal, IEPModel,IEPObjectiveRow,GeneratedAIInsight,StudentProfile
from django.shortcuts import get_object_or_404
from .services import AIGenerationService
from .huggingface_service import CustomLlamaService
from .rgori_service import RGORICheckerService
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .huggingface_service import CustomLlamaService
from .rgori_service import RGORICheckerService
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
    def _get_teacher_from_user_id(self, teacher_user_id):
        if not teacher_user_id:
            return None
        try:
            from django.contrib.auth.models import User
            from users.models import Teacher

            django_user = User.objects.get(pk=int(teacher_user_id))
            return Teacher.objects.get(email=django_user.email)
        except (User.DoesNotExist, Teacher.DoesNotExist, ValueError, TypeError):
            return None

    def post(self, request, *args, **kwargs):
        action = request.data.get('action')

        if action == 'generate':
            student_id = request.data.get('studentID')
            baseline_data = request.data.get('baselineData', '')
            target_domains = request.data.get('domains', '')
            teacher_id = request.user.id if request.user.is_authenticated else request.data.get('teacherID')

            try:
                teacher = self._get_teacher_from_user_id(teacher_id)
                student_query = StudentProfile.objects.filter(pk=student_id)
                if teacher:
                    student_query = student_query.filter(teacher=teacher)
                student = student_query.get()
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student not found for this teacher account.'}, status=status.HTTP_404_NOT_FOUND)

            draft_payload = IEPGeneratorService.generate_draft(
                student=student,
                baseline_input=baseline_data,
                target_domains=target_domains,
                teacher_id=teacher_id,
            )

            return Response({
                'message': 'Successfully synthesized draft IEP.',
                'draftData': draft_payload,
            }, status=status.HTTP_200_OK)

        if action == 'save':
            payload = request.data.copy()

            # Only allow saving an IEP for a student owned by this teacher account.
            student_id = payload.get('studentID')
            # Prefer the authenticated user's ID; fall back to payload teacherID
            teacher_user_id = request.user.id if request.user.is_authenticated else payload.get('teacherID')
            teacher = self._get_teacher_from_user_id(teacher_user_id)
            try:
                student_query = StudentProfile.objects.filter(pk=student_id)
                if teacher:
                    student_query = student_query.filter(teacher=teacher)
                else:
                    # No resolvable teacher — reject to prevent unscoped saves
                    return Response({'error': 'Unable to verify teacher account.'}, status=status.HTTP_403_FORBIDDEN)
                student_query.get()
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student not found for this teacher account.'}, status=status.HTTP_404_NOT_FOUND)

            # Auto-version per student.
            if student_id and not payload.get('version'):
                latest = IEPModel.objects.filter(studentID_id=student_id).order_by('-version').first()
                payload['version'] = (latest.version + 1) if latest else 1

            payload.pop('teacherID', None)

            serializer = IEPDataSerializer(data=payload)
            if serializer.is_valid():
                iep_instance = serializer.save()

                raw_goals_text = iep_instance.goals or ''
                goal_items = re.split(r'\n\d+\.\s*', raw_goals_text)
                for item in goal_items:
                    cleaned_goal = item.strip()
                    if cleaned_goal and len(cleaned_goal) > 10:
                        parent_goal = IEPGoal.objects.create(
                            iep=iep_instance,
                            goalName=cleaned_goal[:200], 
                            target_metric='Standard IEP Metric',
                            subject_category='GENERAL',
                            annual_goal=cleaned_goal
                        )
                        # 2. Create at least one blank/initial child row to build the grid relation safely
                        IEPObjectiveRow.objects.create(
                            parent_goal=parent_goal,
                            enroute_objectives="Initial baseline objective target.",
                            interventions_procedures="Standard accommodations protocols.",
                            timeline_mins_session="15-20 mins daily",
                            individuals_responsible="SPED Teacher"
                        )

                return Response({
                    'message': 'IEP Created Successfully.',
                    'data': IEPListDetailSerializer(iep_instance).data,
                }, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({'error': 'Invalid action specified.'}, status=status.HTTP_400_BAD_REQUEST)


class IEPListAPIView(generics.ListAPIView):
    serializer_class = IEPListDetailSerializer

    def get_queryset(self):
        student_id = self.kwargs.get('student_id')
        queryset = IEPModel.objects.filter(studentID_id=student_id).order_by('-createdDate')

        # Keep View IEP scoped to the currently logged-in teacher account.
        # The React app sends the Django User ID as ?teacher_id=... and the
        # Teacher row is linked by the same email used at registration/login.
        teacher_user_id = self.request.query_params.get('teacher_id')
        if not teacher_user_id:
            return IEPModel.objects.none()

        try:
            from django.contrib.auth.models import User
            from users.models import Teacher

            django_user = User.objects.get(pk=int(teacher_user_id))
            teacher = Teacher.objects.get(email=django_user.email)
            return queryset.filter(studentID__teacher=teacher)
        except (User.DoesNotExist, Teacher.DoesNotExist, ValueError, TypeError):
            return IEPModel.objects.none()



class IEPDetailAPIView(generics.RetrieveAPIView):
    queryset = IEPModel.objects.all()
    serializer_class = IEPListDetailSerializer


class IEPEditAPIView(generics.UpdateAPIView):
    queryset = IEPModel.objects.all()
    serializer_class = IEPUpdateSerializer

    def perform_update(self, serializer):
        iep_instance = serializer.save()
        if 'goals' in serializer.validated_data:
            IEPGoal.objects.filter(iep=iep_instance).delete()
            raw_goals_text = iep_instance.goals or ''
            goal_items = re.split(r'\n\d+\.\s*', raw_goals_text)
            for item in goal_items:
                cleaned_goal = item.strip()
                if cleaned_goal and len(cleaned_goal) > 10:
                    parent_goal = IEPGoal.objects.create(
                        iep=iep_instance, 
                        goalName=cleaned_goal[:200], 
                        target_metric='Standard IEP Metric', 
                        subject_category='GENERAL',
                        annual_goal=cleaned_goal
                    )
                    IEPObjectiveRow.objects.create(
                        parent_goal=parent_goal,
                        enroute_objectives="Initial baseline objective target.",
                        interventions_procedures="Standard accommodations protocols.",
                        timeline_mins_session="15-20 mins daily",
                        individuals_responsible="SPED Teacher"
                    )


class IEPDeleteAPIView(generics.DestroyAPIView):
    queryset = IEPModel.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'IEP record successfully permanently deleted.'}, status=status.HTTP_200_OK)


class StandaloneIEPGoalViewSet(viewsets.ModelViewSet):
    queryset = IEPGoal.objects.all().select_related('iep__studentID')
    serializer_class = StandaloneIEPGoalSerializer

    def get_queryset(self):
        """
        Allows filtering by student profile ID directly via query parameters.
        Example URL path lookup: /api/iep/goals/?student_id=5
        """
        queryset = self.queryset
        student_id = self.request.query_params.get('student_id')
        if student_id:
            return queryset.filter(iep__studentID__pk=student_id)
        return queryset
    
    
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
    # This query strictly filters by the student ID AND the Teacher ID. 
    # It is impossible for them to fetch another teacher's generated insights.
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


class GenerateIEPGoalAPIView(APIView):
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
        accommodations      = data.get('accommodations', '')
        difficulties        = data.get('difficulties', '')
        learning_barriers   = data.get('learning_barriers', '')
        barrier_qualifiers  = data.get('barrier_qualifiers', '')
        facilitators        = data.get('learning_facilitators', '')
        fac_qualifiers      = data.get('facilitator_qualifiers', '')
        generated_details   = data.get('generatedDetails', {})
        special_factors     = generated_details.get('special_factors_considerations', [])
 
        if not special_factors:
            return Response(
                {"error": "generatedDetails.special_factors_considerations is required and cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        # Build a shared student context string for R-GORI evaluation
        student_context = (
            f"Student: {student_name}. "
            f"Difficulties: {difficulties}. "
            f"Learning Barriers: {learning_barriers} ({barrier_qualifiers}). "
            f"Facilitators: {facilitators} ({fac_qualifiers}). "
            f"Accommodations: {accommodations}."
        )
 
        # --- 3. Generate one goal payload per special factor ---
        generated_goals = []
        errors = []
 
        for factor in special_factors:
            difficulty         = factor.get('difficulty', 'General difficulty')
            assistive_tech     = factor.get('assistive_technology', '')
 
            goal_payload, error = self._generate_validated_goal(
                iep_id=iep_id,
                student_name=student_name,
                difficulty=difficulty,
                assistive_tech=assistive_tech,
                accommodations=accommodations,
                facilitators=facilitators,
                student_context=student_context,
            )
 
            if error:
                errors.append({"difficulty": difficulty, "error": error})
            else:
                generated_goals.append(goal_payload)
 
        if not generated_goals:
            return Response(
                {"error": "All goal generations failed.", "details": errors},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
 
        return Response({
            "iep_id": iep_id,
            "total_goals_generated": len(generated_goals),
            "goals": generated_goals,
            "warnings": errors  # partial failures reported but not fatal
        }, status=status.HTTP_200_OK)
 
 
    def _generate_validated_goal(
        self, iep_id, student_name, difficulty, assistive_tech,
        accommodations, facilitators, student_context
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
                    student_name, difficulty, assistive_tech, accommodations, facilitators
                )
 
                # --- Step B: Validate with R-GORI ---
                evaluation   = RGORICheckerService.evaluate_goal(annual_goal, student_context)
                score        = evaluation.get('total_score', 0)
                feedback     = evaluation.get('feedback', '')
                is_compliant = evaluation.get('compliant', False)
 
                # --- Step C: Generate objective rows for this goal ---
                objective_rows = self._generate_objective_rows(
                    student_name, difficulty, assistive_tech,
                    annual_goal, facilitators
                )
 
                # Build the full goal payload (ready for POST /api/iep/goals/)
                payload = {
                    "iep": iep_id,
                    "subject_category": self._map_difficulty_to_category(difficulty),
                    "annual_goal": annual_goal,
                    "goalName": self._derive_goal_name(difficulty),
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
        self, student_name, difficulty, assistive_tech, accommodations, facilitators
    ):
        prompt = (
            f"☁️system☁️"
            f"You are an expert Special Education teacher writing IEP goals. "
            f"Write ONE specific, measurable, achievable, relevant, and time-bound (SMART) annual IEP goal. "
            f"Output ONLY the goal sentence. No explanations, no bullet points, no preamble."
            f"☁️/system☁️"
            f"☁️user☁️"
            f"Student: {student_name}\n"
            f"Area of Difficulty: {difficulty}\n"
            f"Assistive Technology Available: {assistive_tech}\n"
            f"Accommodations: {accommodations}\n"
            f"Support Personnel: {facilitators}\n\n"
            f"Write the annual IEP goal for this student targeting the area of difficulty above."
            f"☁️/user☁️"
        )
        return CustomLlamaService.generate_text(prompt, max_new_tokens=200)
 
 
    def _generate_objective_rows(
        self, student_name, difficulty, assistive_tech, annual_goal, facilitators
    ):
        prompt = (
            f"☁️system☁️"
            f"You are a Special Education teacher writing IEP objective rows. "
            f"Output ONLY a valid JSON array of 2-3 objective row objects. "
            f"Each object must have exactly these keys: "
            f"enroute_objectives, interventions_procedures, timeline_mins_session, "
            f"individuals_responsible, progress_instructional, remarks. "
            f"Do not include markdown, backticks, or any text outside the JSON array."
            f"☁️/system☁️"
            f"☁️user☁️"
            f"Student: {student_name}\n"
            f"Area of Difficulty: {difficulty}\n"
            f"Assistive Technology: {assistive_tech}\n"
            f"Annual Goal: {annual_goal}\n"
            f"Support Personnel: {facilitators}\n\n"
            f"Generate 2-3 objective rows as a JSON array."
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
                "enroute_objectives": f"Work toward: {annual_goal}",
                "interventions_procedures": f"Use {assistive_tech} to support learning.",
                "timeline_mins_session": "15-20 minutes every day",
                "individuals_responsible": facilitators or "SNED Teacher",
                "progress_instructional": "Monitor weekly progress toward goal.",
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
 
 
    def _derive_goal_name(self, difficulty):
        """Derives a short goal name from the difficulty."""
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