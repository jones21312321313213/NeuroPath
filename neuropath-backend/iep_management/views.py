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
import time
import json
import re


def _as_dict(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError):
            return {}
    return {}


def _sync_iep_goal_rows(iep_instance):
    """Keep Section C goal rows aligned with the saved IEP payload."""
    IEPGoal.objects.filter(iep=iep_instance).delete()
    details = _as_dict(iep_instance.generatedDetails)
    learner_goals = details.get('learnerGoals') or []

    if isinstance(learner_goals, list) and learner_goals:
        for goal in learner_goals:
            if not isinstance(goal, dict):
                continue
            subject = goal.get('type') or goal.get('subject_category') or 'GENERAL'
            annual_goal = goal.get('annualGoal') or goal.get('annual_goal') or goal.get('goalName') or ''
            parent_goal = IEPGoal.objects.create(
                iep=iep_instance,
                goalName=(annual_goal or subject or 'IEP Goal')[:200],
                target_metric='Standard IEP Metric',
                subject_category=subject,
                annual_goal=annual_goal,
            )
            rows = goal.get('rows') or goal.get('objective_rows') or []
            if not rows:
                rows = [{}]
            for row in rows:
                if not isinstance(row, dict):
                    row = {}
                IEPObjectiveRow.objects.create(
                    parent_goal=parent_goal,
                    enroute_objectives=row.get('objective') or row.get('enroute_objectives') or '',
                    interventions_procedures=row.get('interventions') or row.get('interventions_procedures') or '',
                    timeline_mins_session=row.get('timeline') or row.get('timeline_mins_session') or '',
                    individuals_responsible=row.get('responsible') or row.get('individuals_responsible') or '',
                    progress_instructional=row.get('evaluation') or row.get('progress_instructional') or '',
                    remarks=row.get('remarks') or '',
                )
        return

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
                annual_goal=cleaned_goal,
            )
            IEPObjectiveRow.objects.create(
                parent_goal=parent_goal,
                enroute_objectives='Initial baseline objective target.',
                interventions_procedures='Standard accommodations protocols.',
                timeline_mins_session='15-20 mins daily',
                individuals_responsible='SPED Teacher',
            )

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
            teacher_id = request.user.id if request.user.is_authenticated else payload.get('teacherID')
            teacher = self._get_teacher_from_user_id(teacher_id)
            try:
                student_query = StudentProfile.objects.filter(pk=student_id)
                if teacher:
                    student_query = student_query.filter(teacher=teacher)
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

                _sync_iep_goal_rows(iep_instance)

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

    def update(self, request, *args, **kwargs):
        """
        Create a new IEP version instead of overwriting the old record.
        This keeps the Version dropdown useful for tracking student progress.
        """
        original = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(original, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        latest = IEPModel.objects.filter(studentID=original.studentID).order_by('-version').first()
        next_version = (latest.version + 1) if latest else (original.version + 1)

        iep_instance = IEPModel.objects.create(
            studentID=original.studentID,
            baselineData=data.get('baselineData', original.baselineData),
            goals=data.get('goals', original.goals),
            accommodations=data.get('accommodations', original.accommodations),
            generatedDetails=data.get('generatedDetails', original.generatedDetails),
            version=next_version,
            program_type=data.get('program_type', original.program_type),
            difficulties=data.get('difficulties', original.difficulties),
            learning_barriers=data.get('learning_barriers', original.learning_barriers),
            barrier_qualifiers=data.get('barrier_qualifiers', original.barrier_qualifiers),
            learning_facilitators=data.get('learning_facilitators', original.learning_facilitators),
            facilitator_qualifiers=data.get('facilitator_qualifiers', original.facilitator_qualifiers),
            learning_accommodations=data.get('learning_accommodations', original.learning_accommodations),
        )
        _sync_iep_goal_rows(iep_instance)
        return Response(IEPListDetailSerializer(iep_instance).data, status=status.HTTP_200_OK)


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
        iep_id = self.request.query_params.get('iep')
        if iep_id:
            return queryset.filter(iep_id=iep_id)
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