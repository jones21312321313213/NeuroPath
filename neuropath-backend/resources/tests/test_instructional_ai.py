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
        mock_ai.return_value = ('Invalid non-json output from model', 'template_fallback')
        data = LessonPlanGenerationService.execute_generation(self.goal.pk, self.teacher)
        self.assertIn('lesson_plans', data)
        self.assertIsInstance(data['lesson_plans'], list)
        self.assertGreater(len(data['lesson_plans']), 0)


class TeachingStrategyAPITestCase(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from common_test_utils import create_teacher_with_login, create_student
        from resources.models import TeachingStrategy

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
