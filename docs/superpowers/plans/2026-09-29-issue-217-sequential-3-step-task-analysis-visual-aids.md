# Implementation Plan: Issue #217 - Sequential 3-Step Task Analysis Visual Aid Strips via Imagen 3 (Bundle 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform NeuroPath's visual aid generator from a single generic image reliant on third-party endpoints into a cohesive, sequential 3-step Task Analysis visual aid strip generator powered by Google Gemini (Gemini 1.5 Flash for micro-step decomposition and Imagen 3 for single-call composite horizontal storyboard synthesis), complete with an interactive frontend sequence viewer, editable captions, quick daily routine presets, and printable flashcard/PDF export.

**Architecture:**
1. **Backend**:
   - `VisualAid` model upgraded with `steps_data` (`JSONField(default=list)`), migration created and applied.
   - `VisualAidSerializer` updated with `steps_data` validation and flexible image URL validation (supporting both HTTP/HTTPS and base64 data URIs).
   - `VisualAidViewSet` enabled with `patch` and `put` methods for saving teacher edits to step captions.
   - `VisualAidGeneratorService` rewritten with:
     - Sequential decomposition via Gemini 1.5 Flash into 3 chronological micro-steps with titles, captions, and visual cues (with RA 10173 PII anonymization and resilient fallback).
     - Token-efficient composite storyboard prompt synthesis combining all 3 panels into one horizontal strip.
     - Imagen 3 generation via Google Generative Language API (`imagen-3.0-generate-002:predict` / `imagen-3.0-fast-generate-001:predict`), with graceful fallback to Pollinations AI when offline or without API key.
   - `PDFExportEngine` enhanced to support both data URIs and HTTP URLs, rendering a high-resolution classroom-ready PDF featuring the 3-panel strip and cut-out flashcard step boxes with captions.
2. **Frontend**:
   - `visualAidsAPI` updated with `update(id, payload)` method.
   - `ManageVisualAids.jsx` upgraded with:
     - Preset quick templates for common daily living routines (Handwashing, Eating with Utensils, Tooth Brushing, Classroom Transition).
     - Interactive 3-step sequence viewer with panel highlighting, narration captions (SpeechSynthesis), inline caption editing, and direct save.
     - Classroom export options: Direct PDF download and printable flashcard board layout.
     - Saved visual aids viewer showing decomposed steps and quick editing.

**Tech Stack:** Django REST Framework, Python 3.12+, ReportLab, React 19, Tailwind CSS, TanStack Query, Vitest, Testing Library.

---

## Global Constraints & Compliance
- Target Issue: #217 (`[AI] [VISUAL AIDS]: Sequential 3-Step Task Analysis Visual Aid Strips via Imagen 3 (Bundle 5)`)
- Strict RA 10173 compliance: Do NOT include student name or PII in AI prompt decomposition or image generation.
- Token efficiency: Must generate the 3 panels within a single composite image request (`sampleCount: 1`), minimizing API quota consumption.
- Resilient execution: Must not crash if Gemini API key is missing or quota is exceeded; fallback to Pollinations or mock gracefully.
- Multi-tenant isolation: Teachers can only access and update visual aids belonging to their own students.
- Backward compatibility: Existing `fetch_image_from_pollinations` interface and endpoints must remain intact.

---

### Task 1: Backend Model and Migration for `steps_data`

**Files:**
- Modify: `neuropath-backend/resources/models.py`
- Create: `neuropath-backend/resources/migrations/0003_visualaid_steps_data.py`
- Modify: `neuropath-backend/resources/serializers.py`

**Steps:**
- [x] Add `steps_data = models.JSONField(default=list, blank=True)` to `VisualAid` in `neuropath-backend/resources/models.py`.
- [x] Generate migration `0003_visualaid_steps_data.py` using `makemigrations` and apply it using `migrate`.
- [x] Update `VisualAidSerializer` in `neuropath-backend/resources/serializers.py`:
  - Include `steps_data` in `Meta.fields`.
  - Update `validate_imageUrl` to accept both HTTP/HTTPS URLs and `data:image/` base64 data URIs.
  - Allow `steps_data` to be updated via serializer.

---

### Task 2: Backend Sequential Decomposition and Imagen 3 Service

**Files:**
- Modify: `neuropath-backend/resources/views.py`
- Modify: `neuropath-backend/iep_management/ai_engine.py` (if needed for shared helper)
- Create: `neuropath-backend/resources/tests/test_visual_aids.py`

**Steps:**
- [x] In `neuropath-backend/resources/views.py`, upgrade `VisualAidGeneratorService`:
  - `decompose_to_steps(goal_text, extra_prompt, category)`: Calls Gemini 1.5 Flash via `AIEngineService._call_gemini` (or fallback) requesting JSON structure:
    `[{"step": 1, "title": "...", "caption": "...", "visual_cue": "..."}, ...]`
  - `build_composite_prompt(steps, goal_text, category, extra_prompt)`: Assembles a 3-panel horizontal sequential comic strip prompt tailored for neurodivergent and autistic learners (flat vector, child-friendly, low visual clutter, labeled 1, 2, 3).
  - `fetch_image_from_imagen(prompt)`: Calls Generative Language API `imagen-3.0-generate-002:predict` with `settings.GEMINI_API_KEY`. Converts output to `data:image/jpeg;base64,...`.
  - `generate_visual_aid(target_goal, extra_prompt, category)`: Orchestrates decomposition, composite generation (with Pollinations fallback on error), and saves `VisualAid` with `steps_data`.
- [x] Update `GenerateVisualAidAPIView` to execute the sequential pipeline and return `steps_data` in response payload.
- [x] Update `VisualAidViewSet`:
  - Add `'patch', 'put'` to `http_method_names`.
  - Add `partial_update` / `update` support to persist edited step captions.

---

### Task 3: Backend PDF Export Engine Upgrade

**Files:**
- Modify: `neuropath-backend/resources/views.py` (`PDFExportEngine`)
- Test: `neuropath-backend/resources/tests/test_visual_aids.py`

**Steps:**
- [x] Update `PDFExportEngine.compile_pdf(visual_aid_record)`:
  - Add base64 data URI parser to extract image bytes without making an HTTP request when `imageUrl.startswith('data:image/')`.
  - Draw the 3-panel storyboard image across the page.
  - Below the image, render a 3-column table or structured flashcard cards for Step 1, Step 2, and Step 3 with step number, title, and descriptive caption.
  - Add classroom board posting guidelines / date created footer.

---

### Task 4: Backend Automated Unit Tests

**Files:**
- Create: `neuropath-backend/resources/tests/test_visual_aids.py`
- Run: `python manage.py test resources.tests`

**Steps:**
- [x] Write tests covering:
  - Goal decomposition into 3 numbered micro-steps.
  - Token-efficient composite storyboard prompt building.
  - Imagen 3 generation with mocked Gemini predict response.
  - Fallback to Pollinations when Imagen fails.
  - Updating captions via `PATCH /api/resources/visual-aids/<id>/`.
  - PDF export engine handling both data URIs and remote URLs with steps data.
  - Tenant isolation and RA 10173 privacy compliance (no student name in prompt).
- [x] Verify all tests pass with `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="testdb.sqlite3"`.

---

### Task 5: Frontend API Client and Quick Presets

**Files:**
- Modify: `neuropath-frontend/src/api/client.js`
- Modify: `neuropath-frontend/src/pages/ManageVisualAids.jsx`
- Modify: `neuropath-frontend/src/styles/ManageVisualAids.css`

**Steps:**
- [x] In `neuropath-frontend/src/api/client.js`, add `update(id, payload)` to `visualAidsAPI`.
- [x] In `neuropath-frontend/src/pages/ManageVisualAids.jsx`:
  - Define `QUICK_PRESETS` for common daily living skills:
    1. **Handwashing**: "Wash Hands: 1. Apply Soap -> 2. Rub Hands & Bubbles -> 3. Rinse & Dry"
    2. **Eating with Utensils**: "Eat with Spoon: 1. Hold Spoon -> 2. Scoop Food -> 3. Bring to Mouth"
    3. **Tooth Brushing**: "Brush Teeth: 1. Toothpaste on Brush -> 2. Brush in Circles -> 3. Rinse & Spit"
    4. **Classroom Transition**: "Pack Bag: 1. Clean Desk -> 2. Put Items in Backpack -> 3. Line Up at Door"
  - Render preset chips above or inside the prompt section so educators can 1-click populate.

---

### Task 6: Frontend Interactive Sequence Viewer & Editable Captions

**Files:**
- Modify: `neuropath-frontend/src/pages/ManageVisualAids.jsx`
- Modify: `neuropath-frontend/src/styles/ManageVisualAids.css`

**Steps:**
- [x] Build the interactive 3-step sequence viewer:
  - 3-panel storyboard image display with step indicator tabs (`Step 1`, `Step 2`, `Step 3`).
  - Active step highlighting: clicking a step focuses the corresponding micro-step card.
  - Editable captions: each step card provides an editable caption input/textarea and "Save Captions" button that persists edits to backend via `visualAidsAPI.update`.
  - Read Aloud / Audio Narration button for each step utilizing `window.speechSynthesis`.
  - Printable flashcard export: "Print Flashcard Strip" triggers `@media print` optimized printable layout, plus direct "Download Classroom PDF" button.
- [x] Upgrade View Tab:
  - Inspecting any saved visual aid displays its decomposed 3 steps, editable captions, full storyboard image preview, and printable flashcards.

---

### Task 7: Frontend Automated Unit Tests & Verification

**Files:**
- Create: `neuropath-frontend/src/pages/ManageVisualAids.test.jsx`
- Run: `npm test`

**Steps:**
- [x] Write comprehensive Vitest + Testing Library tests:
  - Renders preset quick templates and applies template text on click.
  - Generates 3-step visual aid and displays storyboard strip with 3 steps.
  - Step selection highlights corresponding card and updates narration caption.
  - Inline editing of step captions calls `visualAidsAPI.update` and saves successfully.
  - PDF export link points to correct export URL.
  - View Tab loads saved visual aids and renders sequence steps.
  - Delete Tab confirms deletion.
- [x] Run full frontend test suite: verify 100% pass across all test files.
