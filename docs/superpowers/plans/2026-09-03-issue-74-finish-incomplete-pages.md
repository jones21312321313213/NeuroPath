# Issue #74 — Finish Incomplete Pages (Mock Progress Dashboard, Missing 404, Orphaned AI Insight Route) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all incomplete/dead pages and routes identified in Issue #74: replace mock student progress data in `ViewProgressDashboard.jsx` with real backend-powered analytics endpoints, add a dedicated 404 NotFound page for unmatched routes, and remove the orphaned `ai-insight` placeholder route.

**Architecture:** 
- The backend `tracking` app introduces a dedicated aggregated progress dashboard endpoint (`GET /api/tracking/progress-dashboard/?studentID=<id>`) and a progress logging endpoint (`POST /api/tracking/analytics/`) operating on `StudentProgress` models with strict teacher-tenant isolation.
- `src/api/client.js` exports a new `trackingAPI` namespace using `request()` to communicate with backend tracking endpoints.
- `ViewProgressDashboard.jsx` drops hardcoded `MOCK_SUBJECTS`, fetches student progress data asynchronously from `trackingAPI`, handles loading and empty states cleanly, and fixes single-data-point SVG coordinate calculations in `LineChart`.
- A new `NotFoundPage.jsx` component is created and wired to the catch-all route (`*`) in `App.jsx` instead of silently redirecting to `/`.
- Dead code in `App.jsx` (`ai-insight` breadcrumb entry, switch-case, and unused `Placeholder` component) is removed cleanly since the real AI insight feature is already fully functional inside `StudentInsightsTab.jsx`.

**Tech Stack:** React 19 + Vite 8 + React Router 7 (frontend, vitest/ESLint), Django 6 + DRF with `TokenAuthentication` (backend, ruff-linted, pytest/django test runner).

---

## Global Constraints

- **Auth & Tenant Isolation:** All backend tracking endpoints must require authentication via `SessionAuthenticationGuard` (DRF Token Authentication header: `Authorization: Token <key>`). Data queries must strictly isolate records to the authenticated teacher's students via `ContextualDataIsolationFilter` or `teacher = get_teacher_for_user(request.user)`. Accessing records of another teacher's student must return `404 Not Found`.
- **API Base URL & Client Convention:** Frontend API calls must go through `src/api/client.js` via `request()`. Do not introduce raw `fetch()` or `axios` calls with hardcoded URLs.
- **Single Source of Truth for Progress:** The `StudentProgress` model (`tracking/models.py`) is the source of truth for student progress logs. If no logs exist for a student, the endpoint returns an empty array (`[]`), prompting the frontend's empty state (`"No progress data found for this student."`).
- **Clean Fallback for SVG Rendering:** The SVG line chart in `ViewProgressDashboard.jsx` must guard against division by zero (`data.length - 1`) when a student has only 1 data point or 0 data points.
- **Routing & Navigation:** Navigating to any unknown path (e.g. `/unknown-path`) must display the 404 NotFound page rather than redirecting to `/`.
- **Code Cleanliness:** Remove unused code (`Placeholder` in `App.jsx`, `MOCK_SUBJECTS` in `ViewProgressDashboard.jsx`). Do not leave `TODO` or `TBD` comments.
- **Verification Gates:** Frontend changes must pass `npm run lint` and `npm run build`. Backend changes must pass `ruff check .`, `python manage.py check`, and `python manage.py test tracking`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `neuropath-backend/tracking/views.py` | **Modify.** Add `StudentProgressDashboardView` to calculate aggregated per-subject progress metrics (progress, status, summary counts, level, chartData, months) and add `POST` handler to `ProgressAnalyticsAPIView` for recording progress entries. |
| `neuropath-backend/tracking/urls.py` | **Modify.** Register route `progress-dashboard/` mapped to `StudentProgressDashboardView`. |
| `neuropath-backend/tracking/tests.py` | **Modify.** Add test cases for `StudentProgressDashboardView` (auth check, cross-teacher isolation, empty data, populated subject aggregation) and `ProgressAnalyticsAPIView` POST. |
| `neuropath-frontend/src/api/client.js` | **Modify.** Export `trackingAPI` (`getProgressDashboard`, `getAnalytics`, `recordProgress`). |
| `neuropath-frontend/src/api/client.test.js` | **Modify.** Add unit tests asserting `trackingAPI` methods call expected endpoints with correct parameters and auth headers. |
| `neuropath-frontend/src/pages/ViewProgressDashboard.jsx` | **Modify.** Remove `MOCK_SUBJECTS`, integrate `trackingAPI.getProgressDashboard`, add loading/error state handling, and fix SVG chart single-point division by zero. |
| `neuropath-frontend/src/pages/NotFoundPage.jsx` | **Create.** Responsive 404 page featuring NeuroPath branding, clear messaging, and navigation buttons ("Back to Dashboard", "Home"). |
| `neuropath-frontend/src/styles/NotFound.css` | **Create.** Styling for the 404 page adhering to the existing application design system. |
| `neuropath-frontend/src/App.jsx` | **Modify.** Replace catch-all redirect with `<Route path="*" element={<NotFoundPage />} />`. Remove orphaned `"ai-insight"` breadcrumb, route case, and unused `Placeholder` component. |

---

## Task 1: Backend Progress Dashboard & Progress Logging Endpoints

The frontend requires real per-student subject progress data (progress percentage, status, timeline scores, levels, and summary metrics). This task implements `StudentProgressDashboardView` and adds a `POST` handler to `ProgressAnalyticsAPIView` to allow recording new student progress data.

**Files:**
- Modify: `neuropath-backend/tracking/views.py`
- Modify: `neuropath-backend/tracking/urls.py:1-18`
- Test: `neuropath-backend/tracking/tests.py`

**Interfaces:**
- Produces: `GET /api/tracking/progress-dashboard/?studentID=<studentID>`
  - Requires: `Authorization: Token <key>`
  - Returns `200 OK` with JSON array of subject summaries:
    ```json
    [
      {
        "id": "Communication Skills",
        "name": "Communication Skills",
        "progress": 75,
        "status": "On Track",
        "lastUpdated": "May 15, 2026",
        "assessmentsCompleted": "5 / 5",
        "skillsMastered": "4 / 5",
        "currentLevel": "Proficient",
        "targetLevel": "Advanced",
        "chartData": [40, 55, 65, 70, 75],
        "months": ["Jan", "Feb", "Mar", "Apr", "May"]
      }
    ]
    ```
  - Returns `200 []` when no progress data exists for the student.
  - Returns `400` when `studentID` query parameter is missing.
  - Returns `404` when the student record does not exist or does not belong to the authenticated teacher.
- Produces: `POST /api/tracking/analytics/`
  - Requires: `Authorization: Token <key>`
  - Body: `{"studentID": 1, "subjectName": "Math", "performanceScore": 85}`
  - Returns `201 Created` with created record.

- [ ] **Step 1: Write failing tests for backend progress dashboard and logging**

In `neuropath-backend/tracking/tests.py`, add tests:

```python
    # ---- Progress Dashboard Tests ----

    def test_unauthenticated_progress_dashboard_rejected(self):
        response = self.client.get('/api/tracking/progress-dashboard/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_progress_dashboard_missing_student_id_rejected(self):
        self._auth(self.token1)
        response = self.client.get('/api/tracking/progress-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_teacher_cannot_view_progress_dashboard(self):
        self._auth(self.token2)
        response = self.client.get('/api/tracking/progress-dashboard/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_progress_dashboard_empty_when_no_records(self):
        student_empty = create_student(self.teacher1, name='Empty Student')
        self._auth(self.token1)
        response = self.client.get('/api/tracking/progress-dashboard/', {'studentID': student_empty.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_progress_dashboard_returns_aggregated_subject_data(self):
        # Create additional progress data points
        StudentProgress.objects.create(
            student=self.student1, subjectName='Math', performanceScore=90,
        )
        StudentProgress.objects.create(
            student=self.student1, subjectName='Reading', performanceScore=60,
        )
        self._auth(self.token1)
        response = self.client.get('/api/tracking/progress-dashboard/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        math_subj = next((s for s in response.data if s['name'] == 'Math'), None)
        self.assertIsNotNone(math_subj)
        self.assertEqual(math_subj['progress'], 90)
        self.assertEqual(math_subj['status'], 'On Track')
        self.assertEqual(math_subj['chartData'], [80, 90])
        self.assertEqual(len(math_subj['months']), 2)

    def test_record_progress_via_post(self):
        self._auth(self.token1)
        payload = {
            'studentID': self.student1.pk,
            'subjectName': 'Science',
            'performanceScore': 85,
        }
        response = self.client.post('/api/tracking/analytics/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            StudentProgress.objects.filter(
                student=self.student1, subjectName='Science', performanceScore=85
            ).exists()
        )
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```powershell
python manage.py test tracking
```
Expected: FAIL with 404 (route `/api/tracking/progress-dashboard/` does not exist).

- [ ] **Step 3: Implement `StudentProgressDashboardView` and `POST` in `tracking/views.py`**

In `neuropath-backend/tracking/views.py`:
1. Add `post` method to `ProgressAnalyticsAPIView`:
```python
    def post(self, request, *args, **kwargs):
        """Matches SDD: Records a new progress performance log for a student."""
        student_id = request.data.get('studentID')
        subject_name = request.data.get('subjectName')
        performance_score = request.data.get('performanceScore')

        if not student_id or not subject_name or performance_score is None:
            return Response(
                {"error": "studentID, subjectName, and performanceScore are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            score = int(performance_score)
            if not (0 <= score <= 100):
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {"error": "performanceScore must be an integer between 0 and 100."},
                status=status.HTTP_400_BAD_REQUEST
            )

        teacher = get_teacher_for_user(request.user)
        try:
            student = StudentProfile.objects.get(pk=student_id, teacher=teacher)
        except StudentProfile.DoesNotExist:
            return Response(
                {"error": "Student record not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        record = StudentProgress.objects.create(
            student=student,
            subjectName=str(subject_name).strip(),
            performanceScore=score
        )
        serializer = ProgressAnalyticsSerializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

2. Add `StudentProgressDashboardView`:
```python
# =====================================================================
# SDD COMPONENT: StudentProgressDashboardView
# Description: Aggregates chronological StudentProgress records into
#              per-subject summaries for the Outcome Monitoring Dashboard.
# =====================================================================
class StudentProgressDashboardView(APIView):
    permission_classes = [SessionAuthenticationGuard]

    def get(self, request, *args, **kwargs):
        student_id = request.query_params.get('studentID')
        if not student_id:
            return Response(
                {"error": "A valid studentID query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        teacher = get_teacher_for_user(request.user)
        if not teacher or not StudentProfile.objects.filter(pk=student_id, teacher=teacher).exists():
            return Response(
                {"error": "Student record not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        records = (
            StudentProgress.objects
            .filter(student__pk=student_id, student__teacher=teacher)
            .order_by('dateLogged')
        )

        if not records.exists():
            return Response([], status=status.HTTP_200_OK)

        # Group chronologically by subject
        subjects_map = {}
        for rec in records:
            subj = rec.subjectName.strip() if rec.subjectName else "General"
            if subj not in subjects_map:
                subjects_map[subj] = []
            subjects_map[subj].append(rec)

        def compute_level(score):
            if score < 50:
                return "Emerging"
            elif score < 75:
                return "Developing"
            elif score < 90:
                return "Proficient"
            return "Advanced"

        def compute_target(score):
            if score < 50:
                return "Developing"
            elif score < 75:
                return "Proficient"
            return "Advanced"

        results = []
        for subj_name, entries in subjects_map.items():
            latest = entries[-1]
            latest_score = latest.performanceScore
            scores = [e.performanceScore for e in entries]
            months = [e.dateLogged.strftime("%b") for e in entries]
            total_count = len(scores)
            mastered_count = sum(1 for s in scores if s >= 75)

            results.append({
                "id": latest.progressID,
                "name": subj_name,
                "progress": latest_score,
                "status": "On Track" if latest_score >= 70 else "Needs Support",
                "lastUpdated": latest.dateLogged.strftime("%B %d, %Y"),
                "assessmentsCompleted": f"{total_count} / {total_count}",
                "skillsMastered": f"{mastered_count} / {total_count}",
                "currentLevel": compute_level(latest_score),
                "targetLevel": compute_target(latest_score),
                "chartData": scores,
                "months": months,
            })

        return Response(results, status=status.HTTP_200_OK)
```

- [ ] **Step 4: Register route in `neuropath-backend/tracking/urls.py`**

Modify `neuropath-backend/tracking/urls.py`:
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OutcomeMonitoringRouter,
    StudentRecordQueryController,
    ProgressAnalyticsAPIView,
    StudentProgressDashboardView,
)

router = DefaultRouter()
router.register(r'student-records', StudentRecordQueryController, basename='student-records')

urlpatterns = [
    # Gateway Route (Module 4.0)
    path('gateway/', OutcomeMonitoringRouter.as_view(), name='outcome-monitoring-gateway'),
    
    # Analytics Route (Module 4.2)
    path('analytics/', ProgressAnalyticsAPIView.as_view(), name='progress-analytics'),

    # Progress Dashboard Aggregated Route
    path('progress-dashboard/', StudentProgressDashboardView.as_view(), name='progress-dashboard'),
    
    # Sub-Module Routes (Module 4.1)
    path('', include(router.urls)),
]
```

- [ ] **Step 5: Run tests and linter**

Run:
```powershell
ruff check .
python manage.py check
python manage.py test tracking
```
Expected: All tests pass and ruff reports no issues.

- [ ] **Step 6: Commit**

```bash
git add neuropath-backend/tracking/views.py neuropath-backend/tracking/urls.py neuropath-backend/tracking/tests.py
git commit -m "feat(tracking): add progress dashboard endpoint and progress recording API"
```

---

## Task 2: Frontend API Client Extension (`trackingAPI`)

Add `trackingAPI` to `neuropath-frontend/src/api/client.js` so the frontend has a strongly typed, unified interface for progress dashboard and analytics requests.

**Files:**
- Modify: `neuropath-frontend/src/api/client.js`
- Test: `neuropath-frontend/src/api/client.test.js`

**Interfaces:**
- Produces: `trackingAPI`
  - `trackingAPI.getProgressDashboard(studentId)` -> `GET /tracking/progress-dashboard/?studentID=<studentId>`
  - `trackingAPI.getAnalytics(studentId, subject)` -> `GET /tracking/analytics/?studentID=<studentId>[&subject=<subject>]`
  - `trackingAPI.recordProgress(payload)` -> `POST /tracking/analytics/` with JSON payload

- [ ] **Step 1: Add unit tests for `trackingAPI` in `client.test.js`**

Add to `neuropath-frontend/src/api/client.test.js`:

```javascript
import { authAPI, studentsAPI, usersAPI, trackingAPI } from "./client";

describe("trackingAPI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches progress dashboard for a student", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ name: "Math", progress: 85 }]));

    const result = await trackingAPI.getProgressDashboard(12);

    expect(result).toEqual([{ name: "Math", progress: 85 }]);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tracking/progress-dashboard/?studentID=12",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("fetches analytics with optional subject query parameter", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ performanceScore: 90 }]));

    await trackingAPI.getAnalytics(12, "Math");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tracking/analytics/?studentID=12&subject=Math",
      expect.anything(),
    );
  });

  it("posts progress log to analytics endpoint", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ progressID: 5 }, { status: 201 }));

    const payload = { studentID: 12, subjectName: "Reading", performanceScore: 78 };
    await trackingAPI.recordProgress(payload);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/tracking/analytics/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });
});
```

- [ ] **Step 2: Implement `trackingAPI` in `client.js`**

Export `trackingAPI` at the end of `neuropath-frontend/src/api/client.js`:

```javascript
// ── Tracking & Outcome Monitoring ──────────────────────────────────────────────
export const trackingAPI = {
  getProgressDashboard: (studentId) =>
    request(`/tracking/progress-dashboard/?studentID=${studentId}`),
  getAnalytics: (studentId, subject) => {
    const params = new URLSearchParams({ studentID: studentId });
    if (subject) params.append("subject", subject);
    return request(`/tracking/analytics/?${params.toString()}`);
  },
  recordProgress: (payload) =>
    request("/tracking/analytics/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
```

- [ ] **Step 3: Run unit tests and lint**

Run:
```powershell
npm test
npm run lint
```
Expected: Tests pass without lint errors.

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/api/client.test.js
git commit -m "feat(frontend): export trackingAPI in api client"
```

---

## Task 3: Replace Mock Progress Data with Real API in `ViewProgressDashboard.jsx`

Wire `ViewProgressDashboard.jsx` to fetch real subject progress data from `trackingAPI.getProgressDashboard(studentId)`, display loading and error states, render the empty state when no data is recorded, and make `LineChart` robust against single-point rendering.

**Files:**
- Modify: `neuropath-frontend/src/pages/ViewProgressDashboard.jsx`

**Interfaces:**
- Consumes: `trackingAPI.getProgressDashboard(studentId)`
- State:
  - `subjects`: Array of subjects fetched from backend
  - `subjectsLoading`: boolean indicating fetch in progress
  - `subjectsError`: string error message if fetch fails

- [ ] **Step 1: Update `ViewProgressDashboard.jsx`**

1. Import `trackingAPI` alongside `studentsAPI`:
```javascript
import { studentsAPI, trackingAPI } from "../api/client";
```
2. Remove lines 7–52 (`const MOCK_SUBJECTS = { ... }`).
3. Update `LineChart` to handle edge cases where `data.length <= 1`:
```javascript
function LineChart({ data, months }) {
  if (!data || data.length === 0) return null;
  const w = 280,
    h = 100,
    max = 100;
  const divisor = data.length > 1 ? data.length - 1 : 1;
  const points = data
    .map((v, i) => {
      const x = data.length > 1 ? (i / divisor) * (w - 20) + 10 : w / 2;
      const y = h - (v / max) * (h - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {[25, 50, 75, 100].map((v) => {
        const y = h - (v / max) * (h - 10) - 5;
        return (
          <g key={v}>
            <line
              x1={10}
              y1={y}
              x2={w - 10}
              y2={y}
              stroke="#e3eaf2"
              strokeWidth={1}
            />
            <text x={0} y={y + 4} fontSize={9} fill="#aaa">
              {v}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="#5aabf0"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => {
        const x = data.length > 1 ? (i / divisor) * (w - 20) + 10 : w / 2;
        const y = h - (v / max) * (h - 10) - 5;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            fill="#5aabf0"
            stroke="#fff"
            strokeWidth={2}
          />
        );
      })}
      {months.map((m, i) => {
        const x = months.length > 1 ? (i / divisor) * (w - 20) + 10 : w / 2;
        return (
          <text
            key={i}
            x={x}
            y={h + 14}
            fontSize={9}
            fill="#aaa"
            textAnchor="middle"
          >
            {m}
          </text>
        );
      })}
    </svg>
  );
}
```
4. Add state for `subjects`, `subjectsLoading`, and `subjectsError`:
```javascript
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
```
5. Add `useEffect` to fetch real subjects whenever `selectedStudent` changes:
```javascript
  useEffect(() => {
    if (!selectedStudent?.studentID) {
      setSubjects([]);
      setSelectedSubject(null);
      return;
    }

    setSubjectsLoading(true);
    setSubjectsError("");
    trackingAPI
      .getProgressDashboard(selectedStudent.studentID)
      .then((data) => {
        setSubjects(data || []);
      })
      .catch((err) => {
        console.error(err);
        setSubjectsError("Failed to load progress data for this student.");
        setSubjects([]);
      })
      .finally(() => {
        setSubjectsLoading(false);
      });
  }, [selectedStudent]);
```
6. In the Subject List view (`if (selectedStudent)`), render `subjectsLoading ? <StudentShimmer /> : subjectsError ? ... : subjects.length === 0 ? <EmptyState ... /> : ...`:
```javascript
  // ── Subject List ───────────────────────────────────────
  if (selectedStudent) {
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Progress Dashboard</span>
        </div>
        <div className="om-body">
          <div className="om-card">
            <h2 className="om-list-title">{selectedStudent.name} – Subjects</h2>
            {subjectsLoading ? (
              <StudentShimmer />
            ) : subjectsError ? (
              <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
                ⚠️ {subjectsError}
              </p>
            ) : subjects.length === 0 ? (
              <EmptyState message="No progress data found for this student." />
            ) : (
              <div className="om-subject-list">
                {subjects.map((sub) => (
                  <div key={sub.id || sub.name} className="om-subject-row">
                    <span className="om-subject-name">{sub.name}</span>
                    <button
                      className="va-select-btn"
                      onClick={() => setSelectedSubject(sub)}
                    >
                      View Progress
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="om-record-actions" style={{ marginTop: 20 }}>
              <button
                className="btn btn-back"
                onClick={() => {
                  setSelectedStudent(null);
                  setSelectedSubject(null);
                }}
              >
                ← Back to Students
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 2: Run frontend verification**

Run:
```powershell
npm run lint
npm run build
```
Expected: Clean build without errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/pages/ViewProgressDashboard.jsx
git commit -m "feat(frontend): connect Progress Dashboard to real trackingAPI endpoints"
```

---

## Task 4: Create 404 / NotFound Page & Wire Catch-All Route

Create a user-friendly 404 page matching the NeuroPath aesthetic and update `App.jsx` to render it on unmatched routes instead of silently redirecting to `/`.

**Files:**
- Create: `neuropath-frontend/src/pages/NotFoundPage.jsx`
- Create: `neuropath-frontend/src/styles/NotFound.css`
- Modify: `neuropath-frontend/src/App.jsx:200-205`

**Interfaces:**
- Produces: `<NotFoundPage />` rendered on `path="*"`

- [ ] **Step 1: Create `NotFoundPage.jsx`**

Create `neuropath-frontend/src/pages/NotFoundPage.jsx`:

```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/NotFound.css";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="notfound-container">
      <div className="notfound-card">
        <div className="notfound-badge">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-message">
          The page you are looking for does not exist, has been removed, or is temporarily unavailable.
        </p>
        <div className="notfound-actions">
          <button
            className="notfound-btn notfound-btn-primary"
            onClick={() => navigate(user ? "/dashboard" : "/login")}
          >
            {user ? "Go to Dashboard" : "Go to Login"}
          </button>
          <button
            className="notfound-btn notfound-btn-secondary"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `NotFound.css`**

Create `neuropath-frontend/src/styles/NotFound.css`:

```css
.notfound-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f4f7fb;
  padding: 24px;
}

.notfound-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  max-width: 480px;
  width: 100%;
  padding: 40px 32px;
  text-align: center;
}

.notfound-badge {
  display: inline-block;
  font-size: 64px;
  font-weight: 800;
  color: #378add;
  line-height: 1;
  margin-bottom: 12px;
}

.notfound-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.notfound-message {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 28px 0;
}

.notfound-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.notfound-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.notfound-btn-primary {
  background-color: #378add;
  color: #ffffff;
}

.notfound-btn-primary:hover {
  background-color: #2b74be;
}

.notfound-btn-secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.notfound-btn-secondary:hover {
  background-color: #e2e8f0;
}
```

- [ ] **Step 3: Wire 404 Route in `App.jsx`**

In `neuropath-frontend/src/App.jsx`:
1. Import `NotFoundPage`:
```javascript
import NotFoundPage from "./pages/NotFoundPage";
```
2. Replace line 202:
```javascript
          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
```

- [ ] **Step 4: Run frontend verification**

Run:
```powershell
npm run lint
npm run build
```
Expected: Clean build with no errors.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/NotFoundPage.jsx neuropath-frontend/src/styles/NotFound.css neuropath-frontend/src/App.jsx
git commit -m "feat(routing): add 404 NotFound page and wire catch-all route"
```

---

## Task 5: Remove Orphaned AI Insight Route & Dead Placeholder

Remove the dead `"ai-insight"` route and unused `Placeholder` component from `App.jsx`. The real AI Insight functionality is actively provided by `StudentInsightsTab.jsx` embedded in `ViewSelectedStudentProfile.jsx`.

**Files:**
- Modify: `neuropath-frontend/src/App.jsx:24-108`

- [ ] **Step 1: Clean up `App.jsx`**

1. Remove line 30 in `breadcrumbMap`:
```javascript
// Remove: "ai-insight": "DASHBOARD/Student Profiling",
```
2. Remove lines 42–51 (`function Placeholder({ title }) { ... }`).
3. Remove lines 87–88 in `renderPage`:
```javascript
// Remove:
// case "ai-insight":
//   return <Placeholder title="Analyze & Generate AI Insight" />;
```

- [ ] **Step 2: Run frontend verification**

Run:
```powershell
npm run lint
npm run build
```
Expected: Lint passes and build succeeds with zero dead code warnings.

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/App.jsx
git commit -m "refactor(routing): remove orphaned ai-insight placeholder route and component"
```

---

## Task 6: End-to-End Verification

Verify the entire repository against all acceptance criteria and Definition of Done.

- [ ] **Step 1: Run full backend verification**

Run:
```powershell
ruff check .
python manage.py check
python manage.py test
```
Expected: All lints pass, system check identifies 0 issues, and all unit tests pass.

- [ ] **Step 2: Run full frontend verification**

Run:
```powershell
npm run lint
npm test
npm run build
```
Expected: All ESLint checks pass, Vitest tests pass, and Vite production build succeeds.

- [ ] **Step 3: Verify Acceptance Criteria**
1. Progress Dashboard reflects real student data from backend endpoints (`/api/tracking/progress-dashboard/`), with no `MOCK_SUBJECTS` remaining in frontend code.
2. Navigating to an unknown URL displays `NotFoundPage` (404) with clear recovery buttons.
3. The dead `ai-insight` placeholder route is eradicated from navigation and `App.jsx`.
