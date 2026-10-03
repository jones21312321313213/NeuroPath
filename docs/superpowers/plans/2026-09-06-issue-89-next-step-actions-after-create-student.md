# Next-Step Actions After Create Student Success Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide clear next-step actions (Generate IEP, View Student Profile, Add Another Student) in a modal/panel after a teacher successfully creates a student profile, replacing the dead-end "Done" button.

**Architecture:** 
1. Update `CreateStudentProfile.jsx` so its success modal displays 3 distinct next-step action buttons:
   - Primary: **Generate IEP for this student** (`generate-iep` route with newly created student context)
   - Secondary: **View student profile** (`view-student-detail` route with newly created student context)
   - Tertiary: **Add another student** (resets the form fields and step state to allow immediate batch entry)
2. Pass navigation callbacks and student ID setters from `App.jsx` to `CreateStudentProfile` and `IEPGenerationPage`.
3. Support pre-selecting a student via `initialStudentId` in `IEPGenerationPage.jsx` so navigating from create student directly loads the newly created student.
4. Comprehensive unit testing in Vitest + React Testing Library for all CTAs and workflows.

**Tech Stack:** React 19, React Router v7, Vitest, React Testing Library, Tailwind CSS / NeuroPath theme.

## Global Constraints

- Frontend only: changes strictly limited to `neuropath-frontend`
- No backend or API schema changes
- Support both direct next-action routing and batch student entry
- Maintain existing project styling and accessibility guidelines

---

### Task 1: Add Unit Tests for CreateStudentProfile Next-Step Actions

**Files:**
- Create: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `CreateStudentProfile` component from `neuropath-frontend/src/pages/CreateStudentProfile.jsx`, mocked `studentsAPI` from `../api/client`, and `useAuth` from `../context/AuthContext`.
- Produces: Test suite covering success modal presentation and all three action CTAs ("Generate IEP for this student", "View student profile", "Add another student").

- [ ] **Step 1: Write the failing tests in CreateStudentProfile.test.jsx**

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateStudentProfile from "./CreateStudentProfile";
import { studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  studentsAPI: {
    create: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("CreateStudentProfile next-step actions", () => {
  const onBack = vi.fn();
  const setActivePage = vi.fn();
  const setSelectedStudentId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, name: "Test Teacher" } });
  });

  async function fillAndSubmitValidForm(user) {
    // Step 1 fields
    await user.type(screen.getByPlaceholderText("Enter student name"), "Alex Smith");
    await user.type(screen.getByPlaceholderText("Enter age"), "8");
    await user.type(screen.getByPlaceholderText("Enter grade level"), "3");
    await user.selectOptions(screen.getByRole("combobox", { name: /^gender:/i }), "Male");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2 fields
    await user.type(
      screen.getByPlaceholderText(/the learner fails to finish tasks/i),
      "Recent evaluation details...",
    );
    await user.type(
      screen.getByPlaceholderText(/the learner can spell random words/i),
      "Strong academic strengths...",
    );
    await user.type(
      screen.getByPlaceholderText(/needs structured routines/i),
      "Specific learner needs...",
    );
    await user.type(
      screen.getByPlaceholderText(/write concerns shared by the parent/i),
      "Parental concerns notes...",
    );
    await user.type(
      screen.getByPlaceholderText(/the learner has difficulty concentrating/i),
      "Curriculum impact notes...",
    );

    await user.click(screen.getByRole("button", { name: /submit/i }));
  }

  it("shows success modal with primary, secondary, and tertiary next-step CTAs upon successful creation", async () => {
    studentsAPI.create.mockResolvedValueOnce({ studentID: 101, name: "Alex Smith" });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    expect(await screen.findByText(/Profile Created!/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Smith/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate iep for this student/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view student profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add another student/i })).toBeInTheDocument();
  });

  it("navigates to Generate IEP with student context when primary CTA is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({ studentID: 101, name: "Alex Smith" });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const generateBtn = await screen.findByRole("button", { name: /generate iep for this student/i });
    await user.click(generateBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("generate-iep");
  });

  it("navigates to View Profile with student context when secondary CTA is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({ studentID: 101, name: "Alex Smith" });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const viewBtn = await screen.findByRole("button", { name: /view student profile/i });
    await user.click(viewBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("view-student-detail");
  });

  it("resets the form and returns to step 1 for batch entry when 'Add another student' is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({ studentID: 101, name: "Alex Smith" });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const addAnotherBtn = await screen.findByRole("button", { name: /add another student/i });
    await user.click(addAnotherBtn);

    expect(screen.queryByText(/Profile Created!/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter student name")).toHaveValue("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/pages/CreateStudentProfile.test.jsx` in `neuropath-frontend`
Expected: FAIL due to missing CTA buttons in `CreateStudentProfile.jsx`.

---

### Task 2: Update `CreateStudentProfile.jsx` with Next-Step Actions

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`

**Interfaces:**
- Consumes: Props `{ onBack, setActivePage, setSelectedStudentId }`
- Produces: Enhanced `SuccessModal` with:
  - Primary CTA: "Generate IEP for this student" -> sets `selectedStudentId` and navigates to `"generate-iep"`
  - Secondary CTA: "View student profile" -> sets `selectedStudentId` and navigates to `"view-student-detail"`
  - Tertiary CTA: "Add another student" -> resets form and dismisses modal

- [ ] **Step 1: Update `SuccessModal` and `CreateStudentProfile` in `CreateStudentProfile.jsx`**

Update `SuccessModal` to take:
```jsx
function SuccessModal({
  studentName,
  onGenerateIEP,
  onViewProfile,
  onAddAnother,
})
```
Render all three styled CTAs cleanly with clear hierarchy.
Capture the created student's ID from the `studentsAPI.create(payload)` response:
```jsx
const created = await studentsAPI.create(payload);
const createdId = created?.studentID || created?.id || created?.pk || null;
setCreatedStudent({ id: createdId, name: form.learnerName });
setShowSuccessModal(true);
```
Wire handlers:
- `handleGenerateIEP`:
  ```jsx
  if (createdStudent?.id && setSelectedStudentId) {
    setSelectedStudentId(createdStudent.id);
  }
  if (setActivePage) {
    setActivePage("generate-iep");
  }
  ```
- `handleViewProfile`:
  ```jsx
  if (createdStudent?.id && setSelectedStudentId) {
    setSelectedStudentId(createdStudent.id);
  }
  if (setActivePage) {
    setActivePage("view-student-detail");
  }
  ```
- `handleAddAnother`:
  ```jsx
  setShowSuccessModal(false);
  setStep(1);
  setError("");
  setCreatedStudent(null);
  setForm({ ...initialState });
  ```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test src/pages/CreateStudentProfile.test.jsx` in `neuropath-frontend`
Expected: PASS

- [ ] **Step 3: Commit Task 2 changes**

```bash
git add neuropath-frontend/src/pages/CreateStudentProfile.jsx neuropath-frontend/src/pages/CreateStudentProfile.test.jsx
git commit -m "feat: add next-step action buttons after create student success (#89)"
```

---

### Task 3: Support `initialStudentId` in `IEPGenerationPage.jsx` and Wire `App.jsx`

**Files:**
- Modify: `neuropath-frontend/src/App.jsx`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`

**Interfaces:**
- `App.jsx`: Passes `setActivePage` and `setSelectedStudentId` to `CreateStudentProfile`, and passes `initialStudentId={selectedStudentId}` to `IEPGenerationPage`.
- `IEPGenerationPage.jsx`: Accepts `initialStudentId` prop and automatically selects that student once students are loaded.

- [ ] **Step 1: Update `App.jsx`**

Ensure `renderPage` passes:
```jsx
case "create-student-profile":
  return (
    <CreateStudentProfile
      onBack={() => setActivePage("overview")}
      setActivePage={setActivePage}
      setSelectedStudentId={setSelectedStudentId}
    />
  );
case "iep-generation":
case "generate-iep":
  return (
    <IEPGenerationPage
      mode="generate"
      initialStudentId={selectedStudentId}
    />
  );
case "view-iep":
  return (
    <IEPGenerationPage
      mode="view"
      initialStudentId={selectedStudentId}
    />
  );
```

- [ ] **Step 2: Update `IEPGenerationPage.jsx` to pre-select `initialStudentId`**

Add `initialStudentId` to props:
```jsx
export default function IEPGenerationPage({ mode = "generate", initialStudentId = null }) {
```
In `load()` student fetching and when `initialStudentId` changes:
```jsx
useEffect(() => {
  if (!initialStudentId || !students.length) return;
  const found = students.find(
    (s) => String(getStudentId(s)) === String(initialStudentId),
  );
  if (found) {
    setSelectedStudent(found);
    setSearchTerm(getStudentName(found));
  }
}, [initialStudentId, students]);
```
Also handle initial student selection when `students` load in the student list fetch.

- [ ] **Step 3: Run all frontend tests to ensure no regressions**

Run: `npm test` in `neuropath-frontend`
Expected: PASS (All test suites passing).

- [ ] **Step 4: Commit Task 3 changes**

```bash
git add neuropath-frontend/src/App.jsx neuropath-frontend/src/pages/IepGenerationPage.jsx
git commit -m "feat: wire student context between create student and iep generation (#89)"
```

---

### Task 4: Comprehensive Verification & PR Preparation

**Files:**
- Modify/Review: `neuropath-frontend` files
- Create: `.github/pull_request_template.md` (or verify PR template)

- [ ] **Step 1: Run full test suite and build**

```bash
npm test
npm run build
```
Verify build succeeds with zero errors or warnings.

- [ ] **Step 2: Verify pull request template**

Ensure `.github/pull_request_template.md` exists and matches the specified format:
```markdown
## 🔗 Linked Issue

Closes #89

## Summary

<!-- Replace this text with a summary of the feature you're adding -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactor (code cleanup, performance improvements, etc.)

## How Has This Been Tested?

- [x] Unit tests
- [ ] Integration tests
- [x] Manual verification

## Screenshots (if applicable)

## Checklist

- [x] My code follows the project's style guidelines.
- [x] I have performed a self-review of my own code.
- [x] I have commented my code, particularly in hard-to-understand areas.
- [x] I have updated the documentation accordingly.
- [x] My changes generate no new warnings.
```

- [ ] **Step 3: Handoff to user for manual testing and branch completion**
