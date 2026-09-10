from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch
from users.models import Teacher, StudentProfile
from users.serializers import StudentProfileSerializer

User = get_user_model()

class StudentConsentModelTestCase(TestCase):
    def setUp(self):
        self.teacher_user = User.objects.create_user(username='teacher_mary', email='mary@school.edu', password='password123')
        self.teacher = Teacher.objects.create(name='Mary Teacher', email='mary@school.edu', passwordHash='hash')

    def test_consent_fields_default_to_pending(self):
        student = StudentProfile.objects.create(
            name='Juan Dela Cruz',
            age=8,
            grade=2,
            teacher=self.teacher
        )
        self.assertFalse(student.parental_consent_obtained)
        self.assertIsNone(student.consent_date)
        self.assertEqual(student.guardian_name, '')
        self.assertEqual(student.guardian_relationship, 'Parent')

    def test_consent_validation_requires_guardian_and_date_when_obtained(self):
        serializer = StudentProfileSerializer(data={
            'name': 'Maria Santos',
            'age': 9,
            'grade': 3,
            'gender': 'Female',
            'parental_consent_obtained': True,
            'guardian_name': '',
            'consent_date': None
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('guardian_name', serializer.errors)
        self.assertIn('consent_date', serializer.errors)

    def test_valid_consent_data_persists(self):
        serializer = StudentProfileSerializer(data={
            'name': 'Maria Santos',
            'age': 9,
            'grade': 3,
            'gender': 'Female',
            'parental_consent_obtained': True,
            'guardian_name': 'Elena Santos',
            'guardian_relationship': 'Mother',
            'consent_date': '2026-09-11'
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)


class PrivacyUtilsTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Bob', email='bob@school.edu', passwordHash='hash')
        self.student_consented = StudentProfile.objects.create(
            name='Angel Locsin',
            age=7,
            grade=1,
            gender='Female',
            teacher=self.teacher,
            parental_consent_obtained=True,
            guardian_name='Angelo Locsin',
            consent_date='2026-09-01'
        )
        self.student_unconsented = StudentProfile.objects.create(
            name='Jose Rizal',
            age=10,
            grade=4,
            gender='Male',
            teacher=self.teacher,
            parental_consent_obtained=False
        )

    def test_anonymize_student_context_strips_name(self):
        from iep_management.privacy_utils import anonymize_student_context
        anon_name = anonymize_student_context(self.student_consented)
        self.assertNotIn('Angel', anon_name)
        self.assertNotIn('Locsin', anon_name)
        self.assertIn('Learner', anon_name)
        self.assertIn('Grade 1', anon_name)

    def test_scrub_pii_from_free_text(self):
        from iep_management.privacy_utils import scrub_pii_from_text
        text = "Angel Locsin has difficulty in reading. Her guardian Angelo Locsin noted distress."
        scrubbed = scrub_pii_from_text(text, pii_terms=['Angel Locsin', 'Angel', 'Locsin', 'Angelo Locsin'])
        self.assertNotIn('Angel', scrubbed)
        self.assertNotIn('Locsin', scrubbed)
        self.assertIn('The learner', scrubbed)

    def test_verify_ra10173_consent_raises_for_unconsented_student(self):
        from iep_management.privacy_utils import verify_ra10173_consent, ConsentRequiredException
        with self.assertRaises(ConsentRequiredException):
            verify_ra10173_consent(self.student_unconsented)

    def test_verify_ra10173_consent_passes_for_consented_student(self):
        from iep_management.privacy_utils import verify_ra10173_consent, ConsentRequiredException
        try:
            verify_ra10173_consent(self.student_consented)
        except ConsentRequiredException:
            self.fail("verify_ra10173_consent raised ConsentRequiredException unexpectedly!")


class AIPipelinePrivacyTestCase(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from iep_management.models import IEPModel, IEPGoal
        self.client = APIClient()
        self.user = User.objects.create_user(username='alice', email='alice@school.edu', password='pw')
        self.teacher = Teacher.objects.create(name='Alice Teacher', email='alice@school.edu', passwordHash='pw')
        self.client.force_authenticate(user=self.user)

        self.student_consented = StudentProfile.objects.create(
            name='Marco Polo',
            age=8,
            grade=2,
            teacher=self.teacher,
            parental_consent_obtained=True,
            guardian_name='Niccolo Polo',
            consent_date='2026-09-01'
        )
        self.student_unconsented = StudentProfile.objects.create(
            name='Ferdinand Magellan',
            age=9,
            grade=3,
            teacher=self.teacher,
            parental_consent_obtained=False
        )
        self.iep_consented = IEPModel.objects.create(
            studentID=self.student_consented,
            version=1,
            difficulties='Difficulty in communicating'
        )
        self.iep_unconsented = IEPModel.objects.create(
            studentID=self.student_unconsented,
            version=1,
            difficulties='Difficulty in communicating'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_ai_insight_blocked_without_consent(self, mock_ai):
        response = self.client.post(f'/api/iep/student/{self.student_unconsented.studentID}/generate-insight/')
        self.assertEqual(response.status_code, 403)
        self.assertIn('RA 10173', response.data.get('error', ''))
        mock_ai.assert_not_called()

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_ai_insight_sanitizes_pii(self, mock_ai):
        mock_ai.return_value = ('Safe synthesized summary.', 'template_fallback')
        response = self.client.post(f'/api/iep/student/{self.student_consented.studentID}/generate-insight/')
        self.assertEqual(response.status_code, 201)
        mock_ai.assert_called_once()
        called_prompt = mock_ai.call_args[1].get('prompt') or mock_ai.call_args[0][0]
        self.assertNotIn('Marco', called_prompt)
        self.assertNotIn('Polo', called_prompt)
        self.assertIn('Learner (Grade 2)', called_prompt)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_goals_from_iep_blocked_without_consent(self, mock_ai):
        payload = {
            'iep_id': self.iep_unconsented.iepID,
            'generatedDetails': {'special_factors_considerations': [{'difficulty': 'Speech'}]}
        }
        response = self.client.post('/api/iep/generate-goals-from-iep/', payload, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertIn('RA 10173', response.data.get('error', ''))
        mock_ai.assert_not_called()

    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_pollinations')
    def test_generate_visual_aid_prompt_excludes_student_name(self, mock_fetch):
        from iep_management.models import IEPGoal
        mock_fetch.return_value = (b'bytes', 'image/jpeg', 'https://image.pollinations.ai/prompt/test')
        goal = IEPGoal.objects.create(iep=self.iep_consented, annual_goal='Learn colors', goalName='Colors')
        response = self.client.post('/api/resources/generate-visual-aid/', {
            'iep_goal_id': goal.pk,
            'category': 'Visual'
        })
        self.assertEqual(response.status_code, 201)
        mock_fetch.assert_called_once()
        prompt_arg = mock_fetch.call_args[0][0]
        self.assertNotIn('Marco', prompt_arg)
        self.assertNotIn('Polo', prompt_arg)
        self.assertIn('elementary learner', prompt_arg)

    def test_generate_visual_aid_blocked_without_consent(self):
        from iep_management.models import IEPGoal
        goal = IEPGoal.objects.create(iep=self.iep_unconsented, annual_goal='Learn shapes', goalName='Shapes')
        response = self.client.post('/api/resources/generate-visual-aid/', {
            'iep_goal_id': goal.pk,
            'category': 'Visual'
        })
        self.assertEqual(response.status_code, 403)
        self.assertIn('RA 10173', response.data.get('error', ''))
