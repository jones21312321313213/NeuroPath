from django.test import TestCase
from unittest.mock import patch
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal
from resources.services import TeachingStrategyGenerationService, LessonPlanGenerationService

class InstructionalAIServiceTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Bob', email='bob@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(
            name='Maya Lin',
            age=8,
            teacher=self.teacher,
            parental_consent_obtained=True,
            guardian_name='Guardian Lin',
            consent_date='2026-09-01'
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Attention and sensory regulation',
            generatedDetails={'specialFactorNotes': 'Benefits from fidget tools and auditory noise-canceling headphones'}
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            subject_category='Behavioral Skills',
            annual_goal='Maya will remain engaged in classroom tasks for 15 minutes.'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_teaching_strategy_generation_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('**Core Strategy Overview:** Structured sensory intervals.', 'template_fallback')
        strategy = TeachingStrategyGenerationService.generate_and_save_strategy(self.goal, self.teacher)
        self.assertIsNotNone(strategy.pk)
        self.assertIn('Structured sensory intervals', strategy.strategyContent)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_teaching_strategy_generate_draft_does_not_save_to_database(self, mock_ai):
        from resources.models import TeachingStrategy
        mock_ai.return_value = ('**Core Strategy Overview:** Structured sensory intervals.', 'template_fallback')
        draft = TeachingStrategyGenerationService.generate_strategy(self.goal, self.teacher)
        self.assertIsInstance(draft, dict)
        self.assertIn('Structured sensory intervals', draft['strategyContent'])
        self.assertEqual(draft['goalID'], self.goal.pk)
        self.assertEqual(draft['studentName'], 'Maya Lin')
        self.assertEqual(TeachingStrategy.objects.filter(iep_goal=self.goal).count(), 0)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_teaching_strategy_includes_special_factor_notes_in_prompt(self, mock_ai):
        mock_ai.return_value = ('**Core Strategy Overview:** Structured sensory intervals.', 'template_fallback')
        TeachingStrategyGenerationService.generate_and_save_strategy(self.goal, self.teacher)
        self.assertTrue(mock_ai.called)
        called_prompt = mock_ai.call_args.kwargs.get('prompt') or mock_ai.call_args[0][0]
        self.assertIn('Benefits from fidget tools and auditory noise-canceling headphones', called_prompt)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_lesson_plan_generation_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('{"lesson_plans": [{"objective_focus": "Task Completion", "introduction": "Intro", "core_activity": "Core", "assessment": "Check", "materials_needed": ["Timer"]}]}', 'template_fallback')
        data = LessonPlanGenerationService.execute_generation(self.goal.pk, self.teacher)
        self.assertIn('lesson_plans', data)
        self.assertEqual(len(data['lesson_plans']), 1)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_lesson_plan_generation_handles_invalid_json_fallback(self, mock_ai):
        mock_ai.return_value = ('Invalid non-json output from model', 'gemini')
        with self.assertRaises(Exception) as ctx:
            LessonPlanGenerationService.execute_generation(self.goal.pk, self.teacher)
        self.assertIn('Lesson Plan Generation failed', str(ctx.exception))

    def test_lesson_generation_serializer_with_only_goal_id_and_frontend_payload(self):
        from resources.serializers import LessonGenerationSerializer
        # Payload sent by ManageLessonPlans.jsx
        payload = {
            'studentID': self.student.pk,
            'goalID': self.goal.pk,
            'goalArea': 'Behavioral Skills',
            'teacherPrompt': ''
        }
        serializer = LessonGenerationSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['goalID'], self.goal.pk)
        # Should derive subject from goalArea or IEPGoal subject_category
        self.assertEqual(serializer.validated_data['subject'], 'Behavioral Skills')
        # Should derive topic from IEPGoal annual_goal
        self.assertEqual(serializer.validated_data['topic'], self.goal.annual_goal)

    def test_lesson_generation_serializer_invalid_goal_id(self):
        from resources.serializers import LessonGenerationSerializer
        serializer = LessonGenerationSerializer(data={'goalID': 0})
        self.assertFalse(serializer.is_valid())
        self.assertIn('goalID', serializer.errors)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_lesson_plan_api_view_post_success_with_frontend_payload(self, mock_ai):
        from rest_framework.test import APIClient
        from common_test_utils import create_teacher_with_login, create_student
        mock_ai.return_value = ('{"lesson_plans": [{"objective_focus": "Task Completion", "introduction": "Intro", "core_activity": "Core", "assessment": "Check", "materials_needed": ["Timer"]}]}', 'template_fallback')

        user, teacher, token = create_teacher_with_login('lesson_teacher@example.com')
        student = create_student(teacher, name='Lesson Student', parental_consent_obtained=True)
        iep = IEPModel.objects.create(studentID=student, version=1)
        goal = IEPGoal.objects.create(iep=iep, subject_category='Math', annual_goal='Count to 10')

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        payload = {
            'studentID': student.pk,
            'goalID': goal.pk,
            'goalArea': 'Math',
            'teacherPrompt': ''
        }
        response = client.post('/api/resources/generate-lesson/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('data', response.data)
        self.assertIn('lesson_plans', response.data['data'])

    def test_directory_lists_multiple_ieps_and_scopes_goals_to_selected_iep(self):
        from rest_framework.test import APIClient
        from common_test_utils import create_teacher_with_login, create_student
        from resources.views import _saved_ieps_for_student, _goal_options_for_student

        user, teacher, token = create_teacher_with_login('multi_iep_teacher@example.com')
        student = create_student(teacher, name='Multi IEP Student', parental_consent_obtained=True)

        # Create IEP Version 1
        iep_v1 = IEPModel.objects.create(
            studentID=student,
            version=1,
            accommodations='Visual schedule',
            difficulties='Reading'
        )
        goal_v1 = IEPGoal.objects.create(
            iep=iep_v1,
            subject_category='Reading',
            annual_goal='Improve reading comprehension to 80%'
        )

        # Create IEP Version 2
        iep_v2 = IEPModel.objects.create(
            studentID=student,
            version=2,
            accommodations='Noise-canceling headphones and frequent breaks',
            difficulties='Sensory overload'
        )
        goal_v2 = IEPGoal.objects.create(
            iep=iep_v2,
            subject_category='Sensory Regulation',
            annual_goal='Utilize sensory breaks independently'
        )

        # Test helper functions
        saved_ieps = list(_saved_ieps_for_student(student))
        self.assertEqual(len(saved_ieps), 2)
        self.assertEqual(saved_ieps[0].pk, iep_v2.pk)

        # Default options should return latest IEP (v2)
        latest_goals = _goal_options_for_student(student)
        self.assertEqual(len(latest_goals), 1)
        self.assertEqual(latest_goals[0]['goalID'], goal_v2.pk)

        # Explicit iep_id options should return goals for v1
        v1_goals = _goal_options_for_student(student, iep_id=iep_v1.pk)
        self.assertEqual(len(v1_goals), 1)
        self.assertEqual(v1_goals[0]['goalID'], goal_v1.pk)

        # Test GenerateLessonPlanAPIView GET with multiple IEPs
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = client.get('/api/resources/generate-lesson/')
        self.assertEqual(response.status_code, 200)
        dir_entry = next((s for s in response.data['directory'] if s['studentID'] == student.pk), None)
        self.assertIsNotNone(dir_entry)
        self.assertIn('availableIEPs', dir_entry)
        self.assertEqual(len(dir_entry['availableIEPs']), 2)
        self.assertEqual(dir_entry['availableIEPs'][0]['version'], 2)
        self.assertEqual(dir_entry['availableIEPs'][1]['version'], 1)
        self.assertEqual(dir_entry['availableGoals'][0]['goalID'], goal_v2.pk)

        # Request specific iep_id=iep_v1.pk
        response_v1 = client.get(f'/api/resources/generate-lesson/?student_id={student.pk}&iep_id={iep_v1.pk}')
        self.assertEqual(response_v1.status_code, 200)
        dir_entry_v1 = next((s for s in response_v1.data['directory'] if s['studentID'] == student.pk), None)
        self.assertEqual(dir_entry_v1['selectedIEPID'], iep_v1.pk)
        self.assertEqual(dir_entry_v1['availableGoals'][0]['goalID'], goal_v1.pk)

        # Test TeachingStrategyGenerationController GET with multiple IEPs
        strat_resp = client.get(f'/api/resources/generate-strategy/?student_id={student.pk}&iep_id={iep_v1.pk}')
        self.assertEqual(strat_resp.status_code, 200)
        strat_entry = next((s for s in strat_resp.data['directory'] if s['studentID'] == student.pk), None)
        self.assertEqual(strat_entry['selectedIEPID'], iep_v1.pk)
        self.assertEqual(strat_entry['availableGoals'][0]['goalID'], goal_v1.pk)


class TeachingStrategyAPITestCase(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from common_test_utils import create_teacher_with_login, create_student

        self.client = APIClient()
        self.user, self.teacher, self.token = create_teacher_with_login('strat_tester@example.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.student = create_student(
            self.teacher,
            name='Leo Valdez',
            parental_consent_obtained=True,
            guardian_name='Esperanza Valdez',
            consent_date='2026-09-01'
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            difficulties='Motor restlessness',
            generatedDetails={'specialFactorNotes': 'Needs movement breaks'}
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            goalName='Fine Motor Focus',
            annual_goal='Leo will complete pencil grip exercises for 10 minutes.'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_strategy_endpoint_returns_200_and_does_not_save_to_database(self, mock_ai):
        from resources.models import TeachingStrategy
        mock_ai.return_value = ('**Core Strategy Overview:** Tactical movement strategies.', 'template_fallback')

        response = self.client.post('/api/resources/generate-strategy/', {'goalID': self.goal.pk}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['message'], 'Teaching strategy successfully generated.')
        self.assertIn('data', response.data)
        self.assertIn('Tactical movement strategies', response.data['data']['strategyContent'])
        self.assertEqual(response.data['data']['goalID'], self.goal.pk)
        self.assertEqual(TeachingStrategy.objects.filter(iep_goal=self.goal).count(), 0)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_regenerate_strategy_multiple_times_does_not_create_database_records(self, mock_ai):
        from resources.models import TeachingStrategy
        mock_ai.return_value = ('**Core Strategy Overview:** Draft variation.', 'template_fallback')

        for _ in range(3):
            response = self.client.post('/api/resources/generate-strategy/', {'goalID': self.goal.pk}, format='json')
            self.assertEqual(response.status_code, 200)

        self.assertEqual(TeachingStrategy.objects.filter(iep_goal=self.goal).count(), 0)

    def test_explicit_save_strategy_via_teaching_strategies_endpoint(self):
        from resources.models import TeachingStrategy

        payload = {
            'iep_goal': self.goal.pk,
            'title': 'Strategy for: Fine Motor Focus',
            'strategyContent': 'This is a verified actionable strategy content exceeding ten characters.'
        }
        response = self.client.post('/api/resources/teaching-strategies/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['message'], 'Teaching Strategy successfully saved.')
        self.assertEqual(TeachingStrategy.objects.filter(iep_goal=self.goal).count(), 1)
        saved = TeachingStrategy.objects.get(iep_goal=self.goal)
        self.assertEqual(saved.title, 'Strategy for: Fine Motor Focus')
        self.assertEqual(response.data['data']['goalID'], self.goal.pk)

    def test_explicit_save_with_goalID_fallback(self):
        from resources.models import TeachingStrategy

        payload = {
            'goalID': self.goal.pk,
            'title': 'Strategy with goalID fallback',
            'strategyContent': 'Valid actionable strategy content exceeding minimum length.'
        }
        response = self.client.post('/api/resources/teaching-strategies/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TeachingStrategy.objects.filter(iep_goal=self.goal).count(), 1)
