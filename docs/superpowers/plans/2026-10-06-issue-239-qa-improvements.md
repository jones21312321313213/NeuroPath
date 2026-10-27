# Implementation Plan — Issue #239: QA Polish, Lesson Plan Duplication Fix, Difficulty Cleanup, R-GORI Removal, and Instructional Support Guidance

**Date:** 2026-10-06  
**Issue:** [#239](https://github.com/jones21312321313213/NeuroPath/issues/239)  
**Branch:** `fix/issue-239-qa-improvements`  
**Target:** `main`

---

## 1. Overview & Goals

During the initial staging deployment testing, four functional and UX improvements were identified:
1. **Duplicate Lesson Plan Generation:** Lesson plan generation created both a "Draft" and an identical "Generated" record in the database upon acceptance.
2. **Student Profile Difficulty Redundancy:** "With Medical Assessment/Diagnosis" was listed under functional difficulties despite being captured in dedicated medical notes.
3. **R-GORI Removal in Generate IEP:** Pedagogical research rubric indicators (R-GORI scores, feedback callouts, and warnings) were displayed in IEP cards and modals, which are no longer needed by end users.
4. **Instructional Support Guidance ("Info" Tab):** Teachers requested clarity on what the "Manage" / library section does across all three Instructional Support tools (Lesson Plans, Visual Aids, Teaching Strategies).

---

## 2. Technical Breakdown & Tasks

### Task 1: Fix Lesson Plan Duplication (Backend)
- **Problem:** In [`neuropath-backend/resources/services.py`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-backend/resources/services.py#L201-L212), `LessonPlanGenerationService.execute_generation` executes `LessonPlan.objects.create(..., status="Draft")` during generation. When the teacher accepts and saves the draft, `lessonPlansAPI.save()` sends a POST request to `LessonPlanViewSet.create`, creating a second row in the database with status `Generated`.
- **Solution:** Remove the premature database insert in `execute_generation`. It should return the parsed JSON payload for teacher preview only. Persistence will occur exclusively when the teacher clicks "Accept & Save".
- **Verification:** Unit tests in `test_instructional_ai.py` must pass, verifying that generating a lesson plan does not insert a row into `resources_lessonplan` until explicitly saved.

### Task 2: Remove "With Medical Assessment/Diagnosis" from Difficulties (Frontend)
- **Problem:** Redundant 7th difficulty checkbox in `difficultyOptions` within:
  - [`neuropath-frontend/src/pages/CreateStudentProfile.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/CreateStudentProfile.jsx#L20-L28)
  - [`neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx#L21-L29)
- **Solution:** Remove `"With Medical Assessment/Diagnosis"` from `difficultyOptions` in both files. Medical assessment details remain properly managed in the `diagnosisDetails` textarea.
- **Verification:** Frontend vitest tests for Student Profile creation and editing must pass.

### Task 3: Remove R-GORI Classification from Generate IEP (Frontend)
- **Problem:** Legacy research rubric indicators are rendered to teachers in:
  - [`neuropath-frontend/src/pages/IepGenerationPage.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/IepGenerationPage.jsx#L4224-L4237): `R-GORI Score: {goal._rgori_score}/100 · {goal._rgori_feedback}`
  - [`neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx#L214-L248): `R-GORI: {rgoriScore}/100 ({scoreLabel})` badge and feedback box.
  - [`neuropath-frontend/src/constants/iepLoadingStages.js`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/constants/iepLoadingStages.js#L17): Mentions RGORI rubric standards.
- **Solution:** 
  - Remove R-GORI score badges, feedback notes, and warnings from `IepGenerationPage.jsx` and `IepPostGenerationModal.jsx`.
  - Update loading stage description to focus on goal and objective quality validation.
  - Update corresponding test assertions in `IepPostGenerationModal.test.jsx`.
- **Verification:** Run Vitest suite (`npm run test`) to confirm clean rendering with 539+ passing tests.

### Task 4: Add "Info" Tab in Instructional Support Pages (Frontend)
- **Problem:** Teachers navigating to Lesson Plans, Teaching Strategies, or Visual Aids lack context on how generation ties to IEP goals and what the "Manage" tab is used for.
- **Solution:** Add an `"info"` tab with `InfoIcon` to `TABS` in:
  - [`ManageLessonPlans.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/ManageLessonPlans.jsx)
  - [`ManageTeachingStrategies.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/ManageTeachingStrategies.jsx)
  - [`ManageVisualAids.jsx`](file:///C:/Users/John%20Lyster/orca/NeuroPath/neuropath-frontend/src/pages/ManageVisualAids.jsx)
- **Content:**
  - **Tool Purpose:** Clear pedagogical overview of the resource type and IEP alignment.
  - **Generation Guide:** How AI crafts tailored interventions from student goals and learning profiles.
  - **Manage / Library Overview:** How to use the Manage tab to review, edit, export/print, and update statuses (Draft, Active, Archived).
- **Verification:** Verify tab switching, styling consistency across all 3 pages, and non-regression in existing tabs.

---

## 3. Testing & Validation Plan
1. **Automated Backend Tests:** Run `python manage.py test` to ensure DRF viewsets, generation serializers, and services pass.
2. **Automated Frontend Tests:** Run `npm run test` in `neuropath-frontend` to ensure all 539+ Vitest tests remain green.
3. **Smoke Verification:**
   - Simulate lesson plan generation + accept -> verify only 1 DB row is saved.
   - Inspect Student Profile creation screen -> verify 6 difficulty checkboxes appear.
   - Inspect IEP generation review -> verify clean card without R-GORI score tags.
   - Click "Info" tab in all 3 instructional support pages -> verify clean rendering.

---

## 4. Promotion & Pull Request
- Commit changes to `fix/issue-239-qa-improvements`.
- Push branch to `origin`.
- Open Pull Request to `main` with `Closes #239`.
