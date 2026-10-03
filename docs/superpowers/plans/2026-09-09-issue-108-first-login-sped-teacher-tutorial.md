# First-Login SPED Teacher Tutorial Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an interactive 5-step onboarding walkthrough modal for SPED teachers on their first login to NeuroPath, persisting completion status in the backend so it is permanently dismissed across all devices on subsequent logins.

**Architecture:** 
1. **Backend (`neuropath-backend`):** Add `has_completed_tutorial` boolean field (default: `False`) to the `Teacher` model with a Django migration. Include `has_completed_tutorial` in the `TeacherLoginController` response payload. Expose an authenticated `POST /api/users/tutorial-complete/` endpoint to toggle `has_completed_tutorial = True`. Add unit tests in `users/tests.py`.
2. **Frontend (`neuropath-frontend`):** Expose `completeTutorial()` in `usersAPI` (`client.js`) and `markTutorialComplete()` in `AuthContext.jsx` (updating local React state and `localStorage`). Build an accessible, 5-step `TeacherTutorialModal` component (Welcome & Philosophy, Student Profiling, AI IEP Generation, Classroom Support, Outcome Monitoring) using educator-friendly terminology without ML jargon. Mount the modal in `Dashboard` (`App.jsx`), gated strictly by `user?.has_completed_tutorial === false`. Add Vitest unit test coverage for `TeacherTutorialModal`, `AuthContext`, and `App.jsx`.

**Tech Stack:** Django, Django REST Framework, React 19, React Router 7, Vitest, React Testing Library, CSS.

---

## Global Constraints

- **Educator-Friendly Copy:** Use clear, pedagogical terms (e.g., "Student Strengths & Accommodations", "IEP Goals", "Instructional Materials", "Outcome Tracking"); avoid technical/ML jargon (e.g., "LLM", "embeddings", "prompts", "neural nets").
- **No Demo Data Seeding:** Do not seed mock students or demo records into the user's account.
- **Strict First-Login Gating:** Modal must appear only when `user.has_completed_tutorial === false`. Once finished or skipped, `POST /api/users/tutorial-complete/` must be invoked and the modal must never be accessible again.
- **Clean Fallback & Optimistic UI:** If the network request fails during completion/dismissal, locally set `has_completed_tutorial: true` in localStorage so the user is never trapped in a tutorial loop.
- **Verification:** Backend tests run via `python manage.py test users`, frontend tests via `npm test`, and frontend production build via `npm run build`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `neuropath-backend/users/models.py` | **Modify.** Add `has_completed_tutorial = models.BooleanField(default=False)` to `Teacher` model. |
| `neuropath-backend/users/migrations/0004_teacher_has_completed_tutorial.py` | **Create.** Django migration for adding `has_completed_tutorial` to `Teacher`. |
| `neuropath-backend/users/views.py` | **Modify.** Return `has_completed_tutorial` in `TeacherLoginController`, add `TeacherTutorialCompleteController` at `POST /api/users/tutorial-complete/`. |
| `neuropath-backend/users/urls.py` | **Modify.** Register route `path('tutorial-complete/', TeacherTutorialCompleteController.as_view(), name='teacher-tutorial-complete')`. |
| `neuropath-backend/users/tests.py` | **Modify.** Add unit tests verifying login response contains `has_completed_tutorial`, and `POST /api/users/tutorial-complete/` marks the field `True`. |
| `neuropath-frontend/src/api/client.js` | **Modify.** Add `completeTutorial()` under `usersAPI`. |
| `neuropath-frontend/src/context/AuthContext.jsx` | **Modify.** Add `markTutorialComplete()` callback to AuthContext. |
| `neuropath-frontend/src/components/TeacherTutorialModal.jsx` | **Create.** 5-step walkthrough modal component with step progress, back/next navigation, skip, finish, and accessible dialog markup. |
| `neuropath-frontend/src/components/TeacherTutorialModal.test.jsx` | **Create.** Unit tests for step transitions, dismiss button, and complete button. |
| `neuropath-frontend/src/App.css` | **Modify.** Add modal overlay, card styling, step indicators, and button styles for `TeacherTutorialModal`. |
| `neuropath-frontend/src/App.jsx` | **Modify.** Mount `TeacherTutorialModal` in `Dashboard` when `user?.has_completed_tutorial === false`. |
| `neuropath-frontend/src/App.test.jsx` | **Create.** Unit tests verifying tutorial modal mounts on first login and disappears once marked complete. |

---

## Task 1: Backend Model & Database Migration

**Files:**
- Modify: `neuropath-backend/users/models.py:4-13`
- Create: `neuropath-backend/users/migrations/0004_teacher_has_completed_tutorial.py`

**Interfaces:**
- Consumes: Django `models.Model`
- Produces: `has_completed_tutorial` field on `Teacher` model

- [ ] **Step 1: Update `Teacher` model**

Modify `neuropath-backend/users/models.py`:
```python
class Teacher(models.Model):
    teacherID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    passwordHash = models.CharField(max_length=255)
    createdDate = models.DateTimeField(auto_now_add=True)
    has_completed_tutorial = models.BooleanField(default=False)

    def __str__(self):
        return self.name
```

- [ ] **Step 2: Create Django Migration**

Create `neuropath-backend/users/migrations/0004_teacher_has_completed_tutorial.py`:
```python
# Generated by Django on 2026-09-09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_relax_student_profile_and_profiledetails'),
    ]

    operations = [
        migrations.AddField(
            model_name='teacher',
            name='has_completed_tutorial',
            field=models.BooleanField(default=False),
        ),
    ]
```

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/users/models.py neuropath-backend/users/migrations/0004_teacher_has_completed_tutorial.py
git commit -m "feat(backend): add has_completed_tutorial field to Teacher model"
```

---

## Task 2: Backend Login Payload and Tutorial Complete Endpoint

**Files:**
- Modify: `neuropath-backend/users/views.py`
- Modify: `neuropath-backend/users/urls.py`
- Modify: `neuropath-backend/users/tests.py`

**Interfaces:**
- Consumes: `get_teacher_for_user`, `IsAuthenticated`, `Teacher`
- Produces: `POST /api/users/tutorial-complete/`, updated `POST /api/users/login/` payload with `"has_completed_tutorial"`

- [ ] **Step 1: Write backend unit tests in `neuropath-backend/users/tests.py`**

Add the test class to `neuropath-backend/users/tests.py`:
```python
class TeacherTutorialEndpointTests(APITestCase):
    """Tests for has_completed_tutorial in login payload and POST /api/users/tutorial-complete/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="newteacher@example.com",
            email="newteacher@example.com",
            password="securepassword123",
            first_name="Jane",
            last_name="Doe",
        )
        self.teacher = Teacher.objects.create(
            email="newteacher@example.com",
            name="Jane Doe",
            passwordHash=self.user.password,
            has_completed_tutorial=False,
        )
        self.token = Token.objects.create(user=self.user)
        self.login_url = reverse("teacher-login")
        self.tutorial_url = reverse("teacher-tutorial-complete")

    def test_login_returns_has_completed_tutorial_false_for_new_teacher(self):
        response = self.client.post(
            self.login_url,
            {"email": "newteacher@example.com", "password": "securepassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("teacher", response.data)
        self.assertIn("has_completed_tutorial", response.data["teacher"])
        self.assertFalse(response.data["teacher"]["has_completed_tutorial"])

    def test_tutorial_complete_requires_authentication(self):
        response = self.client.post(self.tutorial_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_tutorial_complete_updates_teacher_record(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post(self.tutorial_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("has_completed_tutorial"))
        self.teacher.refresh_from_db()
        self.assertTrue(self.teacher.has_completed_tutorial)

    def test_login_returns_has_completed_tutorial_true_after_completion(self):
        self.teacher.has_completed_tutorial = True
        self.teacher.save()

        response = self.client.post(
            self.login_url,
            {"email": "newteacher@example.com", "password": "securepassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["teacher"]["has_completed_tutorial"])
```

- [ ] **Step 2: Update `TeacherLoginController` and implement `TeacherTutorialCompleteController` in `neuropath-backend/users/views.py`**

In `neuropath-backend/users/views.py`:
1. Update `TeacherLoginController.post()`:
```python
        if user is not None:
            # 🎯 Generate or fetch the Token
            token, created = Token.objects.get_or_create(user=user)
            teacher = get_teacher_for_user(user)
            
            return Response({
                "message": "Login successful",
                "token": token.key, # 🎯 Return token to React
                "teacher": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "has_completed_tutorial": teacher.has_completed_tutorial if teacher else False,
                }
            }, status=status.HTTP_200_OK)
```

2. Add `TeacherTutorialCompleteController` to `neuropath-backend/users/views.py`:
```python
# =====================================================================
# TEACHER TUTORIAL COMPLETE
# POST /api/users/tutorial-complete/
# Marks has_completed_tutorial = True for the authenticated teacher.
# =====================================================================
class TeacherTutorialCompleteController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            # If no mirror teacher row exists, create or resolve it safely
            teacher, _ = Teacher.objects.get_or_create(
                email=request.user.email.strip().lower(),
                defaults={
                    "name": f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                    "passwordHash": request.user.password,
                    "has_completed_tutorial": True,
                },
            )

        teacher.has_completed_tutorial = True
        teacher.save(update_fields=["has_completed_tutorial"])

        return Response(
            {
                "message": "Tutorial marked as completed.",
                "has_completed_tutorial": True,
            },
            status=status.HTTP_200_OK,
        )
```

- [ ] **Step 3: Register route in `neuropath-backend/users/urls.py`**

In `neuropath-backend/users/urls.py`:
```python
from django.urls import path
from .views import (
    StudentProfileListCreateView, 
    ProfileUpdateController,
    ProfileViewController,
    AIInsightController,
    TeacherCreateController,
    TeacherLoginController,
    TeacherLogoutController,
    TeacherProfileUpdateController,
    TeacherTutorialCompleteController,
)

urlpatterns = [
    path('register/', TeacherCreateController.as_view(), name='teacher-register'),
    path('login/', TeacherLoginController.as_view(), name='teacher-login'),
    path('logout/', TeacherLogoutController.as_view(), name='teacher-logout'),
    path('tutorial-complete/', TeacherTutorialCompleteController.as_view(), name='teacher-tutorial-complete'),
    
    path('teachers/', TeacherCreateController.as_view(), name='teacher-create'),
    
    #students
    path('students/', StudentProfileListCreateView.as_view(), name='student-create-list'),
    path('students/<int:pk>/', ProfileUpdateController.as_view(), name='student-detail-update'),
    path('students/<int:pk>/view/', ProfileViewController.as_view(), name='student-view'),
    path('students/<int:pk>/generate-insight/', AIInsightController.as_view(), name='student-generate-insight'),
    path('profile/update/', TeacherProfileUpdateController.as_view(), name='teacher-profile-update'),
]
```

- [ ] **Step 4: Commit**

```bash
git add neuropath-backend/users/views.py neuropath-backend/users/urls.py neuropath-backend/users/tests.py
git commit -m "feat(backend): add tutorial-complete endpoint and include has_completed_tutorial in login"
```

---

## Task 3: Frontend API Client and AuthContext Integration

**Files:**
- Modify: `neuropath-frontend/src/api/client.js:244-257`
- Modify: `neuropath-frontend/src/context/AuthContext.jsx`

**Interfaces:**
- Consumes: `POST /api/users/tutorial-complete/`
- Produces: `usersAPI.completeTutorial()`, `useAuth().markTutorialComplete()`

- [ ] **Step 1: Add `completeTutorial` to `usersAPI` in `neuropath-frontend/src/api/client.js`**

Modify `neuropath-frontend/src/api/client.js`:
```javascript
// ── Users / Teacher Profile ────────────────────────────────────────────────────
export const usersAPI = {
  // PATCH /api/users/profile/update/
  updateProfile: (payload) => {
    const isFormData =
      typeof FormData !== "undefined" && payload instanceof FormData;
    return request("/users/profile/update/", {
      method: "PATCH",
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },
  // POST /api/users/tutorial-complete/
  completeTutorial: () =>
    request("/users/tutorial-complete/", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
```

- [ ] **Step 2: Add `markTutorialComplete` in `neuropath-frontend/src/context/AuthContext.jsx`**

Modify `neuropath-frontend/src/context/AuthContext.jsx`:
```javascript
  // ── Mark tutorial complete ──────────────────────────────
  const markTutorialComplete = useCallback(async () => {
    try {
      await usersAPI.completeTutorial();
    } catch (err) {
      console.error("Failed to persist tutorial completion to server:", err);
    } finally {
      // Optimistically update local React state and localStorage so the user is never re-prompted
      const updated = {
        ...user,
        has_completed_tutorial: true,
      };
      try {
        localStorage.setItem("neuropath_user", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist updated user to localStorage:", e);
      }
      setUser(updated);
    }
  }, [user]);
```
And update `AuthContext.Provider`'s `value`:
```javascript
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        markTutorialComplete,
        isAuthenticated: !!user,
      }}
```

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/context/AuthContext.jsx
git commit -m "feat(frontend): add completeTutorial client method and markTutorialComplete context action"
```

---

## Task 4: Create `TeacherTutorialModal` Component and Styles

**Files:**
- Create: `neuropath-frontend/src/components/TeacherTutorialModal.jsx`
- Create: `neuropath-frontend/src/components/TeacherTutorialModal.test.jsx`
- Modify: `neuropath-frontend/src/App.css`

**Interfaces:**
- Consumes: `onComplete: () => void` prop
- Produces: Accessible 5-step SPED walkthrough modal with navigation, skip, finish actions, and indicator badges.

- [ ] **Step 1: Write unit tests for `TeacherTutorialModal`**

Create `neuropath-frontend/src/components/TeacherTutorialModal.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherTutorialModal from "./TeacherTutorialModal";

describe("TeacherTutorialModal", () => {
  it("renders step 1 (Welcome & Philosophy) initially", () => {
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to neuropath/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip walkthrough/i })).toBeInTheDocument();
  });

  it("navigates forward through all 5 SPED workflow steps and finishes", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    // Step 1 -> Step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/student profiling/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/ai iep generation/i)).toBeInTheDocument();

    // Step 3 -> Step 4
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 4 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/classroom support/i)).toBeInTheDocument();

    // Step 4 -> Step 5
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/outcome monitoring/i)).toBeInTheDocument();

    // Step 5 has Finish button instead of Next
    const finishBtn = screen.getByRole("button", { name: /get started/i });
    expect(finishBtn).toBeInTheDocument();

    await user.click(finishBtn);
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it("navigates backward when clicking Previous button", async () => {
    const user = userEvent.setup();
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    // Move to step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();

    // Move back to step 1
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("calls onComplete when clicking Skip Walkthrough", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    await user.click(screen.getByRole("button", { name: /skip walkthrough/i }));
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Implement `TeacherTutorialModal.jsx`**

Create `neuropath-frontend/src/components/TeacherTutorialModal.jsx`:
```jsx
import { useState } from "react";

const TUTORIAL_STEPS = [
  {
    step: 1,
    badge: "Step 1 of 5",
    title: "Welcome to NeuroPath",
    subtitle: "Empowering SPED teachers with purposeful instructional planning",
    description:
      "NeuroPath connects each stage of your special education workflow into a cohesive pedagogical path: from comprehensive student profiling, to individualized IEP goal creation, differentiated classroom resources, and longitudinal progress tracking.",
    icon: "🌟",
    highlights: [
      "Teacher-centered, individualized workflow",
      "Designed specifically for Special Education classrooms",
      "Clear, actionable tools to support every learner",
    ],
  },
  {
    step: 2,
    badge: "Step 2 of 5",
    title: "1. Comprehensive Student Profiling",
    subtitle: "Capture learning strengths, sensory needs, and accommodations",
    description:
      "Begin by creating or reviewing student profiles. Record foundational assessment data, functional strengths, behavioral needs, and parental input. This rich profile serves as the single source of truth for all downstream tools.",
    icon: "👤",
    highlights: [
      "Document present levels of academic & functional performance",
      "Detail environmental and sensory accommodations",
      "Directly informs AI-assisted IEP goals and lesson materials",
    ],
  },
  {
    step: 3,
    badge: "Step 3 of 5",
    title: "2. Intelligent IEP Goal Generation",
    subtitle: "Draft SMART goals aligned with student present levels",
    description:
      "Transform profile data into targeted, measurable IEP goals and objective benchmarks. Review and refine AI-drafted goals to match each student's specific curriculum grade standards and individualized needs.",
    icon: "📋",
    highlights: [
      "Generates SMART (Specific, Measurable, Attainable, Relevant, Time-bound) goals",
      "Aligned with Section A profile data and present performance levels",
      "Full teacher control to review, edit, or regenerate goals",
    ],
  },
  {
    step: 4,
    badge: "Step 4 of 5",
    title: "3. Classroom Instructional Support",
    subtitle: "Generate differentiated lesson plans, visual aids, & strategies",
    description:
      "Put IEP accommodations into practice immediately. Generate adapted lesson plans, visual schedules, communication boards, and evidence-based teaching strategies tailored to your students.",
    icon: "🎨",
    highlights: [
      "Customized lesson plans with accommodations built in",
      "Visual schedules and choice boards ready to export",
      "Specialized behavioral and pedagogical strategies",
    ],
  },
  {
    step: 5,
    badge: "Step 5 of 5",
    title: "4. Outcome & Progress Monitoring",
    subtitle: "Track goal mastery and celebrate student growth",
    description:
      "Log observations, trial data, and assessment results over time. Visualize progress toward annual IEP goals to make data-informed instructional adjustments and prepare for review meetings.",
    icon: "📈",
    highlights: [
      "Ongoing mastery tracking for each active IEP goal",
      "Visual progress charts and trends across subjects",
      "Exportable summary records for team and parent conferences",
    ],
  },
];

export default function TeacherTutorialModal({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div
      className="tutorial-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div className="tutorial-modal-container">
        {/* Header */}
        <div className="tutorial-modal-header">
          <div className="tutorial-badge">{currentStep.badge}</div>
          <button
            type="button"
            className="tutorial-skip-btn"
            onClick={onComplete}
            aria-label="Skip walkthrough"
          >
            Skip Walkthrough
          </button>
        </div>

        {/* Progress Bar */}
        <div className="tutorial-progress-bar" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={5}>
          {TUTORIAL_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className={`tutorial-progress-segment ${
                idx <= currentStepIndex ? "active" : ""
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="tutorial-modal-body">
          <div className="tutorial-icon-wrapper" aria-hidden="true">
            <span className="tutorial-icon">{currentStep.icon}</span>
          </div>

          <h2 id="tutorial-modal-title" className="tutorial-title">
            {currentStep.title}
          </h2>
          <h3 className="tutorial-subtitle">{currentStep.subtitle}</h3>

          <p className="tutorial-description">{currentStep.description}</p>

          <div className="tutorial-highlights-box">
            <h4 className="tutorial-highlights-heading">Key Capabilities:</h4>
            <ul className="tutorial-highlights-list">
              {currentStep.highlights.map((highlight, idx) => (
                <li key={idx} className="tutorial-highlight-item">
                  <span className="tutorial-check-icon">✓</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="tutorial-modal-footer">
          <button
            type="button"
            className="btn-tutorial-secondary"
            onClick={handlePrev}
            disabled={isFirstStep}
          >
            Previous
          </button>

          <button
            type="button"
            className="btn-tutorial-primary"
            onClick={handleNext}
          >
            {isLastStep ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add CSS Styles in `neuropath-frontend/src/App.css`**

Add styling to `neuropath-frontend/src/App.css`:
```css
/* =====================================================================
   TEACHER TUTORIAL WALKTHROUGH MODAL
   ===================================================================== */
.tutorial-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.2s ease-out;
}

.tutorial-modal-container {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tutorial-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem 0.75rem;
}

.tutorial-badge {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #4338ca;
  background: #eef2ff;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  letter-spacing: 0.025em;
}

.tutorial-skip-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.15s ease;
}

.tutorial-skip-btn:hover {
  color: #0f172a;
  text-decoration: underline;
}

.tutorial-progress-bar {
  display: flex;
  gap: 6px;
  padding: 0 1.75rem;
  margin-top: 0.5rem;
}

.tutorial-progress-segment {
  height: 4px;
  flex: 1;
  background-color: #e2e8f0;
  border-radius: 9999px;
  transition: background-color 0.25s ease;
}

.tutorial-progress-segment.active {
  background-color: #4f46e5;
}

.tutorial-modal-body {
  padding: 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.tutorial-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.tutorial-icon {
  font-size: 2rem;
}

.tutorial-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem;
}

.tutorial-subtitle {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #6366f1;
  margin: 0 0 1rem;
}

.tutorial-description {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #475569;
  margin-bottom: 1.25rem;
  text-align: left;
}

.tutorial-highlights-box {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  text-align: left;
}

.tutorial-highlights-heading {
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #64748b;
  margin: 0 0 0.5rem;
}

.tutorial-highlights-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tutorial-highlight-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #334155;
}

.tutorial-check-icon {
  color: #16a34a;
  font-weight: bold;
}

.tutorial-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.75rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

.btn-tutorial-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tutorial-secondary:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-tutorial-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-tutorial-primary {
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-tutorial-primary:hover {
  background: #4338ca;
}
```

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/components/TeacherTutorialModal.jsx neuropath-frontend/src/components/TeacherTutorialModal.test.jsx neuropath-frontend/src/App.css
git commit -m "feat(frontend): add TeacherTutorialModal component, styles, and unit tests"
```

---

## Task 5: Mount Tutorial Modal in Dashboard and Gate by First Login

**Files:**
- Modify: `neuropath-frontend/src/App.jsx:119-158`
- Create: `neuropath-frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `useAuth() -> { user, markTutorialComplete }`, `<TeacherTutorialModal />`
- Produces: First-login modal presentation gated strictly by `user?.has_completed_tutorial === false`

- [ ] **Step 1: Write unit tests for first-login gating in `neuropath-frontend/src/App.test.jsx`**

Create `neuropath-frontend/src/App.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";

vi.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: vi.fn(),
}));

// Mock heavy subcomponents
vi.mock("./pages/Overview", () => ({
  default: () => <div>Overview Page Content</div>,
}));

describe("App First-Login Tutorial Modal Integration", () => {
  const mockMarkTutorialComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TeacherTutorialModal when user has_completed_tutorial is false", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to neuropath/i)).toBeInTheDocument();
  });

  it("does NOT render TeacherTutorialModal when user has_completed_tutorial is true", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "returningteacher@example.com",
        has_completed_tutorial: true,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/overview page content/i)).toBeInTheDocument();
  });

  it("calls markTutorialComplete when Skip Walkthrough is clicked", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /skip walkthrough/i }));
    expect(mockMarkTutorialComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Update `Dashboard` in `neuropath-frontend/src/App.jsx` to render `TeacherTutorialModal`**

In `neuropath-frontend/src/App.jsx`:
1. Import `TeacherTutorialModal`:
```jsx
import TeacherTutorialModal from "./components/TeacherTutorialModal";
```
2. In `Dashboard()` function:
```jsx
function Dashboard() {
  const { user, markTutorialComplete } = useAuth();
  const [activePage, setActivePage] = useState("home");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("neuropath_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("neuropath_sidebar_collapsed", String(next));
      return next;
    });
  };

  const showTutorial = user && user.has_completed_tutorial === false;

  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {showTutorial && (
        <TeacherTutorialModal onComplete={markTutorialComplete} />
      )}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="main-area">
        <Topbar
          breadcrumb={breadcrumbMap[activePage] || "DASHBOARD / Home"}
          setActivePage={setActivePage}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        {renderPage(
          activePage,
          setActivePage,
          selectedStudentId,
          setSelectedStudentId,
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/App.jsx neuropath-frontend/src/App.test.jsx
git commit -m "feat(frontend): mount TeacherTutorialModal in Dashboard gated by first login status"
```

---

## Task 6: Full Verification and Build Checks

**Files:** None (verification step)

- [ ] **Step 1: Run full frontend test suite**

Run: `npm test` in `neuropath-frontend`
Expected: All tests pass without errors.

- [ ] **Step 2: Run frontend production build**

Run: `npm run build` in `neuropath-frontend`
Expected: Production build succeeds.

- [ ] **Step 3: Commit any final test adjustments**

```bash
git commit --allow-empty -m "chore: verify frontend tests and build for first-login teacher walkthrough"
```
