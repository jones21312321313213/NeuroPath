# Issue #90 — Student Form Help Text and Difficulty Readiness Warning — Design Specification

**Issue:** #90 — `[FE] [FEAT]: student form help text and difficulty readiness warning`  
**Date:** 2026-09-06  
**Status:** In Review  

---

## 1. Context & Problem Statement

The school-style student profile form in NeuroPath captures student data used downstream by AI IEP generation. However:
1. Teachers currently receive no visual cue indicating which fields directly inform the AI generation engine.
2. Profiles can currently be created or updated with empty `difficultyMarkers`. When a teacher later navigates to **Generate IEP**, generation fails or yields degraded results because difficulty markers are required.
3. Teachers need plain, non-technical guidance directly on the form so they provide rich, relevant input.

---

## 2. Proposed Changes & Architecture

All changes are strictly **frontend-only** in `neuropath-frontend`.

### 2.1 Intro Banner (Create & Update Forms)
- Display a prominent yet clean intro banner at the top of the student form in both `CreateStudentProfile` and `UpdateStudentProfile`:
  > **Note:** "NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts."

### 2.2 Difficulty Markers Section & Readiness Validation
- **Help Text:** Under the "Difficulties" heading in Step 1, display plain help text:  
  `"Needed before Generate IEP"` (e.g., "At least one difficulty marker is needed before Generate IEP.")
- **Validation Rule:** In `validateStepOne()`, verify `form.difficultyMarkers.length > 0`.
  - If empty, block advancement to Step 2 and display a clear inline error:  
    `"Please select at least one difficulty marker (needed before Generate IEP)."`
- Both `CreateStudentProfile` and `UpdateStudentProfile` enforce this validation.

### 2.3 AI-Related Form Fields (Step 2)
- Provide a `helpText` prop to `TextAreaField` (or render below each relevant field label) displaying:  
  `"Used by AI when drafting goals"`
- Applied to:
  1. Results of initial or most recent evaluation / school assessments (`presentEvaluation`)
  2. Academic, developmental, and/or functional strengths (`academicStrengths`)
  3. Academic, developmental, and/or functional needs (`academicNeeds`)
  4. Parental concerns regarding the child's education (`parentalConcerns`)
  5. Impact of disability on general education curriculum (`curriculumImpact`)

### 2.4 Styling & UX Consistency
- Add clean styling in CSS (`App.css` or scoped CSS) matching existing design tokens (`.iep-form-intro`, `.iep-field-help`, `.iep-helper-text`).
- Clear contrast and teacher-friendly layout without visual clutter.

---

## 3. Testing Strategy

1. **Unit & Component Tests (`vitest` + `@testing-library/react`):**
   - Test `CreateStudentProfile.test.jsx`:
     - Renders intro banner and difficulty help text in Step 1.
     - Blocks moving to Step 2 when difficulty markers are not selected.
     - Allows moving to Step 2 when all required Step 1 fields (including at least one difficulty marker) are provided.
     - Renders "Used by AI when drafting goals" help text on Step 2 qualitative fields.
     - Submits successfully with complete payload.
   - Test `UpdateStudentProfile.test.jsx`:
     - Renders intro banner and difficulty help text.
     - Blocks saving if difficulty markers are cleared.
     - Validates Step 2 fields and submits update payload.
2. **Regression Verification:** Run entire frontend test suite with `npm test`.

---

## 4. Definition of Done Checklist

- [ ] Intro banner added to Create and Update student profile forms.
- [ ] Help text added to difficulty markers ("Needed before Generate IEP").
- [ ] Validation block enforces at least one difficulty marker before moving to Step 2 / saving.
- [ ] "Used by AI when drafting goals" help text added to Step 2 qualitative fields.
- [ ] No backend changes.
- [ ] Frontend test suites created and passing.
- [ ] PR template (`pull_request_template.md` or `.github/pull_request_template.md`) checked and PR created.
