# RA 10173 Consent Reader & Student Profile Validation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive RA 10173 Parental Consent & Disclosure Agreement Reader with gated verification in `CreateStudentProfile` and `UpdateStudentProfile`, and resolve premature Step 2 validation errors while ensuring the viewport smoothly auto-scrolls to validation error alerts and Step headers.

**Architecture:** 
- A dedicated, accessible modal component (`Ra10173ConsentModal`) utilizing the shared `Modal` primitive to disclose statutory data collection categories, educational purposes, automated AI safeguards, storage encryption, and parental rights under Philippine RA 10173.
- Gated consent state (`hasReadConsent`) that disables the consent checkbox and displays a `Pending Review` badge until the modal is acknowledged, at which point the badge updates to `✓ Agreement Reviewed` and the checkbox is unlocked.
- Validation and navigation lifecycle fixes in `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx` with an `errorRef` that smoothly scrolls the viewport to error banners on validation failure, scrolls to the top of Section B upon advancing to Step 2, and isolates Step 1 vs. Step 2 validation to prevent premature Step 2 error messages.

**Tech Stack:** React 18, Vite, Vitest, React Testing Library, Tailwind CSS / Vanilla CSS, Heroicons SVG icons (`icons.jsx`).

## Global Constraints
- Must conform to Philippine Republic Act 10173 (Data Privacy Act of 2012) and National Privacy Commission statutory disclosure requirements.
- Must preserve existing form field names and payload structures sent to `studentsAPI.create` and `studentsAPI.update`.
- Zero unicode emojis; all iconography must use accessible SVGs (`aria-hidden="true"` or semantic `aria-label`).
- 100% test pass rate across Vitest and Django test suites.

---

### Task 1: Create `Ra10173ConsentModal` Component and Unit Tests

**Files:**
- Create: `neuropath-frontend/src/components/Ra10173ConsentModal.jsx`
- Create: `neuropath-frontend/src/components/__tests__/Ra10173ConsentModal.test.jsx`

**Interfaces:**
- Consumes: `Modal`, `Button`, `icons.jsx` (`DocumentTextIcon`, `ShieldCheckIcon`, `LockIcon`, `PrinterIcon`, `CheckIcon`)
- Produces: `<Ra10173ConsentModal isOpen={boolean} onClose={function} onConfirm={function} />`

- [ ] **Step 1: Write the failing unit tests for `Ra10173ConsentModal`**
Create `neuropath-frontend/src/components/__tests__/Ra10173ConsentModal.test.jsx` testing:
  1. Renders when `isOpen={true}` with full RA 10173 disclosures (Data Categories, Educational Purpose, AI Processing Safeguards, Security & Storage, Parental Rights).
  2. Does not render when `isOpen={false}`.
  3. Clicking "I Have Read & Understood the Terms" calls `onConfirm` and `onClose`.
  4. Clicking the print button invokes `window.print()`.
  5. Clicking Close/Cancel calls `onClose`.

- [ ] **Step 2: Run test to verify it fails**
Command: `cmd.exe /c "npm test -- src/components/__tests__/Ra10173ConsentModal.test.jsx --run"`
Expected: FAIL (Cannot find module `Ra10173ConsentModal`).

- [ ] **Step 3: Implement `Ra10173ConsentModal.jsx`**
Build `Ra10173ConsentModal.jsx` with clean layout, Heroicons, 5 statutory disclosure sections, print action, and acknowledgment button.

- [ ] **Step 4: Run test to verify it passes**
Command: `cmd.exe /c "npm test -- src/components/__tests__/Ra10173ConsentModal.test.jsx --run"`
Expected: PASS (All tests passing).

- [ ] **Step 5: Commit**
```bash
git add neuropath-frontend/src/components/Ra10173ConsentModal.jsx neuropath-frontend/src/components/__tests__/Ra10173ConsentModal.test.jsx
git commit -m "feat(profile): create accessible RA 10173 consent agreement modal (#188)"
```

---

### Task 2: Implement Gated Consent Checkbox, Modal Integration, and Auto-Scroll Validation in `CreateStudentProfile.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Test: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `Ra10173ConsentModal`, `errorRef`, `window.scrollTo`, `scrollIntoView`
- Produces: Gated checkbox verification, agreement review button and badge, auto-scroll to error banner on validation failure, smooth scroll to top on Step 2 entry.

- [ ] **Step 1: Write the failing unit tests in `CreateStudentProfile.test.jsx`**
Add tests in `CreateStudentProfile.test.jsx` verifying:
  1. The RA 10173 consent checkbox is disabled initially and shows a `Pending Review` badge.
  2. Clicking "Read Full Consent Agreement" opens `Ra10173ConsentModal`.
  3. Confirming the modal unlocks the checkbox and updates the badge to `✓ Agreement Reviewed`.
  4. When validation fails in Step 1, `scrollIntoView` is called on the error alert container.
  5. Clicking NEXT with valid Step 1 advances to Step 2, scrolls to top, and does not prematurely trigger Step 2 validation errors.

- [ ] **Step 2: Run tests to verify they fail**
Command: `cmd.exe /c "npm test -- src/pages/CreateStudentProfile.test.jsx --run"`
Expected: FAIL (Expectation for disabled checkbox or modal triggers fail).

- [ ] **Step 3: Implement changes in `CreateStudentProfile.jsx`**
  1. Update `CheckOption` to support `disabled` attribute and styling.
  2. Add `hasReadConsent` and `showConsentModal` states.
  3. Render `Ra10173ConsentModal`.
  4. Add "Read Full Consent Agreement" button with status badge (`Pending Review` vs. `✓ Agreement Reviewed`).
  5. Disable consent checkbox when `!hasReadConsent`.
  6. Add `errorRef = useRef(null)` attached to `{error && <div ref={errorRef} className="iep-alert iep-alert-error" ...>}`.
  7. In `validateStepOne()`, call `errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })` on error.
  8. In `handleNext()`, isolate Step 1 validation, clear error, transition to Step 2, and call `window.scrollTo({ top: 0, behavior: 'smooth' })`.
  9. In `handleSubmit()`, prevent premature submission if `step !== 2`, and scroll to `errorRef` if `validateStepTwo()` fails.

- [ ] **Step 4: Run tests to verify they pass**
Command: `cmd.exe /c "npm test -- src/pages/CreateStudentProfile.test.jsx --run"`
Expected: PASS (All tests passing).

- [ ] **Step 5: Commit**
```bash
git add neuropath-frontend/src/pages/CreateStudentProfile.jsx neuropath-frontend/src/pages/CreateStudentProfile.test.jsx
git commit -m "feat(profile): gate RA 10173 consent and fix validation scrolling in create student profile (#188, #189)"
```

---

### Task 3: Implement Gated Consent and Validation Scrolling in `UpdateStudentProfile.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/__tests__/UpdateStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `Ra10173ConsentModal`, `errorRef`, `window.scrollTo`, `scrollIntoView`
- Produces: Gated consent flow and error auto-scrolling in edit mode.

- [ ] **Step 1: Write failing unit test in `UpdateStudentProfile.test.jsx`**
Add tests verifying:
  1. Pre-existing consent in student profile pre-populates `hasReadConsent` as true.
  2. Reviewing agreement modal unlocks consent updates if consent was pending.
  3. Validation errors trigger auto-scroll to the error banner.

- [ ] **Step 2: Run test to verify it fails**
Command: `cmd.exe /c "npm test -- src/pages/StudentProfiling/__tests__/UpdateStudentProfile.test.jsx --run"`
Expected: FAIL.

- [ ] **Step 3: Implement updates in `UpdateStudentProfile.jsx`**
Wire `Ra10173ConsentModal`, `hasReadConsent`, `showConsentModal`, `errorRef`, and smooth error scrolling.

- [ ] **Step 4: Run test to verify it passes**
Command: `cmd.exe /c "npm test -- src/pages/StudentProfiling/__tests__/UpdateStudentProfile.test.jsx --run"`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx neuropath-frontend/src/pages/StudentProfiling/__tests__/UpdateStudentProfile.test.jsx
git commit -m "feat(profile): integrate RA 10173 consent reader and error scrolling in update student profile (#188, #189)"
```

---

### Task 4: Full Test Suite Verification, Linter Check & PR Creation

**Files:**
- Review: Entire repository diff against `development`

- [ ] **Step 1: Run full frontend test suite**
Command: `cmd.exe /c "npm test"`
Expected: 100% passing across all 39+ test suites.

- [ ] **Step 2: Run linter and production build**
Command: `cmd.exe /c "npm run lint && npm run build"`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Push branch and create Pull Request**
Create PR adhering to repository PR template, linking both Issue #188 and Issue #189.
