from django.test import TestCase
from unittest.mock import patch
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.services import AIGenerationService
from iep_management.views import GenerateIEPGoalsFromIEPView

class InsightsAndGoalsTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Alice', email='alice@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(
            name='Leo Valdez',
            age=10,
            diagnosis='ASD Level 1',
            teacher=self.teacher,
            support_needs='Sensory breaks',
            assessmentResult='Age appropriate',
            parental_consent_obtained=True,
            guardian_name='Guardian Valdez',
            consent_date='2026-09-01'
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Communication difficulties',
            learning_barriers='Mild barrier',
            accommodations='Visual charts'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_and_save_summary_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('Synthesized student profile summary.', 'template_fallback')
        insight = AIGenerationService.generate_and_save_summary(self.student, self.teacher)
        self.assertIsNotNone(insight.pk)
        self.assertEqual(insight.summary_text, 'Synthesized student profile summary.')

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_annual_goal_includes_special_factor_notes(self, mock_ai):
        mock_ai.return_value = ('Leo will identify and articulate emotions using PECS across 4 of 5 opportunities.', 'template_fallback')
        view = GenerateIEPGoalsFromIEPView()
        goal_text = view._generate_annual_goal(
            student_name=self.student.name,
            difficulty='Communication difficulties',
            assistive_tech='PECS',
            accommodations='Visual schedule',
            facilitators='SNED Teacher',
            goal_area='Communication Skills',
            teacher_prompt='Focus on emotion recognition',
            special_factor_notes='Sensitive to sudden auditory alarms and requires low-stimulus environments'
        )
        self.assertTrue(len(goal_text) > 0)
        called_prompt = mock_ai.call_args[0][0]
        self.assertIn('Sensitive to sudden auditory alarms', called_prompt)
