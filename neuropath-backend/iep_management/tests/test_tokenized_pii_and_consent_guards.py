from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from users.models import Teacher, StudentProfile
from tracking.models import AIGenerationLog
from iep_management.privacy_utils import scrub_pii_from_text
from iep_management.views import IEPGeneratorService
from iep_management.serializers import IEPGenerationRequestSerializer
from resources.serializers import LessonGenerationSerializer


class TokenizedPIIAndConsentGuardsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username="teacher1_pii@test.com",
            email="teacher1_pii@test.com",
            password="Password123!",
        )
        self.teacher1 = Teacher.objects.create(
            name="Teacher One",
            email="teacher1_pii@test.com",
            passwordHash="hash",
        )
        self.user2 = User.objects.create_user(
            username="teacher2_pii@test.com",
            email="teacher2_pii@test.com",
            password="Password123!",
        )
        self.teacher2 = Teacher.objects.create(
            name="Teacher Two",
            email="teacher2_pii@test.com",
            passwordHash="hash",
        )
        self.consented_student = StudentProfile.objects.create(
            name="Juan Dela Cruz",
            age=10,
            grade=4,
            teacher=self.teacher1,
            diagnosis="ASD",
            parental_consent_obtained=True,
            guardian_name="Elena Dela Cruz",
            consent_date="2026-09-01",
            profileDetails={
                "lrn": "109876543210",
                "schoolName": "Bagong Silang Elementary School",
                "contactNumber": "0917-555-0199",
            },
        )
        self.unconsented_student = StudentProfile.objects.create(
            name="Mateo Santos",
            age=8,
            grade=2,
            teacher=self.teacher1,
            diagnosis="ASD",
            parental_consent_obtained=False,
            guardian_name="Rosa Santos",
        )
        self.other_teacher_student = StudentProfile.objects.create(
            name="Sofia Gomez",
            age=9,
            grade=3,
            teacher=self.teacher2,
            diagnosis="ASD",
            parental_consent_obtained=True,
            guardian_name="Carlos Gomez",
            consent_date="2026-09-01",
        )
        self.client.force_authenticate(user=self.user1)

    def test_scrub_pii_redacts_tokenized_first_last_names_lrn_phone_email_and_dates(self):
        raw = (
            "Juan struggles with transitions when Elena drops him off. "
            "LRN: 109876543210, DOB: 2016-05-14, Phone: 0917-555-0199, "
            "Email: elena.cruz@example.com. Studied Mayan history."
        )
        scrubbed = scrub_pii_from_text(raw, ["Juan Dela Cruz", "Elena Dela Cruz", "Maya Lin"])
        self.assertNotIn("Juan", scrubbed)
        self.assertNotIn("Elena", scrubbed)
        self.assertNotIn("Cruz", scrubbed)
        self.assertNotIn("109876543210", scrubbed)
        self.assertNotIn("2016-05-14", scrubbed)
        self.assertNotIn("0917-555-0199", scrubbed)
        self.assertNotIn("elena.cruz@example.com", scrubbed)
        # Word boundary preservation: "Mayan" must not be corrupted by "Maya"
        self.assertIn("Mayan", scrubbed)

    def test_generate_iep_goal_api_view_blocks_unconsented_and_cross_tenant_student(self):
        # 1. Unconsented student -> 403 Forbidden
        res_unconsented = self.client.post(
            "/api/iep/generate-goal/",
            {
                "student_id": self.unconsented_student.pk,
                "student_name": "Mateo Santos",
                "diagnosis": "ASD",
                "baseline_barriers": "Needs visual schedule cues during transitions",
                "target_domain": "Communication",
            },
            format="json",
        )
        self.assertEqual(res_unconsented.status_code, 403)

        # 2. Cross-tenant student owned by teacher2 -> 404 Not Found
        res_other = self.client.post(
            "/api/iep/generate-goal/",
            {
                "student_id": self.other_teacher_student.pk,
                "student_name": "Sofia Gomez",
                "diagnosis": "ASD",
                "baseline_barriers": "Needs visual schedule cues during transitions",
                "target_domain": "Communication",
            },
            format="json",
        )
        self.assertIn(res_other.status_code, (403, 404))

    def test_ai_generation_log_prompt_text_scrubs_student_pii(self):
        IEPGeneratorService.generate_draft(
            student=self.consented_student,
            baseline_input="Juan needs help from Elena (LRN 109876543210)",
            target_domains="Communication",
            teacher=self.teacher1,
        )
        log = AIGenerationLog.objects.filter(teacher=self.teacher1).latest("timestamp")
        self.assertNotIn("Juan", log.prompt_text)
        self.assertNotIn("Elena", log.prompt_text)
        self.assertNotIn("109876543210", log.prompt_text)
        self.assertNotIn("Bagong Silang Elementary School", log.prompt_text)

    def test_serializer_max_length_caps_reject_oversized_prompts(self):
        oversized = "A" * 501
        iep_ser = IEPGenerationRequestSerializer(
            data={
                "student_name": "Juan Dela Cruz",
                "diagnosis": "ASD",
                "baseline_barriers": oversized,
                "target_domain": "Communication",
            }
        )
        self.assertFalse(iep_ser.is_valid())
        self.assertIn("baseline_barriers", iep_ser.errors)

        lesson_ser = LessonGenerationSerializer(
            data={
                "goalID": 1,
                "teacherPrompt": oversized,
            }
        )
        self.assertFalse(lesson_ser.is_valid())
        self.assertIn("teacherPrompt", lesson_ser.errors)
