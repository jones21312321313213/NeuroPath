# Mandatory Parental Consent on Student Profile Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Philippine Republic Act 10173 (Data Privacy Act of 2012) compliance by making parental/guardian consent mandatory during Student Profile creation, removing the optional checkbox toggle, and requiring all guardian and consent agreement fields before form progression and submission.

**Architecture:** In `CreateStudentProfile.jsx`, remove the conditional render toggle (`{form.parentalConsentObtained && ...}`) in Section A so that Guardian Full Name, Guardian Relationship, and Consent Verification Date fields are always displayed. Update the Consent Agreement/Statement checkbox to serve as an affirmative confirmation requirement (`parentalConsentObtained`). Enforce strict client-side validation on Step 1 requiring all four fields before advancing to Step 2 or submitting.

**Tech Stack:** React 19, React Router v7, Vitest, React Testing Library, ESLint

## Global Constraints

- In compliance with Republic Act 10173 (Data Privacy Act of 2012), parental/guardian consent must be mandatory upon creation of a student profile rather than an optional checkbox toggle.
- Remove the checkbox toggle for parental consent.
- Require parental/guardian consent fields (Guardian Full Name, Relationship, Consent Verification Date, Consent Agreement/Statement) as mandatory required fields before a student profile can be submitted.
- Preserve backward-compatible payload schema for `studentsAPI.create`.
- Zero axe accessibility violations in UI components.

---

### Task 1: Refactor `CreateStudentProfile.jsx` to Enforce Mandatory Parental Consent

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx:365-385,460-470,635-697`

**Interfaces:**
- Consumes: Form state properties `guardianName`, `guardianRelationship`, `consentDate`, `parentalConsentObtained`
- Produces: Always-visible RA 10173 consent fields in Step 1, mandatory Step 1 validation preventing advance if any consent field is missing, and submittable payload with `parental_consent_obtained: true`

- [x] **Step 1: Write the failing test for mandatory consent validation**

Add unit tests in `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx` verifying that Step 1 blocks advancing if Guardian Full Name, Guardian Relationship, Consent Verification Date, or Consent Agreement/Statement is missing.

```javascript
  it("blocks advancing from Step 1 if guardian name is empty", async () => {
    render(
      <MemoryRouter>
        <CreateStudentProfile onBack={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter student name"), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter age"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter grade level"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /^gender:/i }), {
      target: { value: "Male" },
    });
    fireEvent.click(screen.getByLabelText(/Difficulty in Seeing/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(
      await screen.findByText(/Guardian name is required/i),
    ).toBeInTheDocument();
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/CreateStudentProfile.test.jsx -t "blocks advancing from Step 1 if guardian name is empty"`
Expected: FAIL because current implementation only validates guardian name when `form.parentalConsentObtained` is true.

- [x] **Step 3: Implement mandatory consent in `CreateStudentProfile.jsx`**

1. Remove the conditional `{form.parentalConsentObtained && (...)}` wrapper so `Guardian Full Name`, `Guardian Relationship`, and `Consent Verification Date` are unconditionally rendered in the RA 10173 section.
2. Update the checkbox label to `Consent Agreement / Statement: I confirm that parental/guardian consent has been verified and obtained for this learner in compliance with Republic Act 10173.`
3. Update `validateStepOne`:
   - Validate `form.guardianName.trim()`: if empty, set error `"Guardian name is required."`
   - Validate `form.guardianRelationship.trim()`: if empty, set error `"Guardian relationship is required."`
   - Validate `form.consentDate.trim()`: if empty, set error `"Consent date is required."`
   - Validate `form.parentalConsentObtained`: if false, set error `"Parental/guardian consent agreement / statement is required."`
4. Update `handleSubmit` payload:
   - `parental_consent_obtained: true` (since verified and mandatory)
   - `consent_date: form.consentDate`
   - `guardian_name: form.guardianName.trim()`
   - `guardian_relationship: form.guardianRelationship || "Parent"`
   - `studentProfileDetails.guardianName = form.guardianName.trim()`
   - `studentProfileDetails.guardianRelationship = form.guardianRelationship || "Parent"`
   - `studentProfileDetails.consentDate = form.consentDate`
   - `studentProfileDetails.parentalConsentObtained = true`
   - `studentProfileDetails.consentAgreement = true`

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/CreateStudentProfile.test.jsx -t "blocks advancing from Step 1 if guardian name is empty"`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/CreateStudentProfile.jsx neuropath-frontend/src/pages/CreateStudentProfile.test.jsx
git commit -m "refactor(frontend): require mandatory parental consent on student profile creation (#152)"
```

---

### Task 2: Align All Tests & Validate Full Test Suite and Accessibility

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `CreateStudentProfile` component
- Produces: 100% passing test suite covering mandatory parental consent fields, step 1 validation, step 2 submission, next-step CTAs, and a11y compliance.

- [x] **Step 1: Write/update tests for mandatory parental consent**

Update tests in `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`:
- Update `fillAndSubmitValidForm` to fill `guardianName` and check the Consent Agreement / Statement checkbox.
- Update `it("proceeds to Step 2 when difficulty markers are selected and shows AI goal drafting help texts")` to fill guardian fields and consent.
- Update `it("captures RA 10173 consent and includes consent fields in creation payload")` to assert guardian fields are always visible without toggle and sent in payload.
- Add `it("blocks advancing from Step 1 if consent agreement / statement is not confirmed")`.
- Add `it("blocks advancing from Step 1 if consent date is empty")`.
- Add `it("blocks advancing from Step 1 if guardian relationship is empty")`.

- [x] **Step 2: Run all frontend tests**

Run: `npx vitest run src/pages/CreateStudentProfile.test.jsx`
Expected: 100% PASS with 0 failures

- [x] **Step 3: Run accessibility tests**

Run: `npx vitest run src/test/a11y.test.jsx`
Expected: PASS (0 axe violations)

- [x] **Step 4: Run ESLint**

Run: `npx eslint src/pages/CreateStudentProfile.jsx src/pages/CreateStudentProfile.test.jsx`
Expected: 0 errors, 0 warnings

- [x] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/CreateStudentProfile.test.jsx
git commit -m "test(frontend): add test coverage for mandatory parental consent fields and validation (#152)"
```
