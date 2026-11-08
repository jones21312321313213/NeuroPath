import json
from unittest.mock import patch
from django.test import TestCase
from common_test_utils import create_teacher_with_login, create_student
from iep_management.models import IEPModel, IEPGoal
from resources.models import LessonPlan, TeachingStrategy, VisualAid
from resources.serializers import VisualAidSerializer
from resources.views import (
    LessonPlanBinaryExportEngine,
    StrategyBinaryExportEngine,
    PDFExportEngine,
    VisualAidGeneratorService,
)


class PDFXmlSinkAndSSRFGuardsTests(TestCase):
    def setUp(self):
        self.user, self.teacher, self.token = create_teacher_with_login("pdf_sec@test.com")
        self.student = create_student(
            self.teacher,
            name="Liam Chen",
            parental_consent_obtained=True,
            consent_date="2026-09-01",
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            program_type="Graded",
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            goalName="Safe PDF Goal",
            subject_category="Communication Skills",
            annual_goal="The learner will use picture cards in 4 of 5 trials.",
        )

    def test_reportlab_exporters_escape_malicious_xml_and_img_tags_without_crashing(self):
        from resources.views import escape_reportlab_text
        self.assertNotIn("\x00", escape_reportlab_text("Null\x00Byte\x07Test"))
        xml_payload = (
            '<para><img src="http://127.0.0.1:8000/admin"/>'
            '<font color="red"><b>Unclosed tag\x07\x1f'
        )
        lp = LessonPlan.objects.create(
            iep_goal=self.goal,
            title=f"Lesson {xml_payload}",
            lessonContent=json.dumps({
                "lesson_plans": [{
                    "objective_focus": xml_payload,
                    "introduction": xml_payload,
                    "core_activity": xml_payload,
                    "assessment": xml_payload,
                    "materials_needed": [xml_payload],
                }]
            }),
        )
        lp_stream = LessonPlanBinaryExportEngine.generate_pdf_stream(lp)
        self.assertTrue(lp_stream.read().startswith(b"%PDF-"))

        strat = TeachingStrategy.objects.create(
            iep_goal=self.goal,
            title=f"Strategy {xml_payload}",
            strategyContent=(
                f"**{xml_payload}**\n"
                f"* **{xml_payload}:** {xml_payload}\n"
                f"+ {xml_payload}\n"
                f"{xml_payload}"
            ),
        )
        strat_stream = StrategyBinaryExportEngine.generate_pdf_stream(strat)
        self.assertTrue(strat_stream.read().startswith(b"%PDF-"))

        aid = VisualAid.objects.create(
            iep_goal=self.goal,
            title=f"Visual {xml_payload}",
            imageUrl="",
            steps_data=[{
                "step": 1,
                "title": xml_payload,
                "description": xml_payload,
                "imageUrl": "",
            }],
        )
        aid_stream = PDFExportEngine.compile_pdf(aid)
        self.assertTrue(aid_stream.read().startswith(b"%PDF-"))

    def test_visual_aid_serializer_blocks_ssrf_urls_in_image_url_and_steps_data(self):
        ssrf_urls = [
            "http://127.0.0.1:8000/api/users/profile/",
            "http://localhost:8000/admin",
            "http://169.254.169.254/latest/meta-data/",
            "https://evil.example.com/payload.png",
            "http://image.pollinations.ai/prompt/insecure-http",
        ]
        for bad_url in ssrf_urls:
            ser = VisualAidSerializer(data={"title": "Test", "imageUrl": bad_url})
            self.assertFalse(ser.is_valid(), f"Expected top-level imageUrl {bad_url} to be rejected")

            step_ser = VisualAidSerializer(
                data={
                    "title": "Test",
                    "steps_data": [{"step": 1, "title": "S1", "imageUrl": bad_url}],
                }
            )
            self.assertFalse(step_ser.is_valid(), f"Expected steps_data imageUrl {bad_url} to be rejected")

    @patch("socket.getaddrinfo")
    def test_visual_aid_serializer_blocks_dns_rebinding_to_private_ip(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("127.0.0.1", 443)),
        ]
        ser = VisualAidSerializer(
            data={
                "title": "DNS Rebind Test",
                "imageUrl": "https://image.pollinations.ai/prompt/rebind-test",
            }
        )
        self.assertFalse(ser.is_valid())

    @patch("resources.views.http_client.get")
    def test_pdf_export_and_stitch_panels_block_ssrf_and_disable_redirects(self, mock_get):
        aid = VisualAid.objects.create(
            iep_goal=self.goal,
            title="SSRF Test Aid",
            imageUrl="http://169.254.169.254/latest/meta-data/",
            steps_data=[
                {"step": 1, "title": "S1", "description": "D1", "imageUrl": "http://127.0.0.1:8000/secret.png"},
                {"step": 2, "title": "S2", "description": "D2", "imageUrl": "http://localhost/secret.png"},
                {"step": 3, "title": "S3", "description": "D3", "imageUrl": "https://evil.internal/secret.png"},
            ],
        )
        PDFExportEngine.compile_pdf(aid)
        VisualAidGeneratorService.stitch_three_panels(aid.steps_data)
        self.assertFalse(mock_get.called, "http_client.get must never be called for non-allowlisted SSRF URLs")
