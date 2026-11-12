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
