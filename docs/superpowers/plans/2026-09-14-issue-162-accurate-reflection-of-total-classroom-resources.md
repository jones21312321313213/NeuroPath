# Accurate Reflection of Total Classroom Resources on Overview Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the "Classroom Resources" metric card on the Home Overview page reflects the true total of all teacher-owned instructional resources (Lesson Plans + Teaching Strategies + Visual Aids) by implementing a dedicated backend aggregation endpoint and updating the frontend data pipeline.

**Architecture:** Create `ResourceDashboardStatsAPIView` in `neuropath-backend/resources/views.py` mapped to `GET /api/resources/dashboard-stats/` that calculates teacher-scoped counts across `LessonPlan`, `TeachingStrategy`, and `VisualAid` models. Expose `resourcesAPI.dashboardStats` and TanStack Query hook `useResourceDashboardStats` in the frontend, and update `Overview.jsx` to consume the aggregated stats instead of calculating `lessonList.length + visualAidList.length`.

**Tech Stack:** Django REST Framework, Python 3.12+, React 19, @tanstack/react-query, Vitest, Testing Library.

## Global Constraints
- Target Issue: #162 (`[FE/BE] [BUG]: Accurate reflection of total Classroom Resources on the Home Overview dashboard`)
- Preserves existing model foreign key relationships (`LessonPlan.iep_goal`, `TeachingStrategy.iep_goal`, `VisualAid.iep_goal` -> `IEPGoal.iep` -> `IEPModel.studentID` -> `StudentProfile.teacher`)
- Respects multi-tenant isolation: teachers must only count resources belonging to their own students
- Unauthenticated requests must return 401 Unauthorized
- Eliminates client-side full roster fetches for counting purposes
- Preserves backward compatibility and project style guidelines
- All backend tests and frontend tests must pass
- PR must conform strictly to `.github/pull_request_template.md` and pass `.github/workflows/pr-template-lint.yml`

---

### Task 1: Backend Resource Dashboard Stats Endpoint

**Files:**
- Modify: `neuropath-backend/resources/views.py`
- Modify: `neuropath-backend/resources/urls.py`
- Modify: `neuropath-backend/resources/tests/test_resources_legacy.py`

**Interfaces:**
- Consumes: Authenticated `request.user` (resolved to `Teacher` via `get_teacher_for_user(request.user)`)
- Produces: JSON response with `{ "total": int, "total_resources": int, "lesson_plans": int, "teaching_strategies": int, "visual_aids": int }`

- [ ] **Step 1: Write failing backend tests for `GET /api/resources/dashboard-stats/`**

Add tests to `neuropath-backend/resources/tests/test_resources_legacy.py` in `ResourcesAuthAndTenantIsolationTests`:
```python
    def test_unauthenticated_resource_dashboard_stats_rejected(self):
        response = self.client.get('/api/resources/dashboard-stats/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resource_dashboard_stats_returns_teacher_scoped_counts(self):
        self._auth(self.token1)
        response = self.client.get('/api/resources/dashboard-stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('total'), 3)
        self.assertEqual(response.data.get('total_resources'), 3)
        self.assertEqual(response.data.get('lesson_plans'), 1)
        self.assertEqual(response.data.get('visual_aids'), 1)
        self.assertEqual(response.data.get('teaching_strategies'), 1)

    def test_resource_dashboard_stats_isolated_from_other_teacher(self):
        self._auth(self.token2)
        response = self.client.get('/api/resources/dashboard-stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('total'), 0)
        self.assertEqual(response.data.get('total_resources'), 0)
        self.assertEqual(response.data.get('lesson_plans'), 0)
        self.assertEqual(response.data.get('visual_aids'), 0)
        self.assertEqual(response.data.get('teaching_strategies'), 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:DB_ENGINE='django.db.backends.sqlite3'; $env:DB_NAME='testdb.sqlite3'; python manage.py test resources.tests.test_resources_legacy.ResourcesAuthAndTenantIsolationTests.test_resource_dashboard_stats_returns_teacher_scoped_counts
```
Expected: FAIL with 404 (URL not found).

- [ ] **Step 3: Implement `ResourceDashboardStatsAPIView` and register URL**

In `neuropath-backend/resources/views.py`:
```python
class ResourceDashboardStatsAPIView(APIView):
    """
    GET /api/resources/dashboard-stats/
    Returns total count of all teacher-owned instructional resources
    (Lesson Plans + Teaching Strategies + Visual Aids).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({
                'total': 0,
                'total_resources': 0,
                'lesson_plans': 0,
                'teaching_strategies': 0,
                'visual_aids': 0,
            }, status=status.HTTP_200_OK)

        lesson_plans_count = LessonPlan.objects.filter(
            iep_goal__iep__studentID__teacher=teacher
        ).count()
        teaching_strategies_count = TeachingStrategy.objects.filter(
            iep_goal__iep__studentID__teacher=teacher
        ).count()
        visual_aids_count = VisualAid.objects.filter(
            iep_goal__iep__studentID__teacher=teacher
        ).count()
        total = lesson_plans_count + teaching_strategies_count + visual_aids_count

        return Response({
            'total': total,
            'total_resources': total,
            'lesson_plans': lesson_plans_count,
            'teaching_strategies': teaching_strategies_count,
            'visual_aids': visual_aids_count,
        }, status=status.HTTP_200_OK)
```

In `neuropath-backend/resources/urls.py`:
Import `ResourceDashboardStatsAPIView` and add route:
```python
path('dashboard-stats/', ResourceDashboardStatsAPIView.as_view(), name='resource-dashboard-stats'),
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```powershell
$env:DB_ENGINE='django.db.backends.sqlite3'; $env:DB_NAME='testdb.sqlite3'; python manage.py test resources.tests.test_resources_legacy
```
Expected: All tests PASS.

- [ ] **Step 5: Commit backend changes**

```bash
git add neuropath-backend/resources/views.py neuropath-backend/resources/urls.py neuropath-backend/resources/tests/test_resources_legacy.py
git commit -m "feat(backend): add resource dashboard-stats endpoint for teacher-owned counts (#162)"
```

---

### Task 2: Frontend API Client and Query Hook

**Files:**
- Modify: `neuropath-frontend/src/api/client.js`
- Modify: `neuropath-frontend/src/hooks/queries.js`
- Modify: `neuropath-frontend/src/api/client.test.js`
- Modify: `neuropath-frontend/src/hooks/queries.test.jsx`
- Modify: `neuropath-frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `GET /api/resources/dashboard-stats/`
- Produces: `resourcesAPI.dashboardStats()`, `queryKeys.resourceStats()`, `useResourceDashboardStats()`

- [ ] **Step 1: Write failing tests for client and queries**

In `neuropath-frontend/src/api/client.test.js`:
```javascript
  it("fetches resource dashboard stats", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        total: 5,
        total_resources: 5,
        lesson_plans: 2,
        teaching_strategies: 2,
        visual_aids: 1,
      }),
    );

    const result = await resourcesAPI.dashboardStats();

    expect(result).toEqual({
      total: 5,
      total_resources: 5,
      lesson_plans: 2,
      teaching_strategies: 2,
      visual_aids: 1,
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/resources/dashboard-stats/",
      expect.any(Object),
    );
  });
```

In `neuropath-frontend/src/hooks/queries.test.jsx`:
```javascript
describe("useResourceDashboardStats", () => {
  it("fetches resource dashboard stats", async () => {
    const mockStats = { total: 4, lesson_plans: 2, teaching_strategies: 1, visual_aids: 1 };
    resourcesAPI.dashboardStats.mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useResourceDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStats);
    expect(resourcesAPI.dashboardStats).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/api/client.test.js src/hooks/queries.test.jsx
```
Expected: FAIL (`resourcesAPI` / `useResourceDashboardStats` not exported).

- [ ] **Step 3: Implement `resourcesAPI` and `useResourceDashboardStats`**

In `neuropath-frontend/src/api/client.js`:
```javascript
// ── Resources Overview Stats ───────────────────────────────────────────────────
export const resourcesAPI = {
  dashboardStats: () => request("/resources/dashboard-stats/"),
  stats: () => request("/resources/dashboard-stats/"),
};
```

In `neuropath-frontend/src/hooks/queries.js`:
Add `resourcesAPI` to imports.
In `queryKeys`:
```javascript
resourceStats: () => ["resources", "dashboard-stats"],
```
Add hook:
```javascript
export function useResourceDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.resourceStats(),
    queryFn: () => resourcesAPI.dashboardStats(),
    ...options,
  });
}

export const useResourceStats = useResourceDashboardStats;
```

Update `neuropath-frontend/src/App.test.jsx` to include `resourcesAPI` in the mock:
```javascript
  resourcesAPI: {
    dashboardStats: vi.fn().mockResolvedValue({ total: 0, lesson_plans: 0, visual_aids: 0, teaching_strategies: 0 }),
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/api/client.test.js src/hooks/queries.test.jsx src/App.test.jsx
```
Expected: PASS.

- [ ] **Step 5: Commit frontend API & hooks changes**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/hooks/queries.js neuropath-frontend/src/api/client.test.js neuropath-frontend/src/hooks/queries.test.jsx neuropath-frontend/src/App.test.jsx
git commit -m "feat(frontend): add resourcesAPI and useResourceDashboardStats hook (#162)"
```

---

### Task 3: Update Overview.jsx and Component Tests

**Files:**
- Modify: `neuropath-frontend/src/pages/Overview.jsx`
- Modify: `neuropath-frontend/src/pages/Overview.test.jsx`

**Interfaces:**
- Consumes: `useResourceDashboardStats()`
- Produces: `counts.resources` accurately rendered in Classroom Resources stat card

- [ ] **Step 1: Update failing tests in `Overview.test.jsx`**

Update `Overview.test.jsx` mocks:
Add `resourcesAPI` to `vi.mock("../api/client")`:
```javascript
  resourcesAPI: {
    dashboardStats: vi.fn(),
  },
```
In `beforeEach`:
```javascript
  resourcesAPI.dashboardStats.mockResolvedValue({
    total: 0,
    total_resources: 0,
    lesson_plans: 0,
    teaching_strategies: 0,
    visual_aids: 0,
  });
```
Update test `"renders Total Students, Active IEPs, and Classroom Resources, and excludes vanity stats"`:
```javascript
    studentsAPI.list.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 4 });
    resourcesAPI.dashboardStats.mockResolvedValue({
      total: 5,
      total_resources: 5,
      lesson_plans: 2,
      teaching_strategies: 2,
      visual_aids: 1,
    });
```
Assert that `5` is rendered for Classroom Resources (2 lesson plans + 2 teaching strategies + 1 visual aid).

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/pages/Overview.test.jsx
```
Expected: FAIL (still expecting old mock or displaying 0).

- [ ] **Step 3: Update `Overview.jsx` to use `useResourceDashboardStats`**

In `neuropath-frontend/src/pages/Overview.jsx`:
Import `useResourceDashboardStats` from `../hooks/queries`.
Remove unused imports `useLessonPlans` and `useVisualAids`.
Replace:
```javascript
  const { data: students = [] } = useStudents(user?.id);
  const { data: iepStats } = useIepDashboardStats();
  const { data: resourceStats } = useResourceDashboardStats();

  const studentList = Array.isArray(students) ? students : (students?.results || []);

  const counts = {
    students: studentList.length,
    ieps: iepStats?.active_ieps ?? 0,
    resources:
      typeof resourceStats === "number"
        ? resourceStats
        : (resourceStats?.total ?? resourceStats?.total_resources ?? 0),
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/pages/Overview.test.jsx
```
Expected: PASS.

- [ ] **Step 5: Commit Overview changes**

```bash
git add neuropath-frontend/src/pages/Overview.jsx neuropath-frontend/src/pages/Overview.test.jsx
git commit -m "fix(frontend): accurately display combined classroom resources on Overview (#162)"
```

---

### Task 4: Full Verification and PR Creation

**Files:**
- None (verification and PR creation)

- [ ] **Step 1: Run full backend test suite**

Run:
```powershell
$env:DB_ENGINE='django.db.backends.sqlite3'; $env:DB_NAME='testdb.sqlite3'; python manage.py test
```
Expected: All backend tests PASS.

- [ ] **Step 2: Run full frontend test suite**

Run:
```bash
npm test
```
Expected: All frontend tests PASS (34 test files, 270+ tests).

- [ ] **Step 3: Validate PR template compliance against pr-template-lint workflow**

Check against `.github/workflows/pr-template-lint.yml`:
- Closes #162
- Non-empty summary (>10 chars)
- Selected `[x] Bug fix`
- Selected `[x] Unit tests`
- Conventional commit title: `fix(resources): accurately reflect total classroom resources on dashboard (#162)`

- [ ] **Step 4: Push branch and create PR**

Run:
```bash
git push -u origin Pakibabes/fe-be-bug-accurate-reflection-of-total-classroom
gh pr create --title "fix(resources): accurately reflect total classroom resources on dashboard (#162)" --body-file ...
```
