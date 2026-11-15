import json
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel


class BundledRGORIGenerationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auth_user = User.objects.create_user(
            username='auditor@test.com',
            email='auditor@test.com',
            password='TestPassword123!'
        )
        self.teacher = Teacher.objects.create(
            email='auditor@test.com',
            name='Auditor Smith',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            name='Sammy Rivera',
            age=9,
            teacher=self.teacher,
            diagnosis='ADHD',
            support_needs='Sensory breaks and chunked tasks',
            parental_consent_obtained=True,
            guardian_name='Maria Rivera',
            consent_date='2026-10-01',
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            accommodations='Visual cues, frequent movement breaks',
            difficulties='Difficulty focusing on independent work',
            learning_barriers='Distractibility',
            learning_facilitators='Special Ed Teacher, General Ed Teacher'
        )
        self.client.force_authenticate(user=self.auth_user)

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_generate_goals_attaches_rgori_audit_payload(self, mock_groq, mock_gemini):
        mock_groq.side_effect = [
            # Annual goal (attempt 1)
            "Given visual schedule cards, Sammy will independently remain on task for 15 minutes across 4 consecutive days.",
            # Annual goal (attempt 2 after R-GORI self-correction)
            "During morning circle and small-group stations, given visual schedule cards, Sammy will independently remain on task for 15 minutes across 2 classroom settings and 4 consecutive days.",
            # Objectives JSON
            json.dumps([{
                "enroute_objectives": "Sammy will check off the visual schedule strip.",
                "interventions_procedures": "Visual timers and positive reinforcement.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "Special Ed Teacher",
                "progress_instructional": "Daily tracker.",
                "remarks": "Phase 1."
            }])
        ]

        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Behavioral Skills",
            "difficulties": "Difficulty focusing on independent work",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty focusing on independent work",
                        "assistive_technology": "Visual timers"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data["goals"]) > 0)
        goal = data["goals"][0]

        # Verify rgori_audit is attached to the goal dictionary
        self.assertIn("rgori_audit", goal)
        audit = goal["rgori_audit"]
        self.assertIn("total_score", audit)
        self.assertIn("status", audit)
        self.assertIn("breakdown", audit)
        self.assertIn("measurability", audit["breakdown"])
        self.assertIn("functionality", audit["breakdown"])
        self.assertIn("generality", audit["breakdown"])
        self.assertIn("instructional_context", audit["breakdown"])
        self.assertGreaterEqual(audit["total_score"], 65)
