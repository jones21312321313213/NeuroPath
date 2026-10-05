# Enforce Input Bounds, Standardize Field Error Messages, Add Save Confirmations & Fix Section B Sync (Issue #204) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement enhancements ENH16, ENH18, ENH19, and ENH20 across `neuropath-frontend` to enforce input bounds and character counts, standardize error message phrasing and accessible inline validation feedback, present review confirmation modals prior to saving/updating student profiles, fix Section B difficulty deletion synchronization when all difficulties are removed, and guarantee immediate React Query cache reactivity in Generate IEP.

**Architecture:**
1. **Input Bounds & Character Counters (ENH16):** Update `FormField` and `TextAreaField` in `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx` to enforce explicit `maxLength` limits (255 for standard text fields, 50 for school year, 1000/2000 for narrative textareas) and display live `current / max` character counters on long-form narrative fields.
2. **Standardized Error Feedback & A11y Validation:** Standardize validation error phrasing to `<Field name> is required.` and `<Field name> must be between <min> and <max>.` across both create and update profile workflows. Implement accessible inline error presentation with `aria-invalid="true"`, `aria-describedby` linking to error message elements, and red focus/border outlines.
3. **Save/Update Confirmation Modals (ENH18):** Use `neuropath-frontend/src/components/ui/Modal.jsx` in `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx` to intercept the submission process after validation passes. Summarize critical learner details (Name, Grade, Age, Diagnosis, School, Difficulty Markers, Consent) so educators can review before finalizing changes.
4. **Section B Difficulty Deletion Synchronization (ENH19):** In `IepGenerationPage.jsx`, remove the `if (sanitizedDifficulties.length > 0)` guard in `handleUpdateIep`, enabling complete synchronization to `studentsAPI.update` and local state even when all difficulty rows are deleted.
5. **Immediate Cache & State Reactivity (ENH20):** In `IepGenerationPage.jsx`, subscribe to `queryClient.getQueryCache()` to capture query updates and invalidations on student keys (`['student', sid]` and `['students', teacherId]`), immediately updating `selectedStudent`, `students`, and the Generate IEP form state (`form.difficultyMarkers` and `form.barrierRows`) without requiring manual re-selection or page refreshes.

**Tech Stack:** React 19, Tailwind CSS 4, React Router 7, TanStack React Query v5, Vitest, Testing Library.

## Global Constraints

- Scope is strictly limited to `neuropath-frontend` (zero backend/API contract alterations).
- All UI additions and modal dialogs must comply with WCAG 2.1 AA (accessible roles, labeled controls, focus traps, high contrast text and borders).
- Maintain backwards compatibility with existing forms, helper utilities, and profile payloads.
- Zero ESLint warnings or errors (`npm run lint`).
- 100% test pass rate across all Vitest test suites (`npm test -- --run`).
- Vite production build must succeed (`npm run build`).

---

### Task 1: Enforce Input Length Bounds & Character Counter Indicators (ENH16)

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Modify: `neuropath-frontend/src/styles/UpdateStudentProfile.css`
- Test: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`
- Test: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`

**Interfaces:**
- `FormField`: accepts `maxLength` (default 255 for text inputs; omit for type="number" / type="date").
- `TextAreaField`: accepts `maxLength` (e.g. 1000 for diagnosis details, 2000 for evaluation, strengths, needs, concerns, curriculum impact) and `showCharCount` (defaults to `Boolean(maxLength)`), displaying `<span id={charCountId} className="form-char-count">{currentLength} / {maxLength}</span>`.

- [ ] **Step 1: Write failing tests for input length constraints and character counters**
  - Add tests in `CreateStudentProfile.test.jsx` checking that:
    - Text inputs have `maxLength={255}` (or `maxLength={50}` for school year).
    - Long-form narrative textareas have `maxLength` set (1000 or 2000).
    - Long-form narrative fields render a character counter indicator displaying `current / max` (e.g. `0 / 2000`).
    - Character counter updates dynamically when typing.
  - Add corresponding tests in `UpdateStudentProfile.test.jsx`.
  - Run `npm test -- src/pages/CreateStudentProfile.test.jsx` and verify failure.

- [ ] **Step 2: Update `FormField` and `TextAreaField` in `CreateStudentProfile.jsx`**
  - Add `maxLength` support to `FormField` (default `maxLength = 255`, applied when `type !== "number" && type !== "date"`).
  - Add `maxLength` and character count rendering to `TextAreaField`:
    - Display `<span id={charCountId} className="form-char-count" aria-live="polite">{(value || "").length} / {maxLength}</span>`.
    - Set `aria-describedby` to include `charCountId`.
  - Apply explicit `maxLength` to all fields:
    - `Student Name`: `maxLength={255}`
    - `School`: `maxLength={255}`
    - `School Year`: `maxLength={50}`
    - `Guardian Full Name`: `maxLength={255}`
    - `Assessment / Diagnosis Details`: `maxLength={1000}`
    - `presentEvaluation`: `maxLength={2000}`
    - `academicStrengths`: `maxLength={2000}`
    - `academicNeeds`: `maxLength={2000}`
    - `parentalConcerns`: `maxLength={2000}`
    - `curriculumImpact`: `maxLength={2000}`

- [ ] **Step 3: Update `FormField` and `TextAreaField` in `UpdateStudentProfile.jsx`**
  - Replicate identical `maxLength` bounds and character counter support in `UpdateStudentProfile.jsx`.
  - Apply `maxLength` to all Step 1 and Step 2 fields matching `CreateStudentProfile.jsx`.

- [ ] **Step 4: Add CSS styling for character counter in `App.css` and `UpdateStudentProfile.css`**
  - Define `.form-char-count` styling with WCAG-compliant slate typography (`#64748b`, font-size `0.75rem`, proper spacing).

- [ ] **Step 5: Run tests and verify**
  - Run `npm test -- src/pages/CreateStudentProfile.test.jsx` and `npm test -- src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`.
  - Verify all character count and maxLength tests pass.

---

### Task 2: Standardize Field Error Messages & Accessible Inline Validation Feedback

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Modify: `neuropath-frontend/src/styles/UpdateStudentProfile.css`
- Test: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`
- Test: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`

**Interfaces:**
- Standard error messages:
  - Required fields: `<Field name> is required.`
    - "Student name is required."
    - "Age is required."
    - "Grade level is required."
    - "Gender is required."
    - "Diagnosis is required."
    - "Guardian name is required."
    - "Guardian relationship is required."
    - "Consent date is required."
    - "Evaluation / assessment results are required."
    - "Learner strengths are required."
    - "Learner needs are required."
    - "Parental concerns are required."
    - "Curriculum impact are required." (or "Curriculum impact is required.")
  - Range bounds: `<Field name> must be between <min> and <max>.`
    - "Age must be between 2 and 18."
    - "Grade level must be between 1 and 10."
- Form field error props:
  - `FormField`, `SelectField`, and `TextAreaField` accept `error` string.
  - When `error` is present:
    - Input/select/textarea renders `aria-invalid="true"`.
    - Input/select/textarea renders `aria-describedby` referencing error message ID `${inputId}-error`.
    - Renders `<p id={`${inputId}-error`} className="form-field-error" role="alert">{error}</p>`.
    - Input border outline highlights in rose/red (`#e11d48`).

- [ ] **Step 1: Write failing tests for standardized errors and inline accessible feedback**
  - Test that triggering validation without required fields sets `aria-invalid="true"` and `aria-describedby` on invalid inputs.
  - Test that inline error messages match standardized phrasing (`<Field name> is required.`).
  - Test that age and grade level range validation errors follow `<Field name> must be between <min> and <max>.` in both create and update forms.
  - Test that modifying an invalid field clears the inline error and `aria-invalid`.

- [ ] **Step 2: Update error state and validation in `CreateStudentProfile.jsx`**
  - Add `fieldErrors` state (`const [fieldErrors, setFieldErrors] = useState({});`).
  - Update `validateStepOne` and `validateStepTwo` to record field-specific errors in `fieldErrors` alongside setting top-level `error`.
  - Standardize Step 2 messages:
    - `presentEvaluation`: "Evaluation / assessment results are required."
    - `academicStrengths`: "Learner strengths are required."
    - `academicNeeds`: "Learner needs are required."
    - `parentalConcerns`: "Parental concerns are required."
    - `curriculumImpact`: "Curriculum impact is required."
  - In `setField`, clear `fieldErrors[field]` when user changes value.
  - Pass `error={fieldErrors[fieldName]}` to `FormField`, `SelectField`, and `TextAreaField`.

- [ ] **Step 3: Update error state and validation in `UpdateStudentProfile.jsx`**
  - Add `fieldErrors` state and wire up inline errors matching `CreateStudentProfile.jsx`.
  - Add missing Age (2-18) and Grade (1-10) range checks and age/grade coherence checks in `UpdateStudentProfile.jsx`.
  - Standardize Step 2 messages in `UpdateStudentProfile.jsx` to match `CreateStudentProfile.jsx`.
  - Pass `error={fieldErrors[fieldName]}` to `FormField`, `SelectField`, and `TextAreaField`.

- [ ] **Step 4: Update CSS for inline errors and `aria-invalid`**
  - In `App.css` and `UpdateStudentProfile.css`, ensure `.form-input[aria-invalid="true"]`, `.form-select[aria-invalid="true"]`, and `.form-textarea[aria-invalid="true"]` have border color `#e11d48` and red focus ring.
  - Add `.form-field-error` styling (`color: #e11d48; font-size: 0.8rem; margin-top: 4px; font-weight: 500;`).

- [ ] **Step 5: Run tests and verify**
  - Run `npm test -- src/pages/CreateStudentProfile.test.jsx` and `npm test -- src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`.

---

### Task 3: Accessible Confirmation Modals on Save / Update Actions (ENH18)

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Test: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`
- Test: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`

**Interfaces:**
- Confirmation Modal:
  - Renders `<Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Student Profile Creation" size="md" footer={...}>`.
  - Body displays structured summary:
    - Student Name (`form.learnerName`)
    - Grade Level (`Grade ${form.gradeLevel}`)
    - Age (`${form.age} years old`)
    - Diagnosis / Classification (`form.disabilityCategory`)
    - School (`form.school || "Not specified"`)
    - Difficulty Markers (`form.difficultyMarkers.join(", ")`)
    - Parental Consent (`form.guardianName` & status)
  - Footer contains:
    - Cancel / "Review Form" button (dismisses modal, leaves form intact for editing)
    - Confirm button: "Confirm & Create" (Create) / "Confirm & Save" (Update) which executes the API request.

- [ ] **Step 1: Write failing tests for confirmation modal**
  - In `CreateStudentProfile.test.jsx`, test that clicking "SUBMIT" opens the confirmation modal summarizing Student Name, Grade, and Diagnosis.
  - Test that clicking "Review Form" / Cancel closes the modal without calling `studentsAPI.create`.
  - Test that clicking "Confirm & Create" inside the modal calls `studentsAPI.create` and displays the success modal.
  - In `UpdateStudentProfile.test.jsx`, test that clicking "SAVE PROFILE" opens the confirmation modal summarizing key details.
  - Test that clicking "Confirm & Save" calls `studentsAPI.update`.
  - Update `fillAndSubmitValidForm` test helper to confirm modal submission.

- [ ] **Step 2: Implement Confirmation Modal in `CreateStudentProfile.jsx`**
  - Import `Modal` from `../components/ui/Modal` and `Button` from `../components/ui/Button`.
  - Add state `const [showConfirmModal, setShowConfirmModal] = useState(false);`.
  - In `handleSubmit(e)`, validate Step 2. If valid, open confirmation modal: `setShowConfirmModal(true);`.
  - Implement `handleConfirmSubmit()` to perform the actual API call, handle errors, set saving state, and show `SuccessModal`.
  - Render confirmation modal with structured review details and cancel/confirm footer buttons.

- [ ] **Step 3: Implement Confirmation Modal in `UpdateStudentProfile.jsx`**
  - Add state `const [showConfirmModal, setShowConfirmModal] = useState(false);`.
  - In `handleSave(e)`, validate Step 1 and Step 2. If valid, open confirmation modal: `setShowConfirmModal(true);`.
  - Implement `handleConfirmSave()` to perform `studentsAPI.update`, handle errors, and show `SuccessModal`.
  - Render confirmation modal with structured review details and cancel/confirm footer buttons.

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/pages/CreateStudentProfile.test.jsx` and `npm test -- src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`.
  - Ensure all profile creation and update tests pass cleanly.

---

### Task 4: Complete Section B Difficulty Deletion Synchronization (ENH19)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- In `handleUpdateIep(iep, payload, barrierRows)`:
  - Sanitize difficulties from `rows`.
  - Synchronize difficulties to `studentsAPI.update` and local state unconditionally when `sid && targetStudent`, even when `sanitizedDifficulties.length === 0`.
  - Pass `difficultyMarkers: []` in `profileDetails` and payload so student profile properly reflects cleared difficulty markers.

- [ ] **Step 1: Write failing test in `IepGenerationPage.test.jsx`**
  - Add test in `Sync Section B Difficulties to Student Profile & Generator (#135)` suite:
    - Set up existing student with difficulty markers (e.g. `["Sensory Processing"]`).
    - Open IEP in edit mode, delete the difficulty row (or clear input and save).
    - Save changes.
    - Assert that `studentsAPI.update` is called with `profileDetails.difficultyMarkers: []`.
    - Assert that local student state and `form.difficultyMarkers` are updated to `[]`.
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx` and observe failure due to `sanitizedDifficulties.length > 0` gating.

- [ ] **Step 2: Update `IepGenerationPage.jsx` Section B sync logic**
  - Locate `handleUpdateIep` (around line 2315).
  - Remove `if (sanitizedDifficulties.length > 0)` condition so the synchronization block executes whenever `sid && targetStudent`.
  - Ensure `studentPayload` properly carries `difficultyMarkers: sanitizedDifficulties` (empty array when all deleted).
  - Preserve `targetStudent` parental consent fields in payload.
  - Update `mergedStudent`, `setSelectedStudent`, `setStudents`, and `setForm` with `difficultyMarkers: sanitizedDifficulties`.
  - Update React Query cache `queryKeys.student(sid)` and `queryKeys.students(currentUserId)` with `mergedStudent`.

- [ ] **Step 3: Run tests and verify**
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx`.
  - Ensure the new test and all existing difficulty sync tests pass.

---

### Task 5: Immediate Cache & State Reactivity for Section B Difficulties in Generate IEP (ENH20)

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- `queryClient.getQueryCache().subscribe`:
  - Listens for events on `queryKeys.student(sid)` and `queryKeys.students(teacherId)`.
  - On cache updates or invalidations, immediately updates `selectedStudent`, `students`, and the Generate IEP form state (`form.difficultyMarkers` and `form.barrierRows`).

- [ ] **Step 1: Write failing tests in `IepGenerationPage.test.jsx`**
  - Add test: "immediately reflects difficulties updated in React Query cache in Generate IEP tab without reload"
    - Render `IEPGenerationPage` in `mode="generate"` with initial student having `["Sensory Processing"]`.
    - Update query cache via `queryClient.setQueryData(queryKeys.student(1), ...)` with modified difficulty markers `["Difficulty in Hearing", "Difficulty in Seeing"]`.
    - Assert that the difficulty chips and barrier rows in Generate IEP immediately reflect the new difficulty markers.
  - Add test: "reacts to query invalidation on student query by refetching and updating difficulty markers in Generate IEP"
    - Mock `studentsAPI.get` with updated difficulties.
    - Trigger `queryClient.invalidateQueries({ queryKey: queryKeys.student(1) })`.
    - Assert that the updated difficulties appear in Generate IEP.

- [ ] **Step 2: Implement Query Cache Subscription in `IepGenerationPage.jsx`**
  - Add `useEffect` subscribing to `queryClient.getQueryCache()`:
    - Listen for `updated` events where `queryKey` matches `['student', currentSid]` or `['students', currentUserId]`.
    - If new query data is present in cache, merge into `selectedStudent` and `students`.
    - If query was invalidated (`event.action?.type === 'invalidate'`), call `studentsAPI.get` (or `studentsAPI.list`) to refetch and update state.
    - Clean up subscription on unmount.
  - When `activeView === "generate"` and `selectedStudent` is updated, ensure `form.difficultyMarkers` and `form.barrierRows` synchronize immediately.

- [ ] **Step 3: Run tests and verify**
  - Run `npm test -- src/pages/IepGenerationPage.test.jsx`.
  - Verify all reactivity tests pass cleanly.

---

### Task 6: Full Verification & Regression Testing

**Files:**
- All modified files

- [ ] **Step 1: Run complete test suite**
  - Run `npm test -- --run` in `neuropath-frontend`.
  - Ensure all 51+ test suites pass with 100% success rate.

- [ ] **Step 2: Run linter**
  - Run `npm run lint` in `neuropath-frontend`.
  - Fix any lint warnings or formatting issues.

- [ ] **Step 3: Run production build**
  - Run `npm run build` in `neuropath-frontend`.
  - Ensure Vite build completes without errors.

- [ ] **Step 4: Report completion back to parent orchestrator**
  - Send message to parent orchestrator with full summary of changes, verified test outputs, and artifacts.
