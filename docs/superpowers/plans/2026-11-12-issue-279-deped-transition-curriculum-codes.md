# Issue #279 — Align Section C Enroute Objectives with DepEd Order No. 021, s. 2020 K-12 Transition Curriculum SPED Codes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground all AI-generated and fallback Section C `ENROUTE OBJECTIVES / PROCEDURE` rows (`IEPObjectiveRow.enroute_objectives`) in official DepEd Order No. 021, s. 2020 (*K to 12 Transition Curriculum for Learners with Disabilities*) competencies and parenthesized SPED codes (e.g., `Recognizing numbers from 0-10\n(TP_MFP-nv-NG-1)`) across all 5 allowlisted Goal Areas, while preserving Step A SMART ABCD annual goal validation (`REQ-M2-08` to `REQ-M2-12`), Bundle 5 prompt-injection Spotlighting & XML sink guards (`DEF-01` to `DEF-05`), and zero database schema migrations.

**Architecture:**
1. Create a standalone curriculum catalog module (`neuropath-backend/iep_management/deped_curriculum.py`) mapping NeuroPath's 5 `ALLOWED_GOAL_AREAS` (`Mathematical Skills`, `Functional Academic Skills`, `Communication Skills`, `Social / Interpersonal Skills`, `Behavioral Skills`, plus their allowlisted aliases in `iep_management/views.py:859-880`) to official DepEd Order No. 021, s. 2020 competencies and SPED codes (`TP_MFP`, `TP_EFP`, `TP_SFP`, `TPLS`, `TPCS`, `TPEP`), paired with deterministic code extraction and normalization helpers (`get_curriculum_prompt_block`, `extract_deped_code`, `get_default_competencies_for_area`, `ensure_valid_deped_enroute_objective`).
2. Inject `get_curriculum_prompt_block(validated_goal_area)` into the immutable `system_prompt` of Step B (`_generate_objective_rows` at `iep_management/views.py:946-1099`), `GenerateIEPGoalAPIView` (`iep_management/views.py:495-564`), and single-goal regeneration (`iep_management/views.py:605-738, 790-856`) in `iep_management/views.py` (strictly adhering to `DEF-01` OpenAI Instruction Hierarchy without interpolating raw `goal_area` strings into `system_prompt` or touching `<untrusted_data_XXXX>` Spotlighting nonces), and post-process all returned/fallback objective rows through `ensure_valid_deped_enroute_objective()`.
3. Format the trailing parenthesized DepEd code cleanly in `IEPBinaryReportRenderEngine` (`iep_management/views.py:1152-1408`, converting `\n` to `<br/>` and bolding `(\([A-Z0-9_.-]+\))` after `escape_reportlab_text()` per `DEF-05`) and preserve multi-line code display (`whitespace-pre-line`) in `IepGenerationPage.jsx` (`303-381`) and `ViewStudentRecords.jsx` (`133-195`).

**Tech Stack:** Python 3.12+, Django 6.0.5, Django REST Framework, ReportLab, React 19 + Vite, Vitest + React Testing Library, Ruff / ESLint.

---

## Global Constraints

- **Zero Database Migrations:** Do NOT alter `IEPModel`, `IEPGoal`, or `IEPObjectiveRow` in `neuropath-backend/iep_management/models.py` and do NOT generate any migration files. Store the harvested competency and parenthesized code inside the existing `IEPObjectiveRow.enroute_objectives` `TextField` (`iep_management/models.py:86`).
- **Preserve Bundle 5 Security Controls (`DEF-01` to `DEF-05`):**
  - `goal_area` must be validated via `_validate_goal_area()` (`iep_management/views.py:882-889`) against `ALLOWED_GOAL_AREAS` (`iep_management/views.py:859-880`) before looking up the curriculum block.
  - Trusted DepEd curriculum blocks must be placed exclusively in `system_prompt` (`DEF-01`) without interpolating the raw `goal_area` label into `system_prompt`; untrusted student PLAAFP and teacher guidance must remain wrapped in per-request Spotlighting `<untrusted_data_XXXX>` nonces (`iep_management/ai_engine.py:34-59`) with `scrub_pii_from_text()` (`iep_management/privacy_utils.py:64-116`, `DEF-02`).
  - Step A (`_generate_annual_goal` at `iep_management/views.py:891-943`) must continue enforcing `[Audience]`, `[Behavior]`, `[Condition]`, `[Degree]` brackets and deterministic `RGORICheckerService.audit_goal_explainable()` (`total_score >= 65` at `iep_management/views.py:810-825`) before chaining into Step B (`DEF-03` & `DEF-04`).
  - ReportLab PDF rendering in `IEPBinaryReportRenderEngine` (`iep_management/views.py:1152-1408`) must call `escape_reportlab_text()` on raw text before inserting `<br/>` or `<b>` tags around the validated DepEd code (`DEF-05`).
- **Preserve Custom Manual Goals:** Teacher-created manual goals (`+ Add Goal Manually` in `IepGenerationPage.jsx:2824-2914, 4003-4150`) saved directly via `StandaloneIEPGoalViewSet` (`iep_management/views.py:335-388`), `IEPDataSerializer`, or `IEPEditAPIView` (`iep_management/views.py:255-313`) must NOT be overwritten by AI curriculum normalization unless explicitly regenerated via AI endpoints.
- **TDD Discipline:** Write the failing test first, run the test runner to verify RED failure, write the minimal implementation, verify GREEN pass, and commit after each task.

---

## File Structure

| File | Responsibility / Changes |
| :--- | :--- |
| `neuropath-backend/iep_management/deped_curriculum.py` | **Create.** Authoritative DepEd Order No. 021, s. 2020 competency catalog for all 5 `ALLOWED_GOAL_AREAS` (and aliases), plus `get_curriculum_prompt_block()`, `extract_deped_code()`, `get_default_competencies_for_area()`, and `ensure_valid_deped_enroute_objective()`. |
| `neuropath-backend/iep_management/privacy_utils.py` | **Modify (`lines 1-134`).** Export `escape_reportlab_text(val)` stripping XML-illegal ASCII control chars and applying `html.escape()` for shared ReportLab sink safety across `iep_management` and `resources`. |
| `neuropath-backend/iep_management/views.py` | **Modify (`lines 495-564, 779-889, 946-1099, 1152-1408`).** Inject `get_curriculum_prompt_block()` into Step B `_generate_objective_rows()`, `GenerateIEPGoalAPIView`, and single-goal regeneration `system_prompt`; post-process rows with `ensure_valid_deped_enroute_objective()`; add `_build_safe_objective_rows()` with official DepEd codes; update `IEPBinaryReportRenderEngine` to render `<br/><b>(CODE)</b>` safely after `escape_reportlab_text()`. |
| `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py` | **Create.** Unit and API integration tests covering catalog completeness across all 5 goal areas, deterministic code normalization on missing/hallucinated LLM codes, Step B prompt grounding, safe fallback rows, custom manual goal preservation, and XML-safe ReportLab PDF rendering. |
| `neuropath-frontend/src/pages/IepGenerationPage.jsx` | **Modify (`lines 303-381`).** Apply `whitespace-pre-line` and clean parenthesized `(TP_...)` code emphasis on `enroute_objectives` cells in Section C `ReadOnlyGoalTable` (`lines 346-350`) so the competency and `(TP_...)` code render cleanly on separate lines. |
| `neuropath-frontend/src/pages/ViewStudentRecords.jsx` | **Modify (`lines 133-195`).** Apply `whitespace-pre-line` and code line formatting on `enroute_objectives` cells in `GoalTable` (`lines 160-164`) in the Student Records view/print layout. |
| `neuropath-frontend/src/pages/IepGenerationPage.test.jsx` | **Modify (`lines 2127-2210`).** Add unit test verifying multi-line DepEd competency and `(TP_MFP-nv-NG-1)` code rendering in Section C. |

---

### Task 1: Authoritative DepEd Order No. 021, s. 2020 Catalog & Deterministic Normalizer (`deped_curriculum.py`)

**Files:**
- Create: `neuropath-backend/iep_management/deped_curriculum.py`
- Create: `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`

**Interfaces:**
- Consumes: `ALLOWED_GOAL_AREAS` from `iep_management.views.GenerateIEPGoalsFromIEPView` (`iep_management/views.py:859-880`)
- Produces:
  - `CANONICAL_GOAL_AREAS: tuple[str, ...]`
  - `DEPED_TRANSITION_CURRICULUM: dict[str, list[dict[str, str]]]`
  - `get_curriculum_prompt_block(goal_area: str) -> str`
  - `extract_deped_code(text: str) -> Optional[str]`
  - `get_default_competencies_for_area(goal_area: str, count: int = 3) -> list[dict[str, str]]`
  - `ensure_valid_deped_enroute_objective(enroute_text: str, goal_area: str, row_index: int = 0) -> str`

- [ ] **Step 1: Write the failing unit tests in `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`**

Create `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run:
```bash
python neuropath-backend/manage.py test iep_management.tests.test_deped_curriculum_alignment
```
Expected: FAIL with `ModuleNotFoundError: No module named 'iep_management.deped_curriculum'`.

- [ ] **Step 3: Write minimal implementation in `neuropath-backend/iep_management/deped_curriculum.py`**

Create `neuropath-backend/iep_management/deped_curriculum.py`:
```python
import re
from typing import Optional

CANONICAL_GOAL_AREAS: tuple[str, ...] = (
    "Mathematical Skills",
    "Functional Academic Skills",
    "Communication Skills",
    "Social / Interpersonal Skills",
    "Behavioral Skills",
)

GOAL_AREA_ALIASES: dict[str, str] = {
    "mathematical skills": "Mathematical Skills",
    "mathematics": "Mathematical Skills",
    "math": "Mathematical Skills",
    "functional academic skills": "Functional Academic Skills",
    "functional skills": "Functional Academic Skills",
    "literacy skills": "Functional Academic Skills",
    "reading and writing": "Functional Academic Skills",
    "reading": "Functional Academic Skills",
    "communication skills": "Communication Skills",
    "communication": "Communication Skills",
    "social / interpersonal skills": "Social / Interpersonal Skills",
    "social-emotional skills": "Social / Interpersonal Skills",
    "social skills": "Social / Interpersonal Skills",
    "behavioral skills": "Behavioral Skills",
    "care skills": "Behavioral Skills",
    "self-care skills": "Behavioral Skills",
    "daily living skills": "Behavioral Skills",
    "motor skills": "Behavioral Skills",
    "fine and gross motor skills": "Behavioral Skills",
    "sensory regulation": "Behavioral Skills",
}

DEPED_TRANSITION_CURRICULUM: dict[str, list[dict[str, str]]] = {
    "Mathematical Skills": [
        {
            "code": "TP_MFP-nv-NG-1",
            "competency": "Recognizing numbers from 0-10 and associating quantities with numerals",
            "package": "Functional Academics - Mathematics (Number Values)",
        },
        {
            "code": "TP_MFP-nv-NG-5",
            "competency": "Counting and grouping concrete objects up to 20 using tactile and visual counters",
            "package": "Functional Academics - Mathematics (Number Values)",
        },
        {
            "code": "TP_MFP-nv-NG-18",
            "competency": "Identifying and sorting Philippine coins and paper bills in practical tasks",
            "package": "Functional Academics - Mathematics (Money & Number Values)",
        },
        {
            "code": "TP_MFP-fo-NG-1",
            "competency": "Performing single-digit addition and combining sets using concrete manipulatives",
            "package": "Functional Academics - Mathematics (Fundamental Operations)",
        },
        {
            "code": "TP_MFP-fo-NG-8",
            "competency": "Solving simple subtraction situations using visual and tactile objects",
            "package": "Functional Academics - Mathematics (Fundamental Operations)",
        },
        {
            "code": "TP_MFP-fr-NG-1",
            "competency": "Identifying wholes and halves in everyday classroom objects and food items",
            "package": "Functional Academics - Mathematics (Fractions)",
        },
        {
            "code": "TP_MFP-ge-NG-1",
            "competency": "Identifying and sorting basic 2D shapes and sizes in the environment",
            "package": "Functional Academics - Mathematics (Geometry)",
        },
        {
            "code": "TP_MFP-sp-NG-1",
            "competency": "Completing and extending simple repeating sequences and visual patterns",
            "package": "Functional Academics - Mathematics (Sequences & Patterns)",
        },
        {
            "code": "TP_MFP-al-NG-1",
            "competency": "Finding missing elements in simple concrete number sentences",
            "package": "Functional Academics - Mathematics (Algebra)",
        },
        {
            "code": "TP_MFP-me-NG-2",
            "competency": "Comparing lengths, weights, and time intervals using daily schedules",
            "package": "Functional Academics - Mathematics (Mensuration)",
        },
        {
            "code": "TP_MFP-dp-NG-1.1",
            "competency": "Reading and organizing simple pictographs and classroom tally charts",
            "package": "Functional Academics - Mathematics (Data & Probability)",
        },
        {
            "code": "TPLS_FL-pm-NG-2",
            "competency": "Demonstrating practical money handling during simulated buying and selling",
            "package": "Life Skills - Functional Literacy (Practical Money)",
        },
    ],
    "Functional Academic Skills": [
        {
            "code": "TP_EFP-ak-NG-1",
            "competency": "Naming and matching uppercase and lowercase letters of the alphabet",
            "package": "Functional Academics - English (Alphabet Knowledge)",
        },
        {
            "code": "TP_EFP-pwr-NG-1",
            "competency": "Decoding and matching CVC words and common functional sight words",
            "package": "Functional Academics - English (Phonics & Word Recognition)",
        },
        {
            "code": "TP_EFP-v-NG-1",
            "competency": "Identifying familiar object labels, action words, and classroom vocabulary",
            "package": "Functional Academics - English (Vocabulary)",
        },
        {
            "code": "TP_EFP-bpk-NG-1",
            "competency": "Demonstrating book and print orientation from left to right and top to bottom",
            "package": "Functional Academics - English (Book & Print Knowledge)",
        },
        {
            "code": "TP_EFP-rc-NG-1",
            "competency": "Answering literal who, what, and where questions from picture stories",
            "package": "Functional Academics - English (Reading Comprehension)",
        },
        {
            "code": "TP_EFP-w-NG-1",
            "competency": "Tracing and copying functional words, personal name, and short labels",
            "package": "Functional Academics - English (Writing)",
        },
        {
            "code": "TPLS_CS-re-NG-1",
            "competency": "Reading and interpreting environmental print, safety signs, and symbols",
            "package": "Life Skills - Communication Skills (Functional Reading)",
        },
        {
            "code": "TPLS_CS-wr-NG-1",
            "competency": "Writing basic personal information on simplified functional forms",
            "package": "Life Skills - Communication Skills (Functional Writing)",
        },
        {
            "code": "TP_SFP-bp-NG-1",
            "competency": "Identifying main body parts and their basic functions using visual charts",
            "package": "Functional Academics - Science (Body Parts)",
        },
        {
            "code": "TP_SFP-po-NG-1",
            "competency": "Classifying physical objects by color, texture, shape, and size",
            "package": "Functional Academics - Science (Physical Objects)",
        },
        {
            "code": "TP_SFP-tw-NG-1",
            "competency": "Identifying daily weather conditions and appropriate clothing choices",
            "package": "Functional Academics - Science (The Weather)",
        },
    ],
    "Communication Skills": [
        {
            "code": "TPLS_CS-oc-NG-1",
            "competency": "Expressing basic personal needs and wants using verbal words, gestures, or AAC/PECS",
            "package": "Life Skills - Communication Skills (Oral Communication)",
        },
        {
            "code": "TPLS_CS-oc-NG-2",
            "competency": "Responding appropriately to greetings and familiar social questions",
            "package": "Life Skills - Communication Skills (Oral Communication)",
        },
        {
            "code": "TPLS_CS-li-NG-1",
            "competency": "Attending to speaker and responding to own name and basic auditory cues",
            "package": "Life Skills - Communication Skills (Listening)",
        },
        {
            "code": "TPLS_CS-li-NG-4",
            "competency": "Listening attentively and following 1-to-2 step routine instructions",
            "package": "Life Skills - Communication Skills (Listening)",
        },
        {
            "code": "TP_EFP-ol-NG-1",
            "competency": "Using polite expressions and functional phrases during classroom routines",
            "package": "Functional Academics - English (Oral Language)",
        },
        {
            "code": "TP_EFP-apd-NG-1",
            "competency": "Discriminating common environmental and speech sounds accurately",
            "package": "Functional Academics - English (Auditory Perception)",
        },
        {
            "code": "TP_EFP-pa-NG-6",
            "competency": "Producing initial letter sounds and blending simple spoken syllables",
            "package": "Functional Academics - English (Phonological Awareness)",
        },
        {
            "code": "TP_EFP-l-NG-3",
            "competency": "Identifying key details from short spoken instructions or stories",
            "package": "Functional Academics - English (Listening Comprehension)",
        },
        {
            "code": "TP_EFP-olf-NG-1",
            "competency": "Initiating and sustaining short functional exchanges with teacher and peers",
            "package": "Functional Academics - English (Oral Language Fluency)",
        },
    ],
    "Social / Interpersonal Skills": [
        {
            "code": "TPLS_CS-oc-NG-3",
            "competency": "Practicing turn-taking and waiting for one's turn during structured group interactions",
            "package": "Life Skills - Communication Skills (Social Nuances)",
        },
        {
            "code": "TPLS_CS-oc-NG-5",
            "competency": "Recognizing and respecting personal space and appropriate social boundaries",
            "package": "Life Skills - Communication Skills (Social Nuances)",
        },
        {
            "code": "TPLS_LE-lr-NG-1",
            "competency": "Participating cooperatively in structured leisure games and peer play",
            "package": "Life Skills - Leisure & Recreation",
        },
        {
            "code": "TPLS_PS-si-NG-2",
            "competency": "Identifying and expressing own basic emotions using visual emotion cards",
            "package": "Life Skills - Personal & Social (Self-Identity)",
        },
        {
            "code": "TPLS_PS-se-NG-1",
            "competency": "Demonstrating confidence and positive self-concept when completing group tasks",
            "package": "Life Skills - Personal & Social (Self-Esteem)",
        },
        {
            "code": "TPLS_PS-is-NG-4",
            "competency": "Sharing classroom materials and offering help to peers during activities",
            "package": "Life Skills - Personal & Social (Interpersonal Skills)",
        },
        {
            "code": "TPLS_HS-hu-NG-1",
            "competency": "Building positive peer relationships and cooperative classroom behavior",
            "package": "Life Skills - Human Sexuality & Relationships",
        },
        {
            "code": "TPLS_CM-cm-NG-7",
            "competency": "Observing classroom and school community rules during group transitions",
            "package": "Life Skills - Community Orientation",
        },
        {
            "code": "TPEP-mu-NG-5",
            "competency": "Participating in cooperative group music, rhythm, and movement routines",
            "package": "Enrichment Package - Music & Movement",
        },
        {
            "code": "TPEP-dc-NG-6",
            "competency": "Following synchronized group movement and expressive activities with peers",
            "package": "Enrichment Package - Dance & Movement",
        },
    ],
    "Behavioral Skills": [
        {
            "code": "TPCS_PH-ct-NG-3",
            "competency": "Performing independent handwashing and personal cleanliness routines",
            "package": "Care Skills - Personal Hygiene",
        },
        {
            "code": "TPCS_PH-to-NG-3",
            "competency": "Following structured toileting and self-care sequences with visual schedules",
            "package": "Care Skills - Personal Hygiene (Toileting)",
        },
        {
            "code": "TPCS_GG-gp-NG-3",
            "competency": "Demonstrating proper grooming and dressing routines in daily activities",
            "package": "Care Skills - Good Grooming",
        },
        {
            "code": "TPCS_NU-gh-NG-2",
            "competency": "Practicing appropriate mealtime behavior and independent utensil use",
            "package": "Care Skills - Nutrition & Mealtime Habits",
        },
        {
            "code": "TPCS_HC-hh-NG-3",
            "competency": "Putting away learning materials and keeping the classroom workspace orderly",
            "package": "Care Skills - Housekeeping & Orderliness",
        },
        {
            "code": "TPCS_PS-sp-NG-3",
            "competency": "Following classroom safety rules and staying within designated learning areas",
            "package": "Care Skills - Personal Safety",
        },
        {
            "code": "TPLS_CS-li-NG-4",
            "competency": "Complying with 1-to-2 step teacher directions and visual transition cues",
            "package": "Life Skills - Task Compliance & Listening",
        },
        {
            "code": "TPLS_HP-ps-NG-3",
            "competency": "Practicing self-regulation strategies and sensory breaks when frustrated",
            "package": "Life Skills - Health & Personal Safety",
        },
        {
            "code": "TPLS_MD-md-NG-1",
            "competency": "Demonstrating honesty, respect, and calm classroom conduct during tasks",
            "package": "Life Skills - Moral Development",
        },
        {
            "code": "TP_SFP-fd-NG-1",
            "competency": "Following sequential daily classroom schedules and routine transitions",
            "package": "Functional Academics - Science (Following Directions)",
        },
    ],
}

ALL_VALID_DEPED_CODES: dict[str, dict[str, str]] = {
    entry["code"].upper(): entry
    for entries in DEPED_TRANSITION_CURRICULUM.values()
    for entry in entries
}

CODE_PATTERN = re.compile(
    r"\(\s*(TP(?:CS|LS|EP|_EFP|_MFP|_SFP)[A-Za-z0-9_.-]+-NG-[0-9.]+)\s*\)",
    re.IGNORECASE,
)
ANY_PAREN_TP_PATTERN = re.compile(r"\(\s*TP[A-Za-z0-9_.-]*\s*\)", re.IGNORECASE)


def resolve_canonical_goal_area(goal_area: str) -> str:
    cleaned = (goal_area or "").strip().lower()
    return GOAL_AREA_ALIASES.get(cleaned, "Functional Academic Skills")


def get_default_competencies_for_area(goal_area: str, count: int = 3) -> list[dict[str, str]]:
    canonical = resolve_canonical_goal_area(goal_area)
    catalog = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    return list(catalog[: max(1, count)])


def get_curriculum_prompt_block(goal_area: str) -> str:
    """
    Returns the authoritative DepEd Order No. 021, s. 2020 K-12 Transition Curriculum
    block for injection into system_prompt. Deliberately excludes the raw goal_area
    string so client-supplied goal_area labels are never interpolated into system_prompt.
    """
    canonical = resolve_canonical_goal_area(goal_area)
    entries = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    lines = [
        "Official DepEd Order No. 021, s. 2020 K to 12 Transition Curriculum Competencies & SPED Codes "
        "(Harvest 2-3 developmentally sequential competencies from this official list and format each "
        "enroute_objectives value as '<Contextualized Competency>\\n(<Official DepEd Code>)'):"
    ]
    for item in entries:
        lines.append(f"- {item['competency']} ({item['code']})")
    return "\n".join(lines)


def extract_deped_code(text: str) -> Optional[str]:
    if not text:
        return None
    for match in CODE_PATTERN.finditer(str(text)):
        candidate = match.group(1).strip()
        canonical_entry = ALL_VALID_DEPED_CODES.get(candidate.upper())
        if canonical_entry:
            return canonical_entry["code"]
    return None


def _select_best_matching_entry(
    clean_statement: str, catalog: list[dict[str, str]], row_index: int = 0
) -> dict[str, str]:
    tokens = {
        tok
        for tok in re.findall(r"[a-z0-9]+", clean_statement.lower())
        if len(tok) > 2 and tok not in {"the", "and", "for", "with", "will", "learner", "student"}
    }
    best_entry = None
    best_score = 0
    for entry in catalog:
        comp_tokens = set(re.findall(r"[a-z0-9]+", entry["competency"].lower()))
        overlap = len(tokens & comp_tokens)
        if overlap > best_score:
            best_score = overlap
            best_entry = entry
    if best_entry is not None and best_score > 0:
        return best_entry
    return catalog[row_index % len(catalog)]


def ensure_valid_deped_enroute_objective(
    enroute_text: str, goal_area: str, row_index: int = 0
) -> str:
    """
    Validates that enroute_text ends with a newline + parenthesized official DepEd Order
    No. 021, s. 2020 SPED code from the catalog. Strips hallucinated/invalid (TP_...) codes
    and deterministically attaches an official code when missing or malformed.
    """
    canonical = resolve_canonical_goal_area(goal_area)
    catalog = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    raw = str(enroute_text or "").strip()
    valid_code = extract_deped_code(raw)

    # Strip any trailing/inline parenthesized TP codes to normalize cleanly
    statement = CODE_PATTERN.sub("", raw)
    statement = ANY_PAREN_TP_PATTERN.sub("", statement)
    statement = re.sub(r"\s+", " ", statement).strip(" \t\r\n-–—")

    if not valid_code:
        matched_entry = _select_best_matching_entry(statement, catalog, row_index=row_index)
        valid_code = matched_entry["code"]
        if not statement:
            statement = matched_entry["competency"]
    elif not statement:
        statement = ALL_VALID_DEPED_CODES[valid_code.upper()]["competency"]

    return f"{statement}\n({valid_code})"
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

Run:
```bash
python neuropath-backend/manage.py test iep_management.tests.test_deped_curriculum_alignment
```
Expected: PASS (6 tests passing).

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/deped_curriculum.py neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py
git commit -m "feat(iep): add DepEd Order No. 021 s. 2020 transition curriculum catalog and code normalizer"
```

---

### Task 2: Ground Step B Objective Row Synthesis, Safe Fallbacks & Single-Goal Regeneration in `iep_management/views.py`

**Files:**
- Modify: `neuropath-backend/iep_management/views.py:495-564, 779-856, 946-1099`
- Modify: `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`
- Modify: `neuropath-backend/iep_management/tests/test_rgori_resilience.py:138-140`

**Interfaces:**
- Consumes: `get_curriculum_prompt_block`, `ensure_valid_deped_enroute_objective`, `get_default_competencies_for_area` from `iep_management.deped_curriculum`
- Produces:
  - Grounded `IEPObjectiveRow` payloads in `_generate_objective_rows()` (`iep_management/views.py:946-1099`) where `enroute_objectives` always ends with `\n(<Official DepEd Code>)`
  - `_build_safe_objective_rows()` (`iep_management/views.py:790`) returning 3 deterministic DepEd-coded fallback objective rows for any of the 5 goal areas
  - DepEd-aligned default `interventions_procedures`, `timeline_mins_session`, `individuals_responsible`, and `progress_instructional` strings

- [ ] **Step 1: Write failing API & service tests in `test_deped_curriculum_alignment.py`**

Append to `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run:
```bash
python neuropath-backend/manage.py test iep_management.tests.test_deped_curriculum_alignment
```
Expected: FAIL (`AttributeError: 'GenerateIEPGoalsFromIEPView' object has no attribute '_build_safe_objective_rows'` and uncoded LLM rows).

- [ ] **Step 3: Write minimal implementation in `neuropath-backend/iep_management/views.py`**

1. Import the curriculum helpers at the top of `neuropath-backend/iep_management/views.py` (`lines 15-24`):
```python
from .deped_curriculum import (
    ensure_valid_deped_enroute_objective,
    get_curriculum_prompt_block,
    get_default_competencies_for_area,
)
```

2. Add `_build_safe_objective_rows` right below `_build_safe_abcd_annual_goal` (`iep_management/views.py:779-789`):
```python
    @classmethod
    def _build_safe_objective_rows(
        cls,
        goal_area: str = "",
        difficulty: str = "",
        assistive_tech: str = "",
        facilitators: str = "",
    ) -> list[dict]:
        validated_area = cls._validate_goal_area(goal_area) if goal_area else ""
        competencies = get_default_competencies_for_area(validated_area or difficulty, count=3)
        support_label = (assistive_tech or "Visual Support / Concrete Manipulatives").strip()
        responsible_label = (facilitators or "SPED Teacher, Parents/Guardians").strip()
        rows = []
        for idx, item in enumerate(competencies):
            comp_text = item["competency"]
            enroute_val = ensure_valid_deped_enroute_objective(
                f"{comp_text}\n({item['code']})",
                validated_area or difficulty,
                row_index=idx,
            )
            m1 = (
                f"Given {support_label} and direct physical/visual prompts, the learner will demonstrate "
                f"initial acquisition of {comp_text.lower()} with 70% accuracy."
            )
            m2 = (
                f"Given {support_label} and faded verbal/gestural cues, the learner will demonstrate "
                f"expanding mastery of {comp_text.lower()} with 75% accuracy."
            )
            m3 = (
                f"Given {support_label}, the learner will independently master {comp_text.lower()} "
                f"with 80% accuracy in 4 out of 5 trials."
            )
            int_text = (
                f"(Mother Tongue / Visual Support) Guided modeling and structured practice using "
                f"{support_label} (based on learner's ability)."
            )
            time_text = "15-20 minutes every day (based on learner's ability)"
            prog_text = "Weekly skill mastery checklist and work sample portfolio."
            rem_text = "Targeted for ongoing observation."
            rows.append({
                "enroute_objectives": enroute_val,
                "objective": enroute_val,
                "month_1_target": m1,
                "month_1": m1,
                "month1": m1,
                "month_2_target": m2,
                "month_2": m2,
                "month2": m2,
                "month_3_target": m3,
                "month_3": m3,
                "month3": m3,
                "interventions_procedures": int_text,
                "interventions": int_text,
                "intervention": int_text,
                "timeline_mins_session": time_text,
                "timeline": time_text,
                "individuals_responsible": responsible_label,
                "progress_instructional": prog_text,
                "remarks": rem_text,
            })
        return rows
```

3. Update `_generate_objective_rows` (`iep_management/views.py:946-1099`) to inject `get_curriculum_prompt_block(validated_goal_area)` into `system_prompt` and normalize each row's `enroute_objectives` via `ensure_valid_deped_enroute_objective`:
```python
        curriculum_block = get_curriculum_prompt_block(validated_goal_area)
        system_prompt = (
            "You are an expert Special Education teacher writing IEP objective rows for a 3-month quarterly term "
            "aligned with DepEd Order No. 021, s. 2020 (K to 12 Transition Curriculum for Learners with Disabilities). "
            "Output ONLY a valid JSON array of 2-3 objective row objects. "
            "Each object must have exactly these keys: "
            "enroute_objectives, month_1_target, month_2_target, month_3_target, "
            "interventions_procedures, timeline_mins_session, "
            "individuals_responsible, progress_instructional, remarks. "
            "For each row, harvest a developmentally sequential competency from the official DepEd Transition "
            "Curriculum catalog below and format enroute_objectives as '<Contextualized Competency>\\n(<Official DepEd Code>)' "
            "(for example: 'Recognizing numbers from 0-10\\n(TP_MFP-nv-NG-1)').\n"
            f"{curriculum_block}\n"
            "Milestones must map incremental progression across the 3-month quarter:\n"
            "- month_1_target: 1st Month milestone (baseline skill acquisition with direct prompts/cues and 70% accuracy).\n"
            "- month_2_target: 2nd Month milestone (intermediate skill progression with faded prompts/cues and 75% accuracy).\n"
            "- month_3_target: 3rd Month milestone (independent mastery with target bracket and 80% accuracy in 4 of 5 trials).\n"
            "Format interventions_procedures with instructional modality/language such as '(Mother Tongue / Visual Support) ... (based on learner\\'s ability)', "
            "timeline_mins_session such as '15-20 minutes every day (based on learner\\'s ability)', and "
            "individuals_responsible such as 'SPED Teacher, Parents/Guardians'. "
            "ALL objectives MUST be stepping-stone skills toward the PRIMARY Goal Area specified in the user prompt. "
            "Do NOT write objectives about any other domain. "
            "Do not include markdown, backticks, or any text outside the JSON array."
        )
```
And inside the `for idx, row in enumerate(parsed):` loop (`iep_management/views.py:1045-1091`):
```python
                for idx, row in enumerate(parsed):
                    if isinstance(row, dict) and (row.get("enroute_objectives") or row.get("objective")):
                        raw_obj_text = str(row.get("enroute_objectives") or row.get("objective", "")).strip()
                        obj_text = ensure_valid_deped_enroute_objective(
                            raw_obj_text,
                            validated_goal_area or difficulty,
                            row_index=idx,
                        )
                        ...
                        int_text = str(
                            row.get("interventions_procedures")
                            or row.get("interventions")
                            or row.get("intervention")
                            or f"(Mother Tongue / Visual Support) Use {assistive_tech or 'visual supports'} (based on learner's ability)"
                        ).strip()
                        time_text = str(
                            row.get("timeline_mins_session")
                            or row.get("timeline")
                            or "15-20 minutes every day (based on learner's ability)"
                        ).strip()
                        if "based on learner's ability" not in time_text.lower():
                            time_text = f"{time_text} (based on learner's ability)"
                        resp_text = str(
                            row.get("individuals_responsible")
                            or row.get("responsible")
                            or facilitators
                            or "SPED Teacher, Parents/Guardians"
                        ).strip()
```

4. Update `test_rgori_resilience.py:139` to verify the normalized DepEd code suffix on `rows[0]["enroute_objectives"]`:
```python
        self.assertTrue(
            rows[0]["enroute_objectives"].startswith("Marcus will match 5 sight words with 80% accuracy.")
        )
        self.assertIn("(TP_", rows[0]["enroute_objectives"])
```

- [ ] **Step 4: Run backend tests to verify GREEN and zero regressions**

Run:
```bash
python neuropath-backend/manage.py test iep_management
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py neuropath-backend/iep_management/tests/test_rgori_resilience.py
git commit -m "feat(iep): ground Step B objective rows and safe fallbacks in DepEd Order 021 s. 2020 codes"
```

---

### Task 3: XML-Safe ReportLab PDF Rendering for DepEd Enroute Objective Codes

**Files:**
- Modify: `neuropath-backend/iep_management/privacy_utils.py:1-134`
- Modify: `neuropath-backend/iep_management/views.py:1152-1408` (`IEPBinaryReportRenderEngine`)
- Modify: `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`

**Interfaces:**
- Consumes: `escape_reportlab_text` from `iep_management.privacy_utils`, `IEPObjectiveRow.enroute_objectives`
- Produces: Valid `%PDF-` binary stream via `GET /api/iep/<id>/export/` with XML-escaped text and `<br/><b>(CODE)</b>` formatting

- [ ] **Step 1: Write failing PDF export test in `test_deped_curriculum_alignment.py`**

Append to `neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py`:
```python
from iep_management.models import IEPObjectiveRow
from iep_management.views import IEPBinaryReportRenderEngine
from iep_management.privacy_utils import escape_reportlab_text


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
```

- [ ] **Step 2: Run test to verify RED**

Run:
```bash
python neuropath-backend/manage.py test iep_management.tests.test_deped_curriculum_alignment
```
Expected: FAIL (`ImportError: cannot import name 'escape_reportlab_text' from 'iep_management.privacy_utils'` or `AttributeError: type object 'IEPBinaryReportRenderEngine' has no attribute '_format_enroute_for_reportlab'`).

- [ ] **Step 3: Implement `escape_reportlab_text` in `privacy_utils.py` and `_format_enroute_for_reportlab()` in `IEPBinaryReportRenderEngine`**

1. Add `escape_reportlab_text(val)` to `neuropath-backend/iep_management/privacy_utils.py`:
```python
import html


def escape_reportlab_text(val) -> str:
    """
    Strips XML-illegal ASCII control characters and HTML-escapes dynamic text
    before passing into ReportLab's Paragraph() XML parser (DEF-05).
    """
    if val is None:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(val))
    return html.escape(cleaned)
```

2. In `neuropath-backend/iep_management/views.py` (`IEPBinaryReportRenderEngine` at `lines 1152-1390`), add `_format_enroute_for_reportlab` and use it when rendering `r.enroute_objectives` at line `1381`:
```python
class IEPBinaryReportRenderEngine:
    @staticmethod
    def _format_enroute_for_reportlab(raw_text: str) -> str:
        escaped = escape_reportlab_text(raw_text or "—")
        escaped = escaped.replace("\r\n", "\n").replace("\n", "<br/>")
        return re.sub(
            r"(\(TP(?:CS|LS|EP|_EFP|_MFP|_SFP)[A-Za-z0-9_.-]+-NG-[0-9.]+\))",
            r"<b>\1</b>",
            escaped,
        )
```
And in `generate_iep_pdf_stream` (`line 1381`):
```python
                        g_data.append([
                            Paragraph(
                                IEPBinaryReportRenderEngine._format_enroute_for_reportlab(r.enroute_objectives or '—'),
                                style_cell_value,
                            ),
```

- [ ] **Step 4: Run test to verify GREEN**

Run:
```bash
python neuropath-backend/manage.py test iep_management.tests.test_deped_curriculum_alignment iep_management.tests.test_iep_export_pdf
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/privacy_utils.py neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_deped_curriculum_alignment.py
git commit -m "feat(pdf): format DepEd transition curriculum codes with XML-safe line breaks in IEP PDF export"
```

---

### Task 4: Frontend Section C Table Multi-Line & Code Display (`IepGenerationPage.jsx` & `ViewStudentRecords.jsx`)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx:303-381`
- Modify: `neuropath-frontend/src/pages/ViewStudentRecords.jsx:133-195`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx:2127-2210`

- [ ] **Step 1: Write or update frontend test in `IepGenerationPage.test.jsx`**

In `neuropath-frontend/src/pages/IepGenerationPage.test.jsx` (`describe("Section C 3-Month Quarter Milestone Columns & SMART ABCD Goals (Issue #215)")`), add a test verifying multi-line DepEd competency and SPED code rendering:
```javascript
    it("renders DepEd Transition Curriculum competency and parenthesized SPED code with preserved line breaks in Section C", async () => {
      const mockGoal = {
        goalID: 102,
        subject_category: "Mathematical Skills",
        annual_goal: "Given tactile counters, the learner will recognize numbers 0-10 with 80% accuracy.",
        objective_rows: [
          {
            rowID: 202,
            enroute_objectives: "Recognizing numbers from 0-10\n(TP_MFP-nv-NG-1)",
            month_1_target: "Recognize 0-3 with 70% accuracy",
            month_2_target: "Recognize 0-6 with 75% accuracy",
            month_3_target: "Recognize 0-10 with 80% accuracy",
            interventions_procedures: "(Mother Tongue / Visual Support) Tactile counters",
            timeline_mins_session: "15-20 minutes every day (based on learner's ability)",
            individuals_responsible: "SPED Teacher, Parents/Guardians",
            progress_instructional: "Checklist",
            remarks: "On track",
          },
        ],
      };

      iepAPI.listByStudent.mockResolvedValue([
        {
          iepID: 10,
          studentID: 1,
          studentName: "Alex Doe",
          version: 1,
          goals: "Improve numeracy",
        },
      ]);
      iepAPI.listGoalsByIep.mockResolvedValue([mockGoal]);

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Recognizing numbers from 0-10/)).toBeInTheDocument();
        expect(screen.getByText("(TP_MFP-nv-NG-1)")).toBeInTheDocument();
      });
    });
```

- [ ] **Step 2: Update `IepGenerationPage.jsx` and `ViewStudentRecords.jsx`**

1. In `neuropath-frontend/src/pages/IepGenerationPage.jsx` (`ReadOnlyGoalTable` at `lines 303-381`), add a helper to render the competency text and trailing `(TP_...)` code cleanly with `whitespace-pre-line`:
```jsx
function renderEnrouteObjectiveContent(rawObjective) {
  const text = String(rawObjective || "").trim();
  if (!text) return "—";
  const match = text.match(/^([\s\S]*?)\r?\n(\(TP[A-Za-z0-9_.-]+-NG-[0-9.]+\))$/i);
  if (!match) {
    return <span className="whitespace-pre-line">{text}</span>;
  }
  return (
    <div className="whitespace-pre-line">
      <div>{match[1].trim()}</div>
      <div className="font-semibold text-slate-700 mt-0.5">{match[2]}</div>
    </div>
  );
}
```
And in `ReadOnlyGoalTable` (`lines 348-350`):
```jsx
              <td className="iep-readonly-cell iep-sticky-col iep-col-objective whitespace-pre-line">
                {renderEnrouteObjectiveContent(row.objective)}
              </td>
```

2. In `neuropath-frontend/src/pages/ViewStudentRecords.jsx` (`GoalTable` at `lines 133-195`), apply the same multi-line formatting to `row.objective` (`lines 162-164`):
```jsx
              <td className="vsr-sticky-col iep-col-objective whitespace-pre-line">
                {row.objective || "—"}
              </td>
```

- [ ] **Step 3: Run frontend test suite and linter**

Run from `neuropath-frontend`:
```bash
npm test -- --run
npm run lint
```
Expected: PASS with 0 lint errors.

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/pages/IepGenerationPage.jsx neuropath-frontend/src/pages/ViewStudentRecords.jsx neuropath-frontend/src/pages/IepGenerationPage.test.jsx
git commit -m "feat(ui): preserve line breaks for DepEd curriculum codes in Section C objective tables"
```

---

### Task 5: Full Backend & Frontend Verification Audit

**Files:**
- Test all backend and frontend suites

- [ ] **Step 1: Run complete backend test suite and system checks**

```bash
python neuropath-backend/manage.py test
python neuropath-backend/manage.py makemigrations --check --dry-run
python neuropath-backend/manage.py check
ruff check neuropath-backend/
```
Expected: 100% backend tests passing, `No changes detected`, 0 check issues, and clean `ruff` lint.

- [ ] **Step 2: Run complete frontend test suite, lint, and production build**

```bash
npm --prefix neuropath-frontend test -- --run
npm --prefix neuropath-frontend run lint
npm --prefix neuropath-frontend run build
```
Expected: All Vitest suites pass, 0 ESLint errors, and clean Vite build.

---

## Self-Review

| Issue #279 Requirement | Task |
| :--- | :--- |
| Authoritative DepEd Order No. 021, s. 2020 catalog for all 5 `ALLOWED_GOAL_AREAS` (`DEPED-01`) | Task 1 |
| Grounded AI auto-matching in Step B `_generate_objective_rows` & single-goal regeneration (`DEPED-02`) | Task 2 |
| Deterministic fallback normalization (`ensure_valid_deped_enroute_objective`) & safe fallback rows (`DEPED-03`) | Task 1 & Task 2 |
| Preserve Step A SMART ABCD brackets (`REQ-M2-09`) and Bundle 5 Spotlighting/PII/RGORI guards (`DEF-01`..`DEF-04`) | Task 2 & Task 5 |
| XML-safe ReportLab PDF rendering of `\n(TP_...)` codes (`DEPED-04` / `DEF-05`) | Task 3 |
| Clean multi-line DepEd code display in `IepGenerationPage.jsx` and `ViewStudentRecords.jsx` with zero DB migrations | Task 4 & Task 5 |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-12-issue-279-deped-transition-curriculum-codes.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
