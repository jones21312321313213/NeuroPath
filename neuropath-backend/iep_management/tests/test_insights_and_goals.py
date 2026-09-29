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

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_annual_goal_enforces_abcd_criteria(self, mock_ai):
        mock_ai.return_value = ('Leo will independently count and sort classroom objects into 3 categories with 80% accuracy in 4 of 5 trials.', 'gemini')
        view = GenerateIEPGoalsFromIEPView()
        goal_text = view._generate_annual_goal(
            student_name=self.student.name,
            difficulty='Difficulty in counting and identifying numbers',
            assistive_tech='Visual counters',
            accommodations='Direct cues',
            facilitators='SNED Teacher',
            goal_area='Mathematics'
        )
        called_prompt = mock_ai.call_args[0][0]
        self.assertIn('ABCD criteria', called_prompt)
        self.assertIn('Actor:', called_prompt)
        self.assertIn('Behavior:', called_prompt)
        self.assertIn('Condition:', called_prompt)
        self.assertIn('Degree:', called_prompt)
        self.assertIn('Mathematics', called_prompt)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_objective_rows_returns_three_month_milestones(self, mock_ai):
        import json
        mock_ai.return_value = (json.dumps([
            {
                "enroute_objectives": "Leo will count and identify numbers 1 to 10 with 80% accuracy.",
                "month_1_target": "Given visual counters and direct physical prompts, count numbers 1-3 with 70% accuracy.",
                "month_2_target": "Given visual counters and faded verbal cues, count numbers 1-5 with 75% accuracy.",
                "month_3_target": "Independently count numbers 5-10 with 80% accuracy in 4 of 5 consecutive trials.",
                "interventions_procedures": "Use tactile counters and visual number lines.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Weekly tally checklist.",
                "remarks": "Strong fine motor engagement."
            }
        ]), 'gemini')
        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows(
            student_name=self.student.name,
            difficulty='Difficulty in counting',
            assistive_tech='Tactile counters',
            annual_goal='Leo will count numbers 1-10.',
            facilitators='SNED Teacher',
            goal_area='Mathematics'
        )
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertIn('count numbers 1-3', row['month_1_target'])
        self.assertIn('count numbers 1-5', row['month_2_target'])
        self.assertIn('numbers 5-10', row['month_3_target'])
        self.assertEqual(row['month1'], row['month_1_target'])
        self.assertEqual(row['month2'], row['month_2_target'])
        self.assertEqual(row['month3'], row['month_3_target'])

