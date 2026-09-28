# [IEP] [WORKFLOW & LIFECYCLE]: Section A-B-C Wizard Stepper, Granular Goal Regeneration, Version Badges, Confirmations & Archiving (Issue #205) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement enhancements ENH25 through ENH29 across `neuropath-backend` and `neuropath-frontend` to introduce an accessible Section A -> Section B -> Section C visual wizard stepper, granular single-goal regeneration with optional prompt guidance, prominent high-contrast IEP version and last updated status badges, regeneration confirmation dialogs protecting active drafts, and a complete archiving mechanism for older IEP versions.

**Architecture:**
1. **IEP Archiving Model & API (ENH29 Backend & Client):** Add `is_archived = models.BooleanField(default=False)` to `IEPModel` in `neuropath-backend/iep_management/models.py`. Expose `is_archived` in `IEPDataSerializer`, `IEPListDetailSerializer`, and `IEPUpdateSerializer`. Filter `is_archived=False` in `dashboard_stats`. Apply migrations. Expose `archive` helper in `neuropath-frontend/src/api/client.js` via `PATCH`/`PUT` to `/api/iep/edit/{id}/`.
2. **Visual Section A-B-C Wizard Stepper (ENH27):** In `neuropath-frontend/src/pages/IepGenerationPage.jsx`, add an accessible visual wizard stepper header: `Section A: Learner Profile` -> `Section B: Special Factors & Barriers` -> `Section C: Annual Goals & Objectives`. Support direct navigation, active step indicators, and dynamic section completion badges (Student selected, Factors identified, Goals formulated).
3. **High-Contrast Version Badges & History Presentation (ENH28):** Elevate version numbers and update dates in `IepGenerationPage.jsx` into prominent, high-contrast badges (e.g., `Version 2 (Active)`, `Version 1 (Archived)`, `Last Updated: Sept 26, 2026`). Enrich student search results and IEP version dropdown selectors with status tags.
4. **Archiving UI & Accordion (ENH29 Frontend):** Separate student IEP records into active and archived sets. Add "Archive Version" / "Unarchive Version" actions for superseded/older versions. Render an expandable "Archived IEPs" accordion view keeping active IEPs front and center.
5. **Regeneration Confirmation Modal (ENH25):** Add an accessible confirmation dialog using `Modal.jsx` before executing full draft regeneration when existing goals are present, alerting the educator that unsaved modifications to the draft will be replaced.
6. **Granular Single-Goal Regeneration (ENH26):** Add a dedicated "Regenerate Goal" button to each goal card. Present a custom guidance prompt modal allowing educators to input specific instructions/tweaks. Query `iepAPI.generateGoalsFromIep` and update only the target goal while preserving all other goals intact.

**Tech Stack:** Django 5, Django REST Framework, React 19, Tailwind CSS 4, React Router 7, TanStack React Query v5, Vitest, Testing Library.

## Global Constraints

- Backend database migration must run cleanly using `neuropath-backend/venv/Scripts/python.exe`.
- Zero regression on existing 35 vitest tests in `IepGenerationPage.test.jsx` (including `Step 1 of 2` step header checks and multi-goal flows).
- All UI dialogs and steppers must adhere to WCAG 2.1 AA accessibility standards (aria-current, aria-expanded, aria-modal, focus trapping via `Modal.jsx`).
- 100% test pass rate across all Vitest test suites (`npm test -- --run`).
- Zero ESLint warnings or errors (`npm run lint`).
- Vite production build must succeed (`npm run build`).

---

### Task 1: Backend Model Field `is_archived`, Serializers, Endpoints & Migrations (ENH29 Backend)

**Files:**
- Modify: `neuropath-backend/iep_management/models.py`
- Modify: `neuropath-backend/iep_management/serializers.py`
- Modify: `neuropath-backend/iep_management/views.py`
- Create: `neuropath-backend/iep_management/tests/test_iep_archiving.py`

- [ ] **Step 1: Write backend tests for `is_archived` model field, serializers, and archiving endpoint**
  - Create `test_iep_archiving.py` testing:
    - Default `is_archived` is `False`.
    - `IEPDataSerializer`, `IEPListDetailSerializer`, and `IEPUpdateSerializer` include `is_archived`.
    - Updating an IEP via `PUT`/`PATCH` `/api/iep/edit/{id}/` with `is_archived=True` toggles archive status.
    - `dashboard_stats` only counts unarchived IEPs (`is_archived=False`).
  - Run `.\venv\Scripts\python.exe manage.py test iep_management.tests.test_iep_archiving --noinput` and verify failure.

- [ ] **Step 2: Update `IEPModel` in `models.py`**
  - Add `is_archived = models.BooleanField(default=False)` to `IEPModel`.

- [ ] **Step 3: Update serializers in `serializers.py`**
  - Add `'is_archived'` to `fields` in `IEPDataSerializer`, `IEPListDetailSerializer`, and `IEPUpdateSerializer`.
  - Add `'is_archived': {'required': False}` in `extra_kwargs` where appropriate.

- [ ] **Step 4: Update `dashboard_stats` in `views.py`**
  - In `dashboard_stats`, filter `is_archived=False` when counting `active_ieps`.

- [ ] **Step 5: Generate and execute migration**
  - Run `.\venv\Scripts\python.exe manage.py makemigrations iep_management`
  - Run `.\venv\Scripts\python.exe manage.py migrate iep_management`

- [ ] **Step 6: Run backend tests and verify**
  - Run `.\venv\Scripts\python.exe manage.py test iep_management --noinput`
  - Verify all tests pass.

---

### Task 2: Frontend API Client Support for Archiving (ENH29 Client)

**Files:**
- Modify: `neuropath-frontend/src/api/client.js`
- Modify: `neuropath-frontend/src/api/client.test.js`

- [ ] **Step 1: Write unit tests for `iepAPI.archive` in `client.test.js`**
  - Test that `iepAPI.archive(iepId, is_archived)` sends `PUT` (or `PATCH`) to `/iep/edit/{id}/` with `{ is_archived }`.
  - Defaults to `is_archived = true`.

- [ ] **Step 2: Add `archive` method to `iepAPI` in `client.js`**
  - Add `archive: (id, is_archived = true) => request(`/iep/edit/${id}/`, { method: "PUT", body: JSON.stringify({ is_archived }) })`.

- [ ] **Step 3: Run client tests and verify**
  - Run `npm test -- src/api/client.test.js --run`.

---

### Task 3: Visual Section A-B-C Wizard Stepper Header (ENH27)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

- [ ] **Step 1: Write failing tests for Section A-B-C wizard stepper**
  - Add tests in `IepGenerationPage.test.jsx` verifying:
    - Stepper renders items: `Section A: Learner Profile`, `Section B: Special Factors & Barriers`, `Section C: Annual Goals & Objectives`.
    - Active step highlights based on current state/step.
    - Completion status badges appear when sections are completed (Student selected for Section A, difficulties present for Section B, goals generated for Section C).
    - Clicking stepper buttons directly navigates to the respective section.
    - Preserves existing `Step 1 of 2` / `Step 2 of 2` step header indicator for backwards compatibility.

- [ ] **Step 2: Implement Wizard Stepper Component in `IepGenerationPage.jsx`**
  - Create `<nav className="iep-wizard-stepper" aria-label="IEP Section Navigation">` with 3 steps:
    1. Section A: Learner Profile
    2. Section B: Special Factors & Barriers
    3. Section C: Annual Goals & Objectives
  - Calculate step state and completion flags:
    - `isSectionAComplete = Boolean(selectedStudent)`
    - `isSectionBComplete = Boolean(form.barrierRows?.some(r => r.difficulty && r.difficulty.trim()))`
    - `isSectionCComplete = Boolean(aiGeneratedGoals?.length > 0)`
  - Wire direct navigation `onClick` handlers:
    - Step A: Go to `step = 1`, focus learner profile.
    - Step B: Go to `step = 1`, focus Section B table.
    - Step C: Go to `step = 2`.
  - Add CSS classes in `App.css` for active, completed, and pending states with accessible high contrast colors and focus rings.

- [ ] **Step 3: Run tests and verify**
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx --run`.

---

### Task 4: High-Contrast Version Badges, History Presentation & Archiving (ENH28 & ENH29 Frontend)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

- [ ] **Step 1: Write failing tests for version presentation and archiving**
  - Test that active IEP displays high-contrast badges: `Version X (Active)` and `Last Updated: <Date>`.
  - Test that superseded/older IEPs display `Version X (Superseded)`.
  - Test that archived IEPs display `Version X (Archived)`.
  - Test that version select dropdown displays version status tags (`(Active)`, `(Superseded)`, `(Archived)`).
  - Test that student search items display version tags when student has active IEPs.
  - Test that older/superseded IEP has an "Archive Version" button.
  - Test that clicking "Archive Version" calls `iepAPI.archive(id, true)` and moves it into the "Archived IEPs" accordion.
  - Test that archived IEP can be unarchived.

- [ ] **Step 2: Implement Version Badges and History Selectors in `IepGenerationPage.jsx`**
  - In `ViewIEPPanel`:
    - Elevate `selectedIep.version` and `formattedDate` into high-contrast badges with appropriate colors (emerald for Active, slate/amber for Superseded/Archived).
    - Update the version `<select>` to tag options with `(Active)`, `(Superseded)`, `(Archived)`.
    - In `StudentSearchBox`, add version tags for students with known IEPs.

- [ ] **Step 3: Implement Archiving Mechanism and Expandable Accordion in `IepGenerationPage.jsx`**
  - Split `studentIeps` into `activeIeps = studentIeps.filter(i => !i.is_archived)` and `archivedIeps = studentIeps.filter(i => i.is_archived)`.
  - Add "Archive Version" action button in `ViewIEPPanel` header when viewing a non-archived IEP.
  - Add "Unarchive Version" action button when viewing an archived IEP.
  - Render an expandable `<details>` or accordion section for "Archived IEPs ({archivedIeps.length})" below active version selector.
  - Wire handlers calling `iepAPI.archive` and updating state with toast feedback.

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx --run`.

---

### Task 5: Regeneration Confirmation Modal & Granular Single-Goal Regeneration (ENH25 & ENH26)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

- [ ] **Step 1: Write failing tests for Regeneration Confirmation and Single-Goal Regeneration**
  - Test that clicking "Regenerate" / "Regenerate Goals" when goals exist opens confirmation modal with title "Are you sure you want to regenerate goals?" and warning that unsaved modifications to active draft will be replaced.
  - Test that clicking "Cancel" in confirmation modal dismisses it without regenerating.
  - Test that confirming regeneration triggers fresh AI goal generation.
  - Test that each goal card renders an individual "Regenerate Goal" button.
  - Test that clicking "Regenerate Goal" opens prompt modal allowing optional prompt tweaks.
  - Test that confirming single-goal regeneration calls `iepAPI.generateGoalsFromIep` and replaces ONLY that target goal in `aiGeneratedGoals`, leaving other goals unchanged.

- [ ] **Step 2: Implement Regeneration Confirmation Modal in `IepGenerationPage.jsx` (ENH25)**
  - Add state `showRegenConfirmModal`.
  - When draft has existing goals (`aiGeneratedGoals.length > 0`), clicking "Regenerate Goals" / "Regenerate" opens confirmation modal.
  - Use `Modal.jsx` with accessible title: "Are you sure you want to regenerate goals?", warning text: "Unsaved custom modifications to the active draft will be replaced.", and Cancel / Confirm buttons.
  - On confirm, trigger `handleGenerateFinalIep()`.

- [ ] **Step 3: Implement Granular Single-Goal Regeneration in `IepGenerationPage.jsx` (ENH26)**
  - Add state `singleGoalRegenModal`: `{ isOpen: false, goalIndex: null, goal: null, prompt: "", isRegenerating: false }`.
  - On each goal card in `aiGeneratedGoals` (and `goalsToRender`), add `<button type="button" className="btn btn-back ..." onClick={() => openSingleGoalRegen(idx, goal)}>Regenerate Goal</button>`.
  - Modal provides textarea for optional custom guidance or prompt tweaks.
  - In `handleRegenerateSingleGoal(goalIndex, goal, prompt)`:
    - Invoke `iepAPI.generateGoalsFromIep` with target goal category and specific prompt.
    - If successful, update only `aiGeneratedGoals[goalIndex]`.
    - If goal was persisted (has `goalID`), update via `iepAPI.updateGoal`.
    - Display toast notification.

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx --run`.

---

### Task 6: Full Verification & Quality Assurance

- [ ] **Step 1: Run complete frontend test suite**
  - `npm test -- --run` in `neuropath-frontend`
- [ ] **Step 2: Run complete backend test suite**
  - `.\venv\Scripts\python.exe manage.py test iep_management --noinput` in `neuropath-backend`
- [ ] **Step 3: Run ESLint**
  - `npm run lint` in `neuropath-frontend`
- [ ] **Step 4: Run production build**
  - `npm run build` in `neuropath-frontend`
- [ ] **Step 5: Send final completion report back to parent agent via `send_message`**
