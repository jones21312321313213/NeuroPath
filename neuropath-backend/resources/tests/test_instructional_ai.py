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
