# Issue #90 — Student Form Help Text and Difficulty Readiness Warning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intro banner, field-level AI guidance help text, and difficulty readiness validation block to Create and Update Student Profile forms in `neuropath-frontend`.

**Architecture:** Extend `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx` with an informative intro banner and help text under AI-contributing fields (Step 1 difficulty markers: "Needed before Generate IEP"; Step 2 qualitative fields: "Used by AI when drafting goals"). Enforce validation in Step 1 requiring at least one difficulty marker. Add CSS styles in `App.css` and create Vitest component tests.

**Tech Stack:** React 19, Vite, Vitest, `@testing-library/react`, `@testing-library/jest-dom`, CSS3.

## Global Constraints

- Frontend changes only in `neuropath-frontend` (no backend changes).
- Validation must block proceeding to Step 2 / saving if no difficulty marker is checked, with error message: `"Please select at least one difficulty marker (needed before Generate IEP)."`.
- Intro text: `"NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts."`.
- Field help text: `"Used by AI when drafting goals"` on Step 2 evaluation, strengths, needs, parental concerns, and curriculum impact.
- Difficulty help text: `"Needed before Generate IEP"`.
- All Vitest frontend tests must pass (`npm test`).
- Commit after each task.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `neuropath-frontend/src/App.css` | Modify | Add `.iep-form-intro`, `.iep-field-help`, `.iep-field-help-block` CSS classes |
| `neuropath-frontend/src/pages/CreateStudentProfile.jsx` | Modify | Add intro banner, help text, difficulty marker validation block |
| `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx` | Create | Vitest component tests for CreateStudentProfile help text & validation |
| `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx` | Modify | Add intro banner, help text, difficulty marker validation block |
| `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx` | Create | Vitest component tests for UpdateStudentProfile help text & validation |
| `.github/pull_request_template.md` | Create / Verify | Ensure GitHub PR template matches repository guidelines |

---

## Task 1: Add help text, intro banner, and difficulty marker validation to `CreateStudentProfile.jsx`

**Files:**
- Modify: `neuropath-frontend/src/App.css`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Create: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`

**Interfaces:**
- `TextAreaField` accepts `helpText` optional prop and renders `<span className="iep-field-help">{helpText}</span>`.
- `validateStepOne` checks `form.difficultyMarkers.length > 0` before advancing.

- [ ] **Step 1: Write failing test in `CreateStudentProfile.test.jsx`**

Create `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateStudentProfile from "./CreateStudentProfile";
import { AuthContext } from "../context/AuthContext";
import { studentsAPI } from "../api/client";

vi.mock("../api/client", () => ({
  studentsAPI: {
    create: vi.fn(),
  },
}));

function renderComponent() {
  const fakeAuth = {
    user: { id: 1, email: "teacher@test.com" },
    token: "token123",
  };
  return render(
    <AuthContext.Provider value={fakeAuth}>
      <CreateStudentProfile onBack={vi.fn()} />
    </AuthContext.Provider>
  );
}

describe("CreateStudentProfile Help Text & Difficulty Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the intro banner and difficulty help text on Step 1", () => {
    renderComponent();
    expect(
      screen.getByText(/NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Needed before Generate IEP/i)
    ).toBeInTheDocument();
  });

  it("blocks proceeding to Step 2 if difficulty markers are empty", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/Enter student name/i), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter age/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter grade level/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Gender:/i }), {
      target: { value: "Male" },
    });

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Please select at least one difficulty marker \(needed before Generate IEP\)\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Section A: Personal Information/i)).toBeInTheDocument();
  });

  it("proceeds to Step 2 when difficulty markers are selected and shows AI goal drafting help texts", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/Enter student name/i), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter age/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter grade level/i), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Gender:/i }), {
      target: { value: "Male" },
    });

    const diffCheckbox = screen.getByLabelText(/Difficulty in Seeing/i);
    fireEvent.click(diffCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Present Levels of Academic Achievement/i)
    ).toBeInTheDocument();

    const aiHelpTexts = screen.getAllByText(/Used by AI when drafting goals/i);
    expect(aiHelpTexts.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run from `neuropath-frontend`:
```bash
npm test src/pages/CreateStudentProfile.test.jsx
```
Expected: FAIL because intro banner and difficulty validation block are not yet implemented.

- [ ] **Step 3: Update `App.css` and `CreateStudentProfile.jsx`**

In `neuropath-frontend/src/App.css`, add styles for `.iep-form-intro` and `.iep-field-help`:
```css
.iep-form-intro {
  background: #f0f7ff;
  border: 1px solid #cce3fd;
  color: #1e4265;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.88rem;
  line-height: 1.45;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.iep-form-intro-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.iep-field-help {
  display: block;
  font-size: 0.78rem;
  color: #4a7a94;
  margin-top: -2px;
  margin-bottom: 6px;
  font-weight: 500;
}

.iep-small-title-help {
  font-size: 0.8rem;
  font-weight: 500;
  color: #2589c7;
  margin-left: 6px;
}
```

In `neuropath-frontend/src/pages/CreateStudentProfile.jsx`:
- Update `TextAreaField` to take `helpText`:
```jsx
function TextAreaField({ label, placeholder, value, onChange, rows = 3, helpText }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-textarea"
      />
    </div>
  );
}
```
- In `validateStepOne()`, add difficulty marker check:
```jsx
    if (!form.difficultyMarkers || form.difficultyMarkers.length === 0) {
      setError(
        "Please select at least one difficulty marker (needed before Generate IEP)."
      );
      return false;
    }
```
- Render the intro banner right after `iep-step-header` and before `<form>`:
```jsx
        <div className="iep-form-intro">
          <span className="iep-form-intro-icon">💡</span>
          <div>
            <strong>Tip:</strong> NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts.
          </div>
        </div>
```
- In Step 1 difficulties section, add help text:
```jsx
              <div>
                <h3 className="iep-small-title">
                  Difficulties — mark the appropriate box based on assessment
                  <span className="iep-small-title-help">
                    (Needed before Generate IEP)
                  </span>
                </h3>
                <div className="iep-check-grid">
```
- In Step 2, pass `helpText="Used by AI when drafting goals"` to the qualitative fields (`presentEvaluation`, `academicStrengths`, `academicNeeds`, `parentalConcerns`, `curriculumImpact`).

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm test src/pages/CreateStudentProfile.test.jsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/App.css neuropath-frontend/src/pages/CreateStudentProfile.jsx neuropath-frontend/src/pages/CreateStudentProfile.test.jsx
git commit -m "feat(frontend): add intro banner, help text, and difficulty validation to CreateStudentProfile (#90)"
```

---

## Task 2: Add help text, intro banner, and difficulty marker validation to `UpdateStudentProfile.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Create: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`

**Interfaces:**
- `UpdateStudentProfile` displays the intro banner, difficulty marker help text, qualitative field help text, and validates `difficultyMarkers.length > 0` in `validateStepOne`.

- [ ] **Step 1: Write failing test in `UpdateStudentProfile.test.jsx`**

Create `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateStudentProfile from "./UpdateStudentProfile";
import { studentsAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  studentsAPI: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

const mockStudent = {
  id: "student-123",
  name: "Maria Clara",
  age: 9,
  grade: 3,
  gender: "Female",
  diagnosis: "Autism Spectrum Disorder",
  support_needs: "Visual schedule",
  assessmentResult: "Standard evaluation",
  profileDetails: {
    school: "Central School",
    schoolYear: "2025 - 2026",
    learnerName: "Maria Clara",
    birthdate: "05-12-2017",
    disabilityCategory: "Autism Spectrum Disorder",
    diagnosisDetails: "ASD Level 1",
    difficultyMarkers: ["Difficulty in Seeing"],
    presentEvaluation: "Good auditory comprehension",
    academicStrengths: "Math calculation",
    academicNeeds: "Reading comprehension",
    parentalConcerns: "Social interaction",
    curriculumImpact: "Requires visual aids",
  },
};

describe("UpdateStudentProfile Help Text & Difficulty Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders intro banner and difficulty help text when loaded", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    expect(
      await screen.findByText(/NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Needed before Generate IEP/i)
    ).toBeInTheDocument();
  });

  it("blocks advancing to Step 2 if all difficulty markers are unchecked", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    await screen.findByDisplayValue("Maria Clara");

    const diffCheckbox = screen.getByLabelText(/Difficulty in Seeing/i);
    expect(diffCheckbox).toBeChecked();
    fireEvent.click(diffCheckbox); // uncheck

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Please select at least one difficulty marker \(needed before Generate IEP\)\./i)
    ).toBeInTheDocument();
  });

  it("shows AI goal drafting help texts in Step 2", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    await screen.findByDisplayValue("Maria Clara");

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Present Levels of Academic Achievement/i)
    ).toBeInTheDocument();

    const aiHelpTexts = screen.getAllByText(/Used by AI when drafting goals/i);
    expect(aiHelpTexts.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run from `neuropath-frontend`:
```bash
npm test src/pages/StudentProfiling/UpdateStudentProfile.test.jsx
```
Expected: FAIL.

- [ ] **Step 3: Update `UpdateStudentProfile.jsx`**

In `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`:
- Update `TextAreaField` to support `helpText`:
```jsx
function TextAreaField({ label, placeholder, value, onChange, rows = 3, helpText }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-textarea gray-input"
      />
    </div>
  );
}
```
- In `validateStepOne()`, add difficulty marker check:
```jsx
    if (!form.difficultyMarkers || form.difficultyMarkers.length === 0) {
      setError(
        "Please select at least one difficulty marker (needed before Generate IEP)."
      );
      return false;
    }
```
- Render the intro banner right after `iep-step-header`:
```jsx
        <div className="iep-form-intro">
          <span className="iep-form-intro-icon">💡</span>
          <div>
            <strong>Tip:</strong> NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts.
          </div>
        </div>
```
- In Step 1 difficulties heading:
```jsx
            <div>
              <h3 className="iep-small-title">
                Difficulties — mark the appropriate box based on assessment
                <span className="iep-small-title-help">
                  (Needed before Generate IEP)
                </span>
              </h3>
              <div className="iep-check-grid">
```
- In Step 2, add `helpText="Used by AI when drafting goals"` to `presentEvaluation`, `academicStrengths`, `academicNeeds`, `parentalConcerns`, and `curriculumImpact`.

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm test src/pages/StudentProfiling/UpdateStudentProfile.test.jsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx
git commit -m "feat(frontend): add intro banner, help text, and difficulty validation to UpdateStudentProfile (#90)"
```

---

## Task 3: PR Template Verification & Full Test Suite

**Files:**
- Create / Verify: `.github/pull_request_template.md`

- [ ] **Step 1: Check PR template**

Ensure `.github/pull_request_template.md` exists and contains the required template format specified in the user request.

- [ ] **Step 2: Run all frontend tests and lint**

Run from `neuropath-frontend`:
```bash
npm test
npm run lint
```
Expected: All tests pass (8 test files), zero lint errors.

- [ ] **Step 3: Commit if template modified/added**

```bash
git add .github/pull_request_template.md
git commit -m "chore: ensure pull request template matches repository standard"
```

---

## Task 4: Whole-Branch Verification & PR Creation

- [ ] **Step 1: Run whole-branch verification**

Run:
```bash
cd neuropath-frontend; npm test; npm run lint
```

- [ ] **Step 2: Check git status and branch cleanliness**

Run:
```bash
git status
```
Expected: clean working directory.
