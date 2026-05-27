from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics,viewsets
from .serializers import IEPDataSerializer, IEPListDetailSerializer, IEPUpdateSerializer,StandaloneIEPGoalSerializer
from users.models import StudentProfile
from tracking.models import AIGenerationLog
from .models import Assessment, IEPGoal, IEPModel,IEPObjectiveRow
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
            teacher = self._get_teacher_from_user_id(payload.get('teacherID'))
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