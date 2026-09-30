import base64
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from common_test_utils import create_teacher_with_login, create_student
from iep_management.models import IEPModel, IEPGoal
from resources.models import VisualAid
from resources.views import VisualAidGeneratorService, PDFExportEngine


class VisualAidSequentialTaskAnalysisTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Teacher 1
        self.user1, self.teacher1, self.token1 = create_teacher_with_login('teacher1@example.com', name='Teacher One')

        # Teacher 2
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('teacher2@example.com', name='Teacher Two')

        # Student with RA 10173 Parental Consent
        self.student1 = create_student(
            self.teacher1,
            name="Leo Miller",
            age=8,
            grade=2,
            parental_consent_obtained=True,
            consent_date="2026-09-01"
        )

        # Student for Teacher 2
        self.student2 = create_student(
            self.teacher2,
            name="Sara Conner",
            age=9,
            grade=3,
            parental_consent_obtained=True,
            consent_date="2026-09-01"
        )

        # IEP & Goal for Student 1
        self.iep1 = IEPModel.objects.create(
            studentID=self.student1,
            version=1,
            program_type="Graded"
        )
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            subject_category="Daily Living Skills",
            annual_goal="Wash hands independently following hygiene routines",
            goalName="Handwashing Routine"
        )

        # IEP & Goal for Student 2
        self.iep2 = IEPModel.objects.create(
            studentID=self.student2,
            version=1,
            program_type="Graded"
        )
        self.goal2 = IEPGoal.objects.create(
            iep=self.iep2,
            subject_category="Communication",
            annual_goal="Request assistance using picture cards",
            goalName="Communication Help"
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # ── Unit Test 1: Gemini 1.5 Flash Decomposition ──────────────────────────
    @patch('iep_management.ai_engine.AIEngineService._call_gemini')
    def test_decompose_goal_into_steps_with_gemini(self, mock_gemini):
        mock_gemini.return_value = json.dumps({
            "steps": [
                {
                    "step": 1,
                    "title": "Turn on Water & Apply Soap",
                    "description": "Wet hands and pump soap onto palms.",
                    "visual_cue": "Child hands under faucet with foamy soap bubbles."
                },
                {
                    "step": 2,
                    "title": "Rub Hands Together",
                    "description": "Scrub palms, fingers, and back of hands thoroughly.",
                    "visual_cue": "Child scrubbing soapy hands together vigorously."
                },
                {
                    "step": 3,
                    "title": "Rinse & Dry",
                    "description": "Rinse soap off with water and dry with clean paper towel.",
                    "visual_cue": "Child drying clean hands with a white towel."
                }
            ]
        })

        steps = VisualAidGeneratorService.decompose_goal_into_steps(
            goal_text="Wash hands independently",
            extra_prompt="Use liquid soap dispenser",
            category="Daily Living Skills"
        )

        self.assertEqual(len(steps), 3)
        self.assertEqual(steps[0]["step"], 1)
        self.assertEqual(steps[0]["title"], "Turn on Water & Apply Soap")
        self.assertIn("soap bubbles", steps[0]["visual_cue"])
        self.assertEqual(steps[1]["step"], 2)
        self.assertEqual(steps[2]["step"], 3)
        self.assertEqual(steps[2]["title"], "Rinse & Dry")

    # ── Unit Test 2: Heuristic Fallback when AI fails ─────────────────────────
    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception("API Error"))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception("Groq Offline"))
    def test_decompose_goal_fallback_heuristics(self, mock_groq, mock_gemini):
        steps = VisualAidGeneratorService.decompose_goal_into_steps(
            goal_text="Hold spoon and eat",
            extra_prompt="",
            category="Daily Living Skills"
        )

        self.assertEqual(len(steps), 3)
        self.assertEqual(steps[0]["step"], 1)
        self.assertEqual(steps[1]["step"], 2)
        self.assertEqual(steps[2]["step"], 3)
        for s in steps:
            self.assertTrue(s["title"])
            self.assertTrue(s["description"])
            self.assertTrue(s["visual_cue"])

    # ── Unit Test 3: Composite Storyboard Prompt Construction ─────────────────
    def test_build_composite_storyboard_prompt(self):
        steps = [
            {"step": 1, "title": "Hold Spoon", "description": "Grasp spoon handle securely.", "visual_cue": "Child holding spoon handle"},
            {"step": 2, "title": "Scoop Food", "description": "Scoop food into spoon bowl.", "visual_cue": "Spoon lifting peas from plate"},
            {"step": 3, "title": "Bring to Mouth", "description": "Bring spoon up to mouth.", "visual_cue": "Child putting spoon in mouth"}
        ]
        prompt = VisualAidGeneratorService.build_prompt(
            goal_text="Eat with utensils",
            extra_prompt="Use pediatric spoon",
            category="Self Care",
            steps=steps
        )

        self.assertIn("Educational visual aid for an elementary learner", prompt)
        self.assertIn("IEP Goal: Eat with utensils", prompt)
        self.assertIn("3-panel horizontal sequential comic strip", prompt)
        self.assertIn("Panel 1 (Step 1 - Hold Spoon)", prompt)
        self.assertIn("Panel 2 (Step 2 - Scoop Food)", prompt)
        self.assertIn("Panel 3 (Step 3 - Bring to Mouth)", prompt)
        self.assertIn("flat vector illustration", prompt)

    # ── Unit Test 4: Imagen 3 Generation Mock ─────────────────────────────────
    @override_settings(GEMINI_API_KEY="test-valid-gemini-key")
    @patch('resources.views.http_client.post')
    def test_fetch_image_from_imagen_success(self, mock_post):
        fake_b64 = base64.b64encode(b"fake-image-bytes").decode('utf-8')
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "predictions": [
                {
                    "bytesBase64Encoded": fake_b64,
                    "mimeType": "image/jpeg"
                }
            ]
        }
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp

        result = VisualAidGeneratorService.fetch_image_from_imagen("Test composite prompt")
        self.assertTrue(result.startswith("data:image/jpeg;base64,"))
        self.assertIn(fake_b64, result)

    # ── Unit Test 5: Fallback to Pollinations when Imagen & HF fail ──────────
    @override_settings(GEMINI_API_KEY="test-valid-gemini-key", HF_TOKEN="test-valid-hf-token")
    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_imagen', side_effect=Exception("Imagen Quota Exceeded"))
    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_hf', side_effect=Exception("HF Rate Limited"))
    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_pollinations')
    def test_fetch_image_fallback_to_pollinations(self, mock_polli, mock_hf, mock_imagen):
        mock_polli.return_value = (b"bytes", "image/jpeg", "https://image.pollinations.ai/prompt/fallback")
        url = VisualAidGeneratorService.fetch_image("Test prompt")
        self.assertEqual(url, "https://image.pollinations.ai/prompt/fallback")

    # ── Unit Test 5b: Hugging Face FLUX.1 Inference Mock ─────────────────────
    @override_settings(HF_TOKEN="test-valid-hf-token", HF_IMAGE_MODEL="black-forest-labs/FLUX.1-schnell")
    def test_fetch_image_from_hf_success(self):
        from PIL import Image
        mock_client = MagicMock()
        mock_img = Image.new('RGB', (100, 100), color=(0, 255, 0))
        mock_client.text_to_image.return_value = mock_img

        mock_hub = MagicMock()
        mock_hub.InferenceClient.return_value = mock_client

        with patch.dict('sys.modules', {'huggingface_hub': mock_hub}):
            result = VisualAidGeneratorService.fetch_image_from_hf("Educational cartoon cat")
            self.assertTrue(result.startswith("data:image/jpeg;base64,"))
            mock_client.text_to_image.assert_called_once()

    # ── Unit Test 5c: HF FLUX.1 preferred when GEMINI_API_KEY is unset ───────
    @override_settings(GEMINI_API_KEY="", HF_TOKEN="test-valid-hf-token")
    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_hf')
    def test_fetch_image_uses_hf_when_no_gemini_key(self, mock_hf):
        mock_hf.return_value = "data:image/jpeg;base64,mockhfimage"
        url = VisualAidGeneratorService.fetch_image("Test prompt")
        self.assertEqual(url, "data:image/jpeg;base64,mockhfimage")
        mock_hf.assert_called_once_with("Test prompt")

    # ── Unit Test 6: GenerateVisualAidAPIView with 3-Step Payload ─────────────
    @patch('resources.views.VisualAidGeneratorService.decompose_goal_into_steps')
    @patch('resources.views.VisualAidGeneratorService.fetch_image')
    def test_generate_visual_aid_api_view_success(self, mock_image, mock_decomp):
        mock_decomp.return_value = [
            {"step": 1, "title": "Turn On Water", "description": "Turn on faucet and wet hands.", "visual_cue": "Hands under water"},
            {"step": 2, "title": "Apply Soap", "description": "Pump soap and lather bubbles.", "visual_cue": "Soapy lather"},
            {"step": 3, "title": "Rinse & Dry", "description": "Rinse off soap and dry hands.", "visual_cue": "Drying with towel"}
        ]
        mock_image.return_value = "https://image.pollinations.ai/prompt/test-strip"

        self._auth(self.token1)
        response = self.client.post('/api/resources/generate-visual-aid/', {
            "iep_goal_id": self.goal1.pk,
            "prompt": "Focus on turning off the faucet too",
            "category": "Hygiene"
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("data", {})
        self.assertIn("visualAidID", data)
        self.assertTrue(data["imageUrl"].startswith("data:image/jpeg;base64,") or "pollinations" in data["imageUrl"])
        self.assertIn("steps_data", data)
        self.assertEqual(len(data["steps_data"]), 3)
        self.assertEqual(data["steps_data"][0]["title"], "Turn On Water")
        self.assertEqual(data["steps_data"][0]["imageUrl"], "https://image.pollinations.ai/prompt/test-strip")
        self.assertEqual(data["steps_data"][1]["imageUrl"], "https://image.pollinations.ai/prompt/test-strip")
        self.assertEqual(data["steps_data"][2]["imageUrl"], "https://image.pollinations.ai/prompt/test-strip")

        # Verify database record
        aid = VisualAid.objects.get(pk=data["visualAidID"])
        self.assertEqual(len(aid.steps_data), 3)
        self.assertEqual(aid.steps_data[0]["imageUrl"], "https://image.pollinations.ai/prompt/test-strip")

    # ── Unit Test 6b: Generate Visual Aid Draft (Unsaved) ─────────────────────
    @patch('resources.views.VisualAidGeneratorService.decompose_goal_into_steps')
    @patch('resources.views.VisualAidGeneratorService.fetch_image')
    def test_generate_visual_aid_api_view_draft_not_saved(self, mock_image, mock_decomp):
        mock_decomp.return_value = [
            {"step": 1, "title": "Turn On Water", "description": "Turn on faucet and wet hands.", "visual_cue": "Hands under water"},
            {"step": 2, "title": "Apply Soap", "description": "Pump soap and lather bubbles.", "visual_cue": "Soapy lather"},
            {"step": 3, "title": "Rinse & Dry", "description": "Rinse off soap and dry hands.", "visual_cue": "Drying with towel"}
        ]
        mock_image.return_value = "https://image.pollinations.ai/prompt/test-strip"

        initial_count = VisualAid.objects.count()
        self._auth(self.token1)
        response = self.client.post('/api/resources/generate-visual-aid/', {
            "iep_goal_id": self.goal1.pk,
            "prompt": "",
            "category": "Hygiene",
            "save_to_db": False
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", {})
        self.assertIsNone(data.get("visualAidID"))
        self.assertTrue(data.get("isDraft"))
        self.assertEqual(len(data.get("steps_data", [])), 3)
        self.assertEqual(VisualAid.objects.count(), initial_count)

    # ── Unit Test 6c: Step Prompt Construction and Panel Stitching ───────────
    def test_build_step_prompt_and_stitching(self):
        step = {
            "step": 1,
            "title": "Turn on Water",
            "visual_cue": "Child hands under faucet with foam"
        }
        prompt = VisualAidGeneratorService.build_step_prompt(step, category="Hygiene", extra_prompt="Warm water")
        self.assertIn("Step 1: Turn on Water", prompt)
        self.assertIn("Action: Child hands under faucet with foam", prompt)
        self.assertIn("Skill category: Hygiene", prompt)
        self.assertIn("Context: Warm water", prompt)
        self.assertIn("flat vector illustration", prompt)

        # Stitching 3 tiny base64 images
        import base64
        import io
        from PIL import Image

        img = Image.new('RGB', (100, 100), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        tiny_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')

        steps = [
            {"step": 1, "imageUrl": tiny_b64},
            {"step": 2, "imageUrl": tiny_b64},
            {"step": 3, "imageUrl": tiny_b64},
        ]
        stitched = VisualAidGeneratorService.stitch_three_panels(steps)
        self.assertTrue(stitched.startswith("data:image/jpeg;base64,"))

    # ── Unit Test 7: PATCH VisualAid to edit step captions ────────────────────
    def test_patch_visual_aid_editable_captions(self):
        aid = VisualAid.objects.create(
            iep_goal=self.goal1,
            title="Leo Miller Visual Aid",
            imageUrl="https://image.pollinations.ai/prompt/sample",
            steps_data=[
                {"step": 1, "title": "Original Step 1", "description": "Original desc 1"},
                {"step": 2, "title": "Original Step 2", "description": "Original desc 2"},
                {"step": 3, "title": "Original Step 3", "description": "Original desc 3"}
            ]
        )

        self._auth(self.token1)
        new_steps = [
            {"step": 1, "title": "Turn On Warm Water", "description": "Gently twist tap for warm water."},
            {"step": 2, "title": "Use Foaming Soap", "description": "One pump of foaming soap."},
            {"step": 3, "title": "Dry with Paper Towel", "description": "Pat hands dry and discard towel."}
        ]
        response = self.client.patch(f'/api/resources/visual-aids/{aid.pk}/', {
            "steps_data": new_steps,
            "title": "Leo Miller Customized Handwashing Strip"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        aid.refresh_from_db()
        self.assertEqual(aid.title, "Leo Miller Customized Handwashing Strip")
        self.assertEqual(aid.steps_data[0]["title"], "Turn On Warm Water")
        self.assertEqual(aid.steps_data[2]["title"], "Dry with Paper Towel")

    # ── Unit Test 8: Tenant isolation on PATCH VisualAid ──────────────────────
    def test_cross_teacher_cannot_patch_visual_aid(self):
        aid = VisualAid.objects.create(
            iep_goal=self.goal1,
            title="Leo Miller Visual Aid",
            imageUrl="https://image.pollinations.ai/prompt/sample",
            steps_data=[{"step": 1, "title": "Step 1"}]
        )

        # Authenticate as Teacher 2 (who does not own Teacher 1's student)
        self._auth(self.token2)
        response = self.client.patch(f'/api/resources/visual-aids/{aid.pk}/', {
            "title": "Hacked Title"
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        aid.refresh_from_db()
        self.assertEqual(aid.title, "Leo Miller Visual Aid")

    # ── Unit Test 9: PDF Export Engine with Base64 Data URI & 3-Step Cards ───
    def test_pdf_export_engine_compilation_with_data_uri(self):
        # 1x1 transparent GIF encoded in base64
        tiny_gif_b64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        data_uri = f"data:image/gif;base64,{tiny_gif_b64}"

        aid = VisualAid.objects.create(
            iep_goal=self.goal1,
            title="3-Step Handwashing Flashcard Strip",
            imageUrl=data_uri,
            prompt_used="3-panel storyboard comic strip",
            steps_data=[
                {"step": 1, "title": "Step 1: Soap", "description": "Apply soap to wet palms."},
                {"step": 2, "title": "Step 2: Scrub", "description": "Scrub hands for 20 seconds."},
                {"step": 3, "title": "Step 3: Dry", "description": "Dry hands thoroughly."}
            ]
        )

        pdf_stream = PDFExportEngine.compile_pdf(aid)
        pdf_bytes = pdf_stream.read()
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'))
        self.assertGreater(len(pdf_bytes), 1000)

    # ── Unit Test 10: PDF Export Endpoint ────────────────────────────────────
    def test_export_visual_aid_api_endpoint(self):
        aid = VisualAid.objects.create(
            iep_goal=self.goal1,
            title="Test Handwashing Export",
            imageUrl="https://invalid-host-so-it-skips-fetch.com/dummy.jpg",
            steps_data=[{"step": 1, "title": "S1", "description": "D1"}]
        )

        self._auth(self.token1)
        response = self.client.get(f'/api/resources/export-visual-aid/{aid.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn(f'VisualAid_{aid.pk}.pdf', response['Content-Disposition'])
