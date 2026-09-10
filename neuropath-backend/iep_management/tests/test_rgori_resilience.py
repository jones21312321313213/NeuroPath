import json
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.rgori_service import RGORICheckerService
from iep_management.views import GenerateIEPGoalsFromIEPView


class RGORIResilienceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auth_user = User.objects.create_user(
            username='teacher_rgori@test.com',
            email='teacher_rgori@test.com',
            password='TestPassword123!'
        )
        self.teacher = Teacher.objects.create(
            email='teacher_rgori@test.com',
            name='Teacher Brenda',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            name='Marcus Aurelius',
            age=11,
            teacher=self.teacher,
            diagnosis='Autism Spectrum Disorder',
            support_needs='Visual structure and sensory accommodations'
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            accommodations='Visual schedules, noise dampening headphones',
            difficulties='Difficulty in social communication',
            learning_barriers='Moderate barrier',
            learning_facilitators='SNED Teacher, Speech Therapist'
        )
        self.client.force_authenticate(user=self.auth_user)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_valid_json_parsing(self, mock_ai):
        mock_payload = {
            "total_score": 85,
            "breakdown": {
                "measurability": 22,
                "functionality": 21,
                "generality": 21,
                "instructional_context": 21
            },
            "feedback": "Strong observable verbs and clear measurement criteria.",
            "compliant": True
        }
        mock_ai.return_value = (json.dumps(mock_payload), 'groq')

        result = RGORICheckerService.evaluate_goal("Marcus will communicate using PECS", "Marcus, ASD")
        self.assertEqual(result["total_score"], 85)
        self.assertTrue(result["compliant"])
        self.assertEqual(result["breakdown"]["measurability"], 22)
        self.assertIn("Strong observable verbs", result["feedback"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_markdown_wrapped_json(self, mock_ai):
        mock_payload = {
            "total_score": 78,
            "breakdown": {
                "measurability": 20,
                "functionality": 20,
                "generality": 19,
                "instructional_context": 19
            },
            "feedback": "Acceptable goal across all 4 R-GORI criteria.",
            "compliant": True
        }
        mock_ai.return_value = (f"```json\n{json.dumps(mock_payload)}\n```", 'ollama')

        result = RGORICheckerService.evaluate_goal("Marcus will write letters", "Marcus, Grade 3")
        self.assertEqual(result["total_score"], 78)
        self.assertTrue(result["compliant"])
        self.assertEqual(result["breakdown"]["functionality"], 20)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_unparsable_or_empty_response_fallback(self, mock_ai):
        # AI returns non-JSON or corrupted output
        mock_ai.return_value = ("Corrupted non-json text from provider", 'template_fallback')

        result = RGORICheckerService.evaluate_goal("Marcus will read words", "Marcus context")
        self.assertEqual(result["total_score"], 75)
        self.assertTrue(result["compliant"])
        self.assertIn("Deterministic pedagogical evaluation", result["feedback"])
        self.assertIn("measurability", result["breakdown"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_deterministic_template_json_fallback(self, mock_ai):
        # AI returns template json (e.g. lesson plan json mode output)
        mock_ai.return_value = (json.dumps({"lesson_plans": [{"objective_focus": "Focus"}]}), 'template_fallback')

        result = RGORICheckerService.evaluate_goal("Marcus will count to 20", "Marcus context")
        self.assertEqual(result["total_score"], 75)
        self.assertTrue(result["compliant"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_objective_rows_valid_json(self, mock_ai):
        mock_rows = [
            {
                "enroute_objectives": "Marcus will match 5 sight words with 80% accuracy.",
                "interventions_procedures": "Flashcards and token reinforcement.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Daily trial checklist.",
                "remarks": "Strong baseline."
            },
            {
                "enroute_objectives": "Marcus will read 5 sight words aloud independently.",
                "interventions_procedures": "Guided verbal prompting.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Weekly probe.",
                "remarks": "Enroute step 2."
            }
        ]
        mock_ai.return_value = (json.dumps(mock_rows), 'groq')

        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows(
            student_name='Marcus',
            difficulty='Reading',
            assistive_tech='Sight word cards',
            annual_goal='Marcus will read 20 sight words.',
            facilitators='SNED Teacher',
            goal_area='Literacy Skills'
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["enroute_objectives"], "Marcus will match 5 sight words with 80% accuracy.")

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_objective_rows_unparsable_fallback(self, mock_ai):
        mock_ai.return_value = ("Not a JSON array", 'template_fallback')

        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows(
            student_name='Marcus',
            difficulty='Math',
            assistive_tech='Counting cubes',
            annual_goal='Marcus will add numbers within 10.',
            facilitators='SNED Teacher',
            goal_area='Mathematics'
        )
        self.assertIsInstance(rows, list)
        self.assertGreaterEqual(len(rows), 1)
        self.assertIn("enroute_objectives", rows[0])
        self.assertIn("interventions_procedures", rows[0])
        self.assertIn("timeline_mins_session", rows[0])

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    def test_generate_goals_from_iep_view_offline_cascade(self, mock_groq, mock_ollama):
        """
        When external LLMs (Ollama & Groq) are completely offline,
        POST /api/iep/generate-goals-from-iep/ MUST return HTTP 200 with valid goals and objective rows.
        """
        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Communication Skills",
            "teacher_prompt": "Focus on verbal greetings",
            "accommodations": "Visual schedule",
            "difficulties": "Difficulty in communicating",
            "learning_barriers": "Moderate barrier",
            "barrier_qualifiers": "Moderate barrier",
            "learning_facilitators": "SNED Teacher",
            "facilitator_qualifiers": "Special Education Professionals",
            "special_factor_notes": "Needs quiet environment during transitions",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in communicating",
                        "assistive_technology": "PECS communication board"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200, f"Expected 200 OK, got {response.status_code}: {response.data}")
        data = response.json()
        self.assertEqual(data["iep_id"], self.iep.pk)
        self.assertEqual(data["total_goals_generated"], 1)
        self.assertEqual(len(data["goals"]), 1)

        goal = data["goals"][0]
        self.assertEqual(goal["iep"], self.iep.pk)
        self.assertEqual(goal["subject_category"], "Communication Skills")
        self.assertTrue(len(goal["annual_goal"]) > 0)
        self.assertGreaterEqual(goal["_rgori_score"], 65)
        self.assertTrue(len(goal["objective_rows"]) >= 1)
        self.assertIn("enroute_objectives", goal["objective_rows"][0])

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_generate_goals_from_iep_view_online_groq(self, mock_groq, mock_ollama):
        """
        When Groq is online, POST /api/iep/generate-goals-from-iep/ succeeds with LLM output.
        """
        mock_groq.side_effect = [
            "Marcus will initiate a greeting with peers in 4 out of 5 opportunities.", # annual goal
            json.dumps({
                "total_score": 88,
                "breakdown": {"measurability": 22, "functionality": 22, "generality": 22, "instructional_context": 22},
                "feedback": "Excellent observable verb and clear frequency metric.",
                "compliant": True
            }), # R-GORI evaluation
            json.dumps([{
                "enroute_objectives": "Marcus will wave hello when greeted.",
                "interventions_procedures": "Teacher modeling and gesture prompts.",
                "timeline_mins_session": "10 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Mastery checklist.",
                "remarks": "Enroute sub-skill 1."
            }]) # Objective rows
        ]

        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Social-Emotional Skills",
            "difficulties": "Difficulty in interacting with peers",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in interacting with peers",
                        "assistive_technology": "Visual social stories"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        goal = data["goals"][0]
        self.assertIn("initiate a greeting", goal["annual_goal"])
        self.assertEqual(goal["_rgori_score"], 88)
        self.assertEqual(len(goal["objective_rows"]), 1)

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    def test_generate_iep_goal_api_view_offline_cascade(self, mock_groq, mock_ollama):
        """
        POST /api/iep/generate-goal/ succeeds with HTTP 200 when LLM providers are offline.
        """
        url = '/api/iep/generate-goal/'
        payload = {
            "student_name": "Marcus Aurelius",
            "diagnosis": "ASD",
            "baseline_barriers": "Needs visual cues",
            "target_domain": "Communication"
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("generated_goal", data)
        self.assertTrue(len(data["generated_goal"]) > 0)
        self.assertGreaterEqual(data["rgori_score"], 65)
