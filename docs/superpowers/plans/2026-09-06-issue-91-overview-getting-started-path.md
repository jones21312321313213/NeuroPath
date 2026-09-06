# Overview Getting-Started 3-Step Teacher Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent "Getting started" 3-step path (Add student → Generate IEP → Use classroom tools) to the teacher Overview dashboard with progressive unlocking based on existing API data.

**Architecture:** Update `Overview.jsx` to render a 3-step getting started section between the welcome banner and the "At a glance" stats. Lock states are computed reactively from existing `counts.students` and `counts.ieps` (fetched via `studentsAPI.list` and `iepAPI.dashboardStats`). Add styling in `App.css` for the step cards, step badges, lock/unlock indicators, and action buttons. Add unit test coverage in `src/pages/Overview.test.jsx`.

**Tech Stack:** React 19, Vitest, React Testing Library, CSS (Tabler Icons).

## Global Constraints

- **Frontend only:** All changes are strictly limited to `neuropath-frontend/`. No backend modifications or new API endpoints.
- **Derive lock state from existing API data:** Use `studentsAPI.list()` for student count and `iepAPI.dashboardStats()` for IEP count.
- **Step 1:** "Add a student" is always unlocked, navigates to `create-student-profile`.
- **Step 2:** "Generate an IEP" is locked until `counts.students > 0`, navigates to `iep-generation`.
- **Step 3:** "Use classroom tools" is locked until `counts.ieps > 0`, navigates to `manage-lesson-plans`.
- **Copy:** Keep plain and short.
- **Verification:** Run `npm test` and `npm run build` in `neuropath-frontend/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `neuropath-frontend/src/pages/Overview.jsx` | **Modify.** Add the 3-step Getting Started section with dynamic lock states, plain copy, step badges, and action buttons routing to target screens via `setActivePage`. |
| `neuropath-frontend/src/App.css` | **Modify.** Add CSS styles for the Getting Started section: card grid, active vs locked card styling, status badges, lock icons, and action buttons. |
| `neuropath-frontend/src/pages/Overview.test.jsx` | **Create.** Vitest unit test suite verifying step rendering, progressive unlocking states (0 students, 1+ students & 0 IEPs, 1+ students & 1+ IEPs), and correct navigation calls. |

---

## Task 1: Create Unit Tests for Getting-Started 3-Step Path on Overview

**Files:**
- Create: `neuropath-frontend/src/pages/Overview.test.jsx`

**Interfaces:**
- Consumes: `Overview` component (`neuropath-frontend/src/pages/Overview.jsx`), `studentsAPI` and `iepAPI` (`neuropath-frontend/src/api/client.js`), `useAuth` (`neuropath-frontend/src/context/AuthContext.jsx`).
- Produces: Vitest test coverage for the Overview component and the 3-step path.

- [ ] **Step 1: Write the failing test**

Create `neuropath-frontend/src/pages/Overview.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Overview from "./Overview";
import { useAuth } from "../context/AuthContext";
import { studentsAPI, iepAPI } from "../api/client";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
  },
  iepAPI: {
    dashboardStats: vi.fn(),
  },
}));

// Mock CountUp and GlareHover to keep tests lightweight
vi.mock("../components/ui/CountUp", () => ({
  default: ({ to }) => <span>{to}</span>,
}));

vi.mock("../components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("Overview - Getting Started 3-Step Path", () => {
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
    });
  });

  it("renders Getting Started heading and all 3 steps", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    render(<Overview setActivePage={mockSetActivePage} />);

    expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. add a student/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. generate an iep/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. use classroom tools/i)).toBeInTheDocument();
  });

  it("with 0 students: Step 1 is active, Step 2 and Step 3 are locked", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(studentsAPI.list).toHaveBeenCalledWith(1);
    });

    // Step 1 button is enabled
    const step1Btn = screen.getByRole("button", { name: /add student/i });
    expect(step1Btn).toBeEnabled();
    await user.click(step1Btn);
    expect(mockSetActivePage).toHaveBeenCalledWith("create-student-profile");

    // Step 2 button is disabled
    const step2Btn = screen.getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeDisabled();

    // Step 3 button is disabled
    const step3Btn = screen.getByRole("button", { name: /use tools|open tools/i });
    expect(step3Btn).toBeDisabled();
  });

  it("with 1+ students and 0 IEPs: Step 1 & 2 are active, Step 3 is locked", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(studentsAPI.list).toHaveBeenCalled();
    });

    // Step 2 button is enabled and navigates to iep-generation
    const step2Btn = screen.getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeEnabled();
    await user.click(step2Btn);
    expect(mockSetActivePage).toHaveBeenCalledWith("iep-generation");

    // Step 3 button is still disabled
    const step3Btn = screen.getByRole("button", { name: /use tools|open tools/i });
    expect(step3Btn).toBeDisabled();
  });

  it("with 1+ students and 1+ IEPs: all 3 steps are unlocked and navigable", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 2, ai_insights: 1 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(iepAPI.dashboardStats).toHaveBeenCalled();
    });

    // Step 3 button is enabled and navigates to manage-lesson-plans
    const step3Btn = screen.getByRole("button", { name: /use tools|open tools/i });
    expect(step3Btn).toBeEnabled();
    await user.click(step3Btn);
    expect(mockSetActivePage).toHaveBeenCalledWith("manage-lesson-plans");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Overview.test.jsx`
Expected: FAIL because the Getting Started section is not yet implemented in `Overview.jsx`.

---

## Task 2: Implement Getting-Started 3-Step Section in Overview.jsx

**Files:**
- Modify: `neuropath-frontend/src/pages/Overview.jsx`

**Interfaces:**
- Consumes: `counts.students`, `counts.ieps`, `setActivePage`.
- Produces: 3-step getting started strip with derived lock states:
  - Step 1: `isUnlocked: true`, Action: `setActivePage("create-student-profile")`
  - Step 2: `isUnlocked: counts.students > 0`, Action: `setActivePage("iep-generation")`
  - Step 3: `isUnlocked: counts.ieps > 0`, Action: `setActivePage("manage-lesson-plans")`

- [ ] **Step 1: Update `Overview.jsx`**

Modify `neuropath-frontend/src/pages/Overview.jsx` to define the 3-step getting started configuration and render it cleanly between the welcome banner and the "At a glance" section:

```jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { studentsAPI, iepAPI } from "../api/client";
import CountUp from "../components/ui/CountUp";
import GlareHover from "../components/ui/GlareHover";

const stats = [
  {
    label: "Total Students",
    key: "students",
    icon: "ti-users",
    color: "#378ADD",
  },
  { label: "Active IEPs", key: "ieps", icon: "ti-file-text", color: "#1D9E75" },
  {
    label: "AI Insights Generated",
    key: "insights",
    icon: "ti-brain",
    color: "#7F77DD",
  },
  {
    label: "Upcoming Reviews",
    key: "reviews",
    icon: "ti-calendar-event",
    color: "#BA7517",
  },
];

const quickActions = [
  {
    label: "Create Student Profile",
    page: "create-student-profile",
    desc: "Add a new student with ASD background and learning preferences.",
    icon: "ti-user-plus",
    color: "#378ADD",
  },
  {
    label: "View All Students",
    page: "view-student-profile",
    desc: "Browse and manage existing student records.",
    icon: "ti-users",
    color: "#1D9E75",
  },
  {
    label: "Generate IEP",
    page: "iep-generation",
    desc: "Use AI to generate a personalized education plan.",
    icon: "ti-sparkles",
    color: "#7F77DD",
  },
];

export default function Overview({ setActivePage }) {
  const { user } = useAuth();
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });
  const [counts, setCounts] = useState({
    students: 0,
    ieps: 0,
    insights: 0,
    reviews: 0,
  });

  // Fetch total students
  useEffect(() => {
    if (!user?.id) return;
    studentsAPI
      .list(user.id)
      .then((data) => {
        const students = Array.isArray(data) ? data : [];
        setCounts((prev) => ({ ...prev, students: students.length }));
      })
      .catch(() => {});
  }, [user]);

  // Fetch active IEPs and AI insights counts from the dashboard-stats endpoint
  useEffect(() => {
    if (!user?.id) return;
    iepAPI
      .dashboardStats()
      .then((data) => {
        setCounts((prev) => ({
          ...prev,
          ieps: data.active_ieps ?? 0,
          insights: data.ai_insights ?? 0,
        }));
      })
      .catch(() => {});
  }, [user]);

  const hasStudents = counts.students > 0;
  const hasIeps = counts.ieps > 0;

  const gettingStartedSteps = [
    {
      stepNumber: 1,
      title: "1. Add a student",
      desc: "Create a student profile to start personalizing learning plans.",
      icon: "ti-user-plus",
      color: "#378ADD",
      page: "create-student-profile",
      actionLabel: "Add Student",
      isUnlocked: true,
      isCompleted: hasStudents,
      lockReason: "",
    },
    {
      stepNumber: 2,
      title: "2. Generate an IEP",
      desc: "Use AI to create an individualized education plan with target goals.",
      icon: "ti-sparkles",
      color: "#7F77DD",
      page: "iep-generation",
      actionLabel: "Generate IEP",
      isUnlocked: hasStudents,
      isCompleted: hasIeps,
      lockReason: "Requires at least one student profile",
    },
    {
      stepNumber: 3,
      title: "3. Use classroom tools",
      desc: "Generate tailored lesson plans, visual aids, and teaching strategies.",
      icon: "ti-books",
      color: "#1D9E75",
      page: "manage-lesson-plans",
      actionLabel: "Open Tools",
      isUnlocked: hasIeps,
      isCompleted: false,
      lockReason: "Requires a saved IEP",
    },
  ];

  return (
    <div className="page-content">
      <div className="overview-wrapper">
        {/* Welcome */}
        <div className="overview-welcome">
          <h1 className="overview-title">{greeting}, Teacher!</h1>
          <p className="overview-subtitle">
            Here's a summary of your NeuroPath dashboard. Follow the getting
            started path below to set up students, generate IEPs, and use
            classroom tools.
          </p>
        </div>

        {/* Getting Started Path */}
        <div className="overview-getting-started-section">
          <div className="overview-getting-started-header">
            <p className="overview-section-label" style={{ marginBottom: 0 }}>
              Getting started
            </p>
            <span className="overview-getting-started-hint">
              Follow these 3 steps to set up your classroom workflow
            </span>
          </div>
          <div className="getting-started-steps">
            {gettingStartedSteps.map((step) => {
              const isLocked = !step.isUnlocked;
              return (
                <div
                  key={step.stepNumber}
                  className={`getting-started-card ${isLocked ? "locked" : "active"} ${step.isCompleted ? "completed" : ""}`}
                >
                  <div className="getting-started-card-top">
                    <div className="getting-started-card-icon-wrap">
                      <i
                        className={`ti ${step.icon} getting-started-card-icon`}
                        style={{ color: isLocked ? "#94a3b8" : step.color }}
                        aria-hidden="true"
                      />
                    </div>
                    {step.isCompleted ? (
                      <span className="step-badge completed">
                        <i className="ti ti-check" aria-hidden="true" /> Done
                      </span>
                    ) : isLocked ? (
                      <span className="step-badge locked">
                        <i className="ti ti-lock" aria-hidden="true" /> Locked
                      </span>
                    ) : (
                      <span className="step-badge active">Active</span>
                    )}
                  </div>

                  <div className="getting-started-card-content">
                    <h3 className="getting-started-card-title">{step.title}</h3>
                    <p className="getting-started-card-desc">{step.desc}</p>
                  </div>

                  <div className="getting-started-card-footer">
                    {isLocked ? (
                      <div className="getting-started-lock-info">
                        <span className="getting-started-lock-text">
                          {step.lockReason}
                        </span>
                        <button
                          type="button"
                          className="getting-started-btn disabled"
                          disabled
                          aria-disabled="true"
                        >
                          <i className="ti ti-lock" aria-hidden="true" />{" "}
                          {step.actionLabel}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="getting-started-btn"
                        onClick={() => setActivePage(step.page)}
                      >
                        {step.actionLabel}
                        <i
                          className="ti ti-arrow-right getting-started-btn-arrow"
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <p className="overview-section-label">At a glance</p>
        <div className="overview-stats">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{ borderLeft: `3px solid ${s.color}` }}
            >
              <i
                className={`ti ${s.icon} stat-icon`}
                aria-hidden="true"
                style={{ color: s.color }}
              />
              <span className="stat-value">
                <CountUp
                  from={0}
                  to={counts[s.key]}
                  duration={1.5}
                  delay={0}
                  direction="up"
                />
              </span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p className="overview-section-label">Quick actions</p>
        <div className="quick-actions">
          {quickActions.map((a) => (
            <button
              key={a.page}
              className="quick-action-card"
              onClick={() => setActivePage(a.page)}
            >
              <i
                className={`ti ${a.icon} quick-action-icon`}
                aria-hidden="true"
                style={{ color: a.color }}
              />
              <div className="quick-action-header">
                <span className="quick-action-label">{a.label}</span>
                <i
                  className="ti ti-arrow-right quick-action-arrow"
                  aria-hidden="true"
                />
              </div>
              <span className="quick-action-desc">{a.desc}</span>
            </button>
          ))}
        </div>

        {/* About */}
        <p className="overview-section-label">About NeuroPath</p>
        <GlareHover
          width="100%"
          height="auto"
          background="#f0f8ff"
          borderRadius="12px"
          borderColor="rgba(130, 199, 255, 0.25)"
          glareColor="#82C7FF"
          glareOpacity={0.25}
          glareAngle={-30}
          glareSize={300}
          transitionDuration={800}
          playOnce={false}
          style={{ display: "block" }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <p className="overview-body">
              NeuroPath is a specialized platform designed to support educators
              and specialists working with students diagnosed with Autism
              Spectrum Disorder. It streamlines the creation and management of
              student profiles, tracks behavioral and academic progress, and
              leverages AI to generate individualized education plans — helping
              every student reach their full potential.
            </p>
          </div>
        </GlareHover>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/pages/Overview.test.jsx`
Expected: PASS

---

## Task 3: Add CSS Styles for Getting Started 3-Step Section

**Files:**
- Modify: `neuropath-frontend/src/App.css`

**Interfaces:**
- Produces: CSS classes for `.overview-getting-started-section`, `.getting-started-steps`, `.getting-started-card`, `.getting-started-btn`, `.step-badge`, etc.

- [ ] **Step 1: Add styles to `App.css`**

Add CSS definitions to `neuropath-frontend/src/App.css` under the Overview section:

```css
/* ── Overview Getting Started Path ───────────────────── */
.overview-getting-started-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-getting-started-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.overview-getting-started-hint {
  font-size: 12px;
  color: #64748b;
}

.getting-started-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.getting-started-card {
  background: #ffffff;
  border: 1px solid rgba(130, 199, 255, 0.35);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.getting-started-card.active:hover {
  transform: translateY(-2px);
  border-color: rgba(55, 138, 221, 0.6);
  box-shadow: 0 4px 12px rgba(55, 138, 221, 0.08);
}

.getting-started-card.locked {
  background: #f8fafc;
  border-color: #e2e8f0;
  opacity: 0.75;
}

.getting-started-card.completed {
  border-color: rgba(29, 158, 117, 0.35);
}

.getting-started-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.getting-started-card-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f0f8ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.getting-started-card.locked .getting-started-card-icon-wrap {
  background: #f1f5f9;
}

.getting-started-card-icon {
  font-size: 18px;
}

.step-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.step-badge.active {
  background: #e0f2fe;
  color: #0284c7;
}

.step-badge.completed {
  background: #dcfce7;
  color: #15803d;
}

.step-badge.locked {
  background: #f1f5f9;
  color: #64748b;
}

.getting-started-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px;
}

.getting-started-card.locked .getting-started-card-title {
  color: #64748b;
}

.getting-started-card-desc {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.getting-started-card-footer {
  margin-top: auto;
  padding-top: 6px;
}

.getting-started-lock-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.getting-started-lock-text {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

.getting-started-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: #378add;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.getting-started-btn:hover:not(:disabled) {
  background: #2b77c4;
}

.getting-started-btn-arrow {
  font-size: 12px;
  transition: transform 0.15s;
}

.getting-started-btn:hover:not(:disabled) .getting-started-btn-arrow {
  transform: translateX(3px);
}

.getting-started-btn.disabled,
.getting-started-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  border: none;
}

@media (max-width: 900px) {
  .getting-started-steps {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Run tests & lint**

Run:
```bash
npm test
npm run lint
npm run build
```
Expected: All tests pass, lint passes with 0 errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Overview.jsx src/pages/Overview.test.jsx src/App.css
git commit -m "feat(overview): add 3-step teacher getting-started path (#91)"
```

---

## Task 4: Full Verification & PR Preparation

**Files:**
- None (verification and git operations)

- [ ] **Step 1: Run full test suite & build check**

```bash
npm test
npm run build
```

- [ ] **Step 2: Self-review against Acceptance Criteria**
- New login lands on Overview showing the 3-step path without external docs: Verified.
- With zero students, only step 1 is fully active: Verified.
- After students/IEPs exist, later steps unlock appropriately: Verified.
- Buttons navigate to correct screens: Verified.
- No backend/API changes: Verified.

- [ ] **Step 3: Push branch and create PR**

Use `gh pr create` with base `development`, title `feat: add overview getting-started 3-step teacher path (#91)`, and the template specified by user.
