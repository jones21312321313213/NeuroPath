# Interactive Progress Logging and Outcome Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement interactive progress logging and executive KPI outcome monitoring in the View Progress Dashboard with automatic baseline progress seeding upon IEP creation.

**Architecture:** Extend backend `IEPGenerationAPIView` to automatically extract identified student difficulties and seed initial baseline `StudentProgress` records upon IEP finalization. Add accessible `RecordProgressModal` and executive KPI summary metric cards (Overall Mastery Rate, Goals on Track, Needs Support, Last Evaluated) to frontend `ViewProgressDashboard.jsx`, integrated with `trackingAPI.recordProgress` for seamless dynamic chart updates.

**Tech Stack:** React 19, React Router v7, Django 6, Django REST Framework, Vitest, Testing Library, Vanilla CSS (NeuroPath Blue theme).

## Global Constraints
- Only authenticated teachers can view, seed, or record progress entries for their assigned students (multi-tenant isolation and RA 10173 compliance).
- Performance score must be validated within range 0% to 100%.
- Progress dashboard must update dynamically without full page reloads when new progress entries are recorded.
- High-level executive KPI cards must compute:
  - Overall Mastery Rate: Average percentage across all student domains.
  - Goals on Track: Count of subjects with progress $\ge 70\%$.
  - Needs Support: Count of subjects with progress $< 70\%$.
  - Last Evaluated: Formatted date of the most recent evaluation.
- All automated tests across backend and frontend must pass with 100% green status.

---

### Task 1: Auto-Seed Initial Baseline Progress on IEP Creation (Backend)

**Files:**
- Modify: `neuropath-backend/iep_management/views.py:140-155`
- Test: `neuropath-backend/iep_management/tests/test_iep_progress_baseline.py`

**Interfaces:**
- Consumes: `IEPModel.difficulties`, `IEPModel.generatedDetails['barrierRows']`, `StudentProfile.profileDetails['difficultyMarkers']`
- Produces: Baseline `StudentProgress` records with default initial score (e.g. 40%) for each unique difficulty domain upon IEP save

- [ ] **Step 1: Write backend unit tests for initial baseline seeding**

```python
# In neuropath-backend/iep_management/tests/test_iep_progress_baseline.py
import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import Teacher, StudentProfile
from tracking.models import StudentProgress
from iep_management.models import IEPModel

class IEPBaselineProgressSeedingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teacher_seed@test.com',
            email='teacher_seed@test.com',
            password='password123'
        )
        self.teacher = Teacher.objects.create(
            name='Seed Teacher',
            email='teacher_seed@test.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            teacher=self.teacher,
            name='Baseline Learner',
            age=9,
            grade=3,
            profileDetails={'difficultyMarkers': ['Mathematics', 'Reading Comprehension']}
        )
        self.client.force_authenticate(user=self.user)

    def test_saving_iep_seeds_baseline_student_progress_records(self):
        payload = {
            'action': 'save',
            'studentID': self.student.pk,
            'difficulties': 'Mathematics\nReading Comprehension',
            'generatedDetails': {
                'barrierRows': [
                    {'difficulty': 'Mathematics'},
                    {'difficulty': 'Reading Comprehension'}
                ]
            }
        }
        response = self.client.post('/api/iep/generate-iep/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify StudentProgress rows were created
        progress_entries = StudentProgress.objects.filter(student=self.student)
        self.assertGreaterEqual(progress_entries.count(), 2)

        subjects = list(progress_entries.values_list('subjectName', flat=True))
        self.assertIn('Mathematics', subjects)
        self.assertIn('Reading Comprehension', subjects)

        for entry in progress_entries:
            self.assertEqual(entry.performanceScore, 40)
```

- [ ] **Step 2: Run backend test to verify it fails before implementation**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test_db.sqlite3"; python manage.py test iep_management.tests.test_iep_progress_baseline`
Expected: FAIL (`AssertionError: 0 not greater than or equal to 2`)

- [ ] **Step 3: Implement baseline progress seeding in `IEPGenerationAPIView`**

Modify `neuropath-backend/iep_management/views.py`:
```python
# In IEPGenerationAPIView post method (action == 'save'):
from tracking.models import StudentProgress

# Extract difficulty domains to seed baseline
raw_difficulties = []
if iep_instance.difficulties:
    for line in iep_instance.difficulties.splitlines():
        for item in line.split(','):
            d = item.strip()
            if d:
                raw_difficulties.append(d)
if isinstance(iep_instance.generatedDetails, dict) and 'barrierRows' in iep_instance.generatedDetails:
    for r in iep_instance.generatedDetails['barrierRows']:
        if isinstance(r, dict) and r.get('difficulty'):
            d = str(r['difficulty']).strip()
            if d:
                raw_difficulties.append(d)

if not raw_difficulties and student_obj.profileDetails:
    markers = student_obj.profileDetails.get('difficultyMarkers', [])
    raw_difficulties.extend([str(m).strip() for m in markers if str(m).strip()])

if not raw_difficulties:
    raw_difficulties = ['General']

seen_domains = set()
for domain in raw_difficulties:
    norm = domain.strip()
    if norm.lower() not in seen_domains:
        seen_domains.add(norm.lower())
        StudentProgress.objects.get_or_create(
            student=student_obj,
            subjectName=norm,
            defaults={'performanceScore': 40}
        )
```

- [ ] **Step 4: Run backend test to verify it passes**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test_db.sqlite3"; python manage.py test iep_management.tests.test_iep_progress_baseline`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_iep_progress_baseline.py
git commit -m "feat(backend): auto-seed baseline student progress records on IEP creation (#144)"
```

---

### Task 2: Backend Progress Recording & Dashboard Validation Enhancements

**Files:**
- Modify: `neuropath-backend/tracking/views.py`
- Test: `neuropath-backend/tracking/tests.py`

**Interfaces:**
- Consumes: `studentID`, `subjectName`, `performanceScore` via `POST /api/tracking/analytics/`
- Produces: `StudentProgress` JSON record + updated `GET /api/tracking/progress-dashboard/?studentID=<id>` payload

- [ ] **Step 1: Write backend tests for progress recording and dashboard metrics**

```python
# In neuropath-backend/tracking/tests.py
def test_record_progress_invalid_score_bounds(self):
    self._auth(self.token1)
    payload = {
        'studentID': self.student1.pk,
        'subjectName': 'Science',
        'performanceScore': 150,
    }
    response = self.client.post('/api/tracking/analytics/', payload, format='json')
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run backend tests to verify**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test_db.sqlite3"; python manage.py test tracking.tests`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add neuropath-backend/tracking/tests.py
git commit -m "test(backend): add test cases for score bounds and progress analytics recording (#144)"
```

---

### Task 3: Interactive RecordProgressModal Component & CSS

**Files:**
- Create: `neuropath-frontend/src/components/RecordProgressModal.jsx`
- Create: `neuropath-frontend/src/components/RecordProgressModal.test.jsx`
- Modify: `neuropath-frontend/src/styles/OutcomeMonitoring.css`

**Interfaces:**
- Props: `isOpen`, `onClose`, `student`, `existingSubjects`, `onSubmitSuccess`
- Submits: Calls `trackingAPI.recordProgress({ studentID, subjectName, performanceScore })`

- [ ] **Step 1: Write failing test for `RecordProgressModal`**

```jsx
// In neuropath-frontend/src/components/RecordProgressModal.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecordProgressModal from "./RecordProgressModal";
import { trackingAPI } from "../api/client";

vi.mock("../api/client", () => ({
  trackingAPI: {
    recordProgress: vi.fn(),
  },
}));

describe("RecordProgressModal", () => {
  const mockStudent = { studentID: 1, name: "Alice Wonderland" };
  const mockSubjects = [{ name: "Mathematics" }, { name: "Communication" }];
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal form when open", () => {
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Log Student Progress/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain \/ Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Performance Score/i)).toBeInTheDocument();
  });

  it("validates and submits progress evaluation", async () => {
    const user = userEvent.setup();
    trackingAPI.recordProgress.mockResolvedValueOnce({ progressID: 99 });

    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />
    );

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    fireEvent.change(scoreInput, { target: { value: "85" } });

    const submitBtn = screen.getByRole("button", { name: /Save Progress/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(trackingAPI.recordProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          studentID: 1,
          subjectName: expect.any(String),
          performanceScore: 85,
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RecordProgressModal.test.jsx`
Expected: FAIL (`Cannot find module ./RecordProgressModal`)

- [ ] **Step 3: Implement `RecordProgressModal.jsx` and styling in `OutcomeMonitoring.css`**

Create `neuropath-frontend/src/components/RecordProgressModal.jsx`:
- Includes Domain/Subject selection (preset domains: Communication, Mathematics, Reading, Social Skills, Behavioral, custom input).
- Performance Score (0-100) with score level preview (Emerging, Developing, Proficient, Advanced).
- Evaluation Date (defaults to today).
- Observation Notes textarea.
- Form validation and error messaging.
- Save and Cancel actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RecordProgressModal.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add neuropath-frontend/src/components/RecordProgressModal.jsx neuropath-frontend/src/components/RecordProgressModal.test.jsx neuropath-frontend/src/styles/OutcomeMonitoring.css
git commit -m "feat(frontend): build accessible RecordProgressModal component (#144)"
```

---

### Task 4: Executive KPI Summary Cards and Integration in ViewProgressDashboard

**Files:**
- Modify: `neuropath-frontend/src/pages/ViewProgressDashboard.jsx`
- Modify: `neuropath-frontend/src/pages/ViewProgressDashboard.test.jsx`
- Modify: `neuropath-frontend/src/styles/OutcomeMonitoring.css`

**Interfaces:**
- Consumes: `subjects` array from `trackingAPI.getProgressDashboard(studentId)`
- Computes:
  - Overall Mastery Rate: Average of all `s.progress`
  - Goals on Track: `subjects.filter(s => s.progress >= 70).length`
  - Needs Support: `subjects.filter(s => s.progress < 70).length`
  - Last Evaluated: Latest `s.lastUpdated`
- Produces: Executive KPI summary row cards, "+ Log Progress" button modal trigger, dynamic reload on progress log

- [ ] **Step 1: Update `ViewProgressDashboard.test.jsx` with tests for KPI summary cards and Log Progress integration**

```jsx
// In neuropath-frontend/src/pages/ViewProgressDashboard.test.jsx
it("renders Executive KPI Summary Cards with aggregate mastery rate and goal counts", async () => {
  studentsAPI.list.mockResolvedValueOnce(mockStudents);
  const mockSubjects = [
    { id: 1, name: "Math", progress: 80, status: "On Track", lastUpdated: "May 10, 2026", currentLevel: "Developing", chartData: [80], months: ["May"] },
    { id: 2, name: "Reading", progress: 60, status: "Needs Support", lastUpdated: "May 12, 2026", currentLevel: "Emerging", chartData: [60], months: ["May"] },
  ];
  trackingAPI.getProgressDashboard.mockResolvedValueOnce(mockSubjects);
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <ViewProgressDashboard />
    </MemoryRouter>
  );

  await screen.findByText("Alice Wonderland");
  await user.click(screen.getAllByRole("button", { name: /select/i })[0]);

  expect(await screen.findByText("Overall Mastery Rate")).toBeInTheDocument();
  expect(screen.getByText("70%")).toBeInTheDocument(); // Average of 80 and 60
  expect(screen.getByText("Goals on Track")).toBeInTheDocument();
  expect(screen.getByText("Needs Support")).toBeInTheDocument();
  expect(screen.getByText("Last Evaluated")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /\+ Log Progress/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ViewProgressDashboard.test.jsx`
Expected: FAIL (`Overall Mastery Rate not found`)

- [ ] **Step 3: Implement Executive KPI Cards and Log Progress Modal in `ViewProgressDashboard.jsx`**

Modify `neuropath-frontend/src/pages/ViewProgressDashboard.jsx` to:
- Render KPI metric cards when student is selected:
  - 📈 Overall Mastery Rate
  - 🎯 Goals on Track ($\ge 70\%$)
  - ⚠️ Needs Support ($< 70\%$)
  - 📅 Last Evaluated
- Add "+ Log Progress" button in header/action bar.
- Open `RecordProgressModal` and reload data via `loadStudentProgress(studentId)` upon completion.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ViewProgressDashboard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add neuropath-frontend/src/pages/ViewProgressDashboard.jsx neuropath-frontend/src/pages/ViewProgressDashboard.test.jsx neuropath-frontend/src/styles/OutcomeMonitoring.css
git commit -m "feat(frontend): integrate executive KPI cards and interactive progress logging (#144)"
```

---

### Task 5: End-to-End Verification & Compliance Validation

**Files:**
- Verify: Full backend and frontend suites

- [ ] **Step 1: Run full backend test suite**
- [ ] **Step 2: Run full frontend test suite**
- [ ] **Step 3: Run frontend lint & build**
- [ ] **Step 4: Verify PR template compliance**

---
