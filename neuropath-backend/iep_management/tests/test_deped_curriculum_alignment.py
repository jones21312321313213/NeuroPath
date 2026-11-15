from django.test import SimpleTestCase
from iep_management.deped_curriculum import (
    CANONICAL_GOAL_AREAS,
    DEPED_TRANSITION_CURRICULUM,
    extract_deped_code,
    get_curriculum_prompt_block,
    get_default_competencies_for_area,
    ensure_valid_deped_enroute_objective,
)


class DepEdCurriculumCatalogUnitTests(SimpleTestCase):
    def test_all_five_canonical_goal_areas_have_official_competencies(self):
        expected_areas = (
            "Mathematical Skills",
            "Functional Academic Skills",
            "Communication Skills",
            "Social / Interpersonal Skills",
            "Behavioral Skills",
        )
        self.assertEqual(CANONICAL_GOAL_AREAS, expected_areas)
        for area in expected_areas:
            self.assertIn(area, DEPED_TRANSITION_CURRICULUM)
            entries = DEPED_TRANSITION_CURRICULUM[area]
            self.assertGreaterEqual(len(entries), 6, f"Expected >= 6 competencies for {area}")
            for item in entries:
                self.assertIn("code", item)
                self.assertIn("competency", item)
                self.assertRegex(item["code"], r"^TP(?:CS|LS|EP|_EFP|_MFP|_SFP)[A-Za-z0-9_.-]+-NG-[0-9.]+$")
                self.assertTrue(len(item["competency"].strip()) > 5)

    def test_extract_deped_code_recognizes_only_catalog_validated_codes(self):
        self.assertEqual(
            extract_deped_code("Recognizing numbers from 0-10\n(TP_MFP-nv-NG-1)"),
            "TP_MFP-nv-NG-1",
        )
        self.assertEqual(
            extract_deped_code("Listening attentively to short stories (TPLS_CS-li-NG-4)"),
            "TPLS_CS-li-NG-4",
        )
        # Hallucinated or non-existent code must return None
        self.assertIsNone(extract_deped_code("Doing math tasks (TP_FAKE-xx-NG-999)"))
        self.assertIsNone(extract_deped_code("Uncoded generic objective statement"))

    def test_ensure_valid_deped_enroute_objective_preserves_valid_code_on_newline(self):
        raw = "Recognizing numbers from 0-10 (TP_MFP-nv-NG-1)"
        normalized = ensure_valid_deped_enroute_objective(raw, "Mathematical Skills", row_index=0)
        self.assertEqual(normalized, "Recognizing numbers from 0-10\n(TP_MFP-nv-NG-1)")

    def test_ensure_valid_deped_enroute_objective_attaches_deterministic_code_when_missing(self):
        raw = "Counting and identifying numbers 1 to 10 using counters"
        normalized = ensure_valid_deped_enroute_objective(raw, "Mathematical Skills", row_index=0)
        lines = normalized.splitlines()
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0], "Counting and identifying numbers 1 to 10 using counters")
        self.assertIsNotNone(extract_deped_code(normalized))
        self.assertTrue(lines[1].startswith("(TP_"))

    def test_ensure_valid_deped_enroute_objective_replaces_hallucinated_code(self):
        raw = "Following 1-to-2 step verbal directions during classroom routines\n(TP_HALLUCINATED-99)"
        normalized = ensure_valid_deped_enroute_objective(raw, "Behavioral Skills", row_index=1)
        self.assertNotIn("TP_HALLUCINATED-99", normalized)
        code = extract_deped_code(normalized)
        self.assertIsNotNone(code)
        self.assertTrue(normalized.endswith(f"\n({code})"))

    def test_get_curriculum_prompt_block_excludes_raw_goal_area_name_and_lists_codes(self):
        for area in CANONICAL_GOAL_AREAS:
            block = get_curriculum_prompt_block(area)
            self.assertNotIn(area, block)
            self.assertIn("-NG-", block)
            defaults = get_default_competencies_for_area(area, count=3)
            self.assertEqual(len(defaults), 3)


import json
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal
from iep_management.views import GenerateIEPGoalsFromIEPView


class DepEdObjectiveGenerationAndFallbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="sped_deped@test.com",
            email="sped_deped@test.com",
            password="Password123!",
        )
        self.teacher = Teacher.objects.create(
            name="Teacher DepEd",
            email="sped_deped@test.com",
            passwordHash="hash",
        )
        self.student = StudentProfile.objects.create(
            name="Mateo Cruz",
            age=9,
            grade=3,
            teacher=self.teacher,
            diagnosis="Autism Spectrum Disorder",
            support_needs="Visual counters and structured routine",
            parental_consent_obtained=True,
            guardian_name="Elena Cruz",
            consent_date="2026-10-01",
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            accommodations="Visual number line, tactile counters",
            difficulties="Difficulty in counting and recognizing numbers",
            learning_barriers="Moderate barrier",
            learning_facilitators="SPED Teacher, Parents/Guardians",
        )
        self.client.force_authenticate(user=self.user)

    @patch("iep_management.ai_engine.AIEngineService.generate_text")
    def test_step_b_system_prompt_includes_deped_catalog_and_normalizes_uncoded_llm_rows(self, mock_gen):
        mock_gen.return_value = (
            json.dumps([
                {
                    "enroute_objectives": "Recognizing numbers from 0-10 using tactile counters",
                    "month_1_target": "Given tactile counters, recognize numbers 0-3 with 70% accuracy.",
                    "month_2_target": "Given tactile counters, recognize numbers 0-6 with 75% accuracy.",
                    "month_3_target": "Independently recognize numbers 0-10 with 80% accuracy.",
                },
                {
                    "enroute_objectives": "Performing single-digit addition with concrete objects\n(TP_FAKE-00)",
                    "month_1_target": "Add sums up to 5 with 70% accuracy.",
                    "month_2_target": "Add sums up to 8 with 75% accuracy.",
                    "month_3_target": "Add sums up to 10 with 80% accuracy.",
                },
            ]),
            "gemini",
        )
        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows(
            student_name="Learner (Grade 3)",
            difficulty="Difficulty in counting",
            assistive_tech="Tactile counters",
            annual_goal="Given tactile counters, the learner will count numbers 0-10 with 80% accuracy in 4 of 5 trials.",
            facilitators="SPED Teacher",
            goal_area="Mathematical Skills",
        )
        called_sys = mock_gen.call_args.kwargs.get("system_prompt", "")
        self.assertIn("DepEd Order No. 021, s. 2020", called_sys)
        self.assertIn("TP_MFP-nv-NG-1", called_sys)
        self.assertNotIn("Mathematical Skills", called_sys)

        self.assertEqual(len(rows), 2)
        for row in rows:
            code = extract_deped_code(row["enroute_objectives"])
            self.assertIsNotNone(code)
            self.assertTrue(row["enroute_objectives"].endswith(f"\n({code})"))
            self.assertIn("based on learner's ability", row["timeline_mins_session"])

    def test_build_safe_objective_rows_returns_coded_deped_rows_for_all_five_goal_areas(self):
        view = GenerateIEPGoalsFromIEPView()
        for area in CANONICAL_GOAL_AREAS:
            rows = view._build_safe_objective_rows(
                goal_area=area,
                difficulty="Targeted skill need",
                assistive_tech="Visual supports",
                facilitators="SPED Teacher, Parents/Guardians",
            )
            self.assertEqual(len(rows), 3)
            for row in rows:
                code = extract_deped_code(row["enroute_objectives"])
                self.assertIsNotNone(code, f"Missing valid DepEd code in safe fallback row for {area}")
                self.assertIn("\n(", row["enroute_objectives"])

    def test_custom_manual_goal_saved_via_api_preserves_teacher_free_text_without_ai_overwrite(self):
        goal_payload = {
            "iep": self.iep.pk,
            "subject_category": "Custom Teacher Goal",
            "goalName": "Custom Teacher Goal",
            "annual_goal": "The learner will organize personal art supplies after class.",
            "target_metric": "Teacher observation",
            "objective_rows": [
                {
                    "enroute_objectives": "Place crayons inside the labeled pouch",
                    "month_1_target": "With hand-over-hand prompt",
                    "month_2_target": "With verbal reminder",
                    "month_3_target": "Independently after art activity",
                    "interventions_procedures": "Labeled storage bins",
                    "timeline_mins_session": "10 mins daily",
                    "individuals_responsible": "SPED Teacher",
                    "progress_instructional": "Checklist",
                    "remarks": "Custom manual entry",
                }
            ],
        }
        res = self.client.post("/api/iep/goals/", goal_payload, format="json")
        self.assertEqual(res.status_code, 201)
        saved_obj = res.json()["objective_rows"][0]["enroute_objectives"]
        self.assertEqual(saved_obj, "Place crayons inside the labeled pouch")


from iep_management.models import IEPObjectiveRow
from iep_management.views import IEPBinaryReportRenderEngine


class DepEdPDFExportRenderingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="pdf_deped@test.com",
            email="pdf_deped@test.com",
            password="Password123!",
        )
        self.teacher = Teacher.objects.create(
            name="Teacher PDF",
            email="pdf_deped@test.com",
            passwordHash="hash",
        )
        self.student = StudentProfile.objects.create(
            name="Lucas Santos",
            age=10,
            grade=4,
            teacher=self.teacher,
            diagnosis="Autism Spectrum Disorder",
            parental_consent_obtained=True,
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            program_type="Non-Graded",
            difficulties="Difficulty in counting",
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            subject_category="Mathematical Skills",
            annual_goal="Given visual counters, the learner will count numbers 0-10 with 80% accuracy.",
        )

    def test_format_enroute_for_reportlab_escapes_xml_and_bolds_deped_code(self):
        malicious_enroute = "Recognizing <para><script>evil</script></para> numbers 0-10\n(TP_MFP-nv-NG-1)"
        formatted = IEPBinaryReportRenderEngine._format_enroute_for_reportlab(malicious_enroute)
        self.assertNotIn("<script>", formatted)
        self.assertIn("&lt;script&gt;", formatted)
        self.assertIn("<br/><b>(TP_MFP-nv-NG-1)</b>", formatted)

    def test_generate_iep_pdf_stream_succeeds_with_deped_coded_and_xml_payload_rows(self):
        IEPObjectiveRow.objects.create(
            parent_goal=self.goal,
            enroute_objectives="Recognizing numbers <0-10> & symbols\n(TP_MFP-nv-NG-1)",
            month_1_target="70% accuracy",
            month_2_target="75% accuracy",
            month_3_target="80% accuracy",
            interventions_procedures="(Mother Tongue / Visual Support) Tactile counters",
            timeline_mins_session="15-20 minutes every day (based on learner's ability)",
            individuals_responsible="SPED Teacher, Parents/Guardians",
            progress_instructional="Weekly checklist",
            remarks="On track",
        )
        stream = IEPBinaryReportRenderEngine.generate_iep_pdf_stream(self.iep)
        pdf_bytes = stream.getvalue()
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_bytes), 1000)

