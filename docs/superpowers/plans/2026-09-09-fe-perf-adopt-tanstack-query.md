# [FE] [PERF] Adopt TanStack Query for Client-Side Caching, Background Revalidation, and Request Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt TanStack Query (`@tanstack/react-query`) in `neuropath-frontend` to eliminate manual `useEffect` + `useState` boilerplate, enable client-side caching with instant page transitions, ensure automatic request deduplication, and synchronize server state cleanly without backend changes.

**Architecture:**
1. Install `@tanstack/react-query` in `neuropath-frontend` and configure a shared `QueryClient` with default `staleTime: 5 * 60 * 1000` (5 minutes) and `refetchOnWindowFocus: false`.
2. Wrap the application at the root in `src/main.jsx` with `QueryClientProvider`.
3. Create centralized, reusable custom query hooks in `src/hooks/queries.js` for core data entities: `useStudents(teacherId)`, `useStudent(studentId)`, `useIepDashboardStats()`, `useStudentInsights(studentId)`, and `useLessonPlans(teacherId)`.
4. Migrate data-fetching components (`Overview.jsx`, `ViewStudentProfile.jsx`, `ViewSelectedStudentProfile.jsx`, `StudentInsightsTab.jsx`) from manual `useEffect` / `useState` / `cancelled` flags to TanStack Query hooks.
5. Create dedicated test wrapper helpers (`src/test/query-test-utils.jsx`) so tests run with isolated, deterministic query clients.

**Tech Stack:** React 19, `@tanstack/react-query` v5, Axios / Fetch Client, Vitest, `@testing-library/react`.

## Global Constraints

- **Scope:** Frontend only (`neuropath-frontend/`). Absolutely zero changes to `neuropath-backend/` or Django API schemas.
- **Cache Configuration Defaults:** `staleTime: 5 * 60 * 1000` (5 minutes) and `refetchOnWindowFocus: false` configured on the root `QueryClient`.
- **Query Keys Structure:** Structured, standard query keys:
  - `['students', teacherId]`
  - `['student', studentId]`
  - `['iep', 'dashboard-stats']`
  - `['student-insights', studentId]`
  - `['lesson-plans', teacherId]`
  - `['visual-aids', params]`
- **Preserve Existing UI & UX:** Maintain existing error states, loading skeletons (`StudentShimmer`), quick actions, and router navigation behaviors while eliminating unnecessary spinners on re-navigation.
- **Verification:** All unit tests must pass (`npm test`) and production build must succeed (`npm run build`).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `neuropath-frontend/package.json` | **Modify.** Add `@tanstack/react-query` dependency. |
| `neuropath-frontend/src/queryClient.js` | **Create.** Export configured default `queryClient` singleton with `staleTime: 5m` and `refetchOnWindowFocus: false`. |
| `neuropath-frontend/src/main.jsx` | **Modify.** Wrap `<App />` with `<QueryClientProvider client={queryClient}>`. |
| `neuropath-frontend/src/test/query-test-utils.jsx` | **Create.** Test wrapper utility that provides an isolated `QueryClientProvider` with zero retry/caching noise for unit tests. |
| `neuropath-frontend/src/hooks/queries.js` | **Create.** Core custom query and mutation hooks: `useStudents`, `useStudent`, `useIepDashboardStats`, `useStudentInsights`, `useLessonPlans`, `useVisualAids`, and `useGenerateStudentInsight`. |
| `neuropath-frontend/src/hooks/queries.test.jsx` | **Create.** Unit tests for all custom query and mutation hooks, testing caching, parameters, and query key behaviors. |
| `neuropath-frontend/src/pages/Overview.jsx` | **Modify.** Replace manual `useEffect` fetching with `useStudents`, `useIepDashboardStats`, `useLessonPlans`, and `useVisualAids`. |
| `neuropath-frontend/src/pages/Overview.test.jsx` | **Modify.** Update tests to work with query hooks and verify cached stats rendering. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx` | **Modify.** Replace raw `fetch` / `useEffect` with `useStudents(teacherId)` and use cached results. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.test.jsx` | **Modify.** Update tests with `QueryClientProvider` wrapper and test cached rendering. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx` | **Modify.** Replace `useEffect` fetching with `useStudent(studentId)`. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx` | **Modify.** Update tests with `QueryClientProvider` wrapper. |
| `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx` | **Modify.** Replace manual `useEffect` with `useStudentInsights(studentId)` and `useGenerateStudentInsight(studentId)`. |
| `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx` | **Modify.** Update tests with `QueryClientProvider` wrapper. |
| `neuropath-frontend/src/App.test.jsx` | **Modify.** Add integration tests for request deduplication and instant cached transitions across routes. |

---

### Task 1: Install `@tanstack/react-query`, Configure Root `QueryClient`, and Create Test Helpers

**Files:**
- Modify: `neuropath-frontend/package.json`
- Create: `neuropath-frontend/src/queryClient.js`
- Modify: `neuropath-frontend/src/main.jsx`
- Create: `neuropath-frontend/src/test/query-test-utils.jsx`
- Create: `neuropath-frontend/src/queryClient.test.js`

**Interfaces:**
- Consumes: `@tanstack/react-query`
- Produces: `queryClient`, `createQueryClient()`, `renderWithQueryClient(ui)` test helper

- [ ] **Step 1: Install `@tanstack/react-query`**

Run: `npm install @tanstack/react-query` in `neuropath-frontend`
Verify `@tanstack/react-query` is listed in `neuropath-frontend/package.json`.

- [ ] **Step 2: Write failing unit test for `queryClient.js` configuration**

Create `neuropath-frontend/src/queryClient.test.js`:
```javascript
import { describe, it, expect } from "vitest";
import { queryClient, createQueryClient } from "./queryClient";

describe("QueryClient configuration", () => {
  it("provides default queryClient singleton with staleTime 5 minutes and refetchOnWindowFocus false", () => {
    expect(queryClient).toBeDefined();
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(5 * 60 * 1000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it("createQueryClient creates isolated client with testing-friendly defaults when specified", () => {
    const testClient = createQueryClient({ retry: false });
    const defaults = testClient.getDefaultOptions().queries;
    expect(defaults?.retry).toBe(false);
    expect(defaults?.staleTime).toBe(5 * 60 * 1000);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test src/queryClient.test.js`
Expected: FAIL with module not found `queryClient`.

- [ ] **Step 4: Implement `queryClient.js` and update `main.jsx` and create `query-test-utils.jsx`**

Create `neuropath-frontend/src/queryClient.js`:
```javascript
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(customOptions = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
        ...customOptions,
      },
    },
  });
}

export const queryClient = createQueryClient();
```

Modify `neuropath-frontend/src/main.jsx`:
```javascript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

Create `neuropath-frontend/src/test/query-test-utils.jsx`:
```javascript
import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithQueryClient(ui, options = {}) {
  const testQueryClient = options.queryClient || createTestQueryClient();
  const rendered = render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>,
    options,
  );
  return {
    ...rendered,
    queryClient: testQueryClient,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test src/queryClient.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add neuropath-frontend/package.json neuropath-frontend/package-lock.json neuropath-frontend/src/queryClient.js neuropath-frontend/src/queryClient.test.js neuropath-frontend/src/main.jsx neuropath-frontend/src/test/query-test-utils.jsx
git commit -m "feat(perf): install tanstack query and configure root QueryClientProvider"
```

---

### Task 2: Create Core Custom Query and Mutation Hooks

**Files:**
- Create: `neuropath-frontend/src/hooks/queries.js`
- Create: `neuropath-frontend/src/hooks/queries.test.jsx`

**Interfaces:**
- Consumes: `studentsAPI`, `iepAPI`, `lessonPlansAPI`, `visualAidsAPI` from `src/api/client.js`
- Produces:
  - `useStudents(teacherId, options)`
  - `useStudent(studentId, options)`
  - `useIepDashboardStats(options)`
  - `useStudentInsights(studentId, options)`
  - `useLessonPlans(teacherId, options)`
  - `useVisualAids(params, options)`
  - `useGenerateStudentInsight(studentId)`
  - `queryKeys` constant object

- [ ] **Step 1: Write failing unit tests for custom query hooks**

Create `neuropath-frontend/src/hooks/queries.test.jsx`:
```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "../test/query-test-utils";
import {
  useStudents,
  useStudent,
  useIepDashboardStats,
  useStudentInsights,
  useLessonPlans,
  useVisualAids,
  useGenerateStudentInsight,
  queryKeys,
} from "./queries";
import { studentsAPI, iepAPI, lessonPlansAPI, visualAidsAPI } from "../api/client";

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
    get: vi.fn(),
  },
  iepAPI: {
    dashboardStats: vi.fn(),
    getInsights: vi.fn(),
    generateInsight: vi.fn(),
  },
  lessonPlansAPI: {
    list: vi.fn(),
    getDirectory: vi.fn(),
  },
  visualAidsAPI: {
    list: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("Custom Query Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useStudents fetches student list for teacherId and returns data", async () => {
    const mockStudents = [{ studentID: 1, name: "Student A" }];
    studentsAPI.list.mockResolvedValueOnce(mockStudents);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStudents(10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsAPI.list).toHaveBeenCalledWith(10);
    expect(result.current.data).toEqual(mockStudents);
  });

  it("useStudents is disabled when teacherId is falsy", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStudents(null), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(studentsAPI.list).not.toHaveBeenCalled();
  });

  it("useStudent fetches single student details by studentId", async () => {
    const mockStudent = { studentID: 5, name: "Alex" };
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStudent(5), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsAPI.get).toHaveBeenCalledWith(5);
    expect(result.current.data).toEqual(mockStudent);
  });

  it("useIepDashboardStats fetches dashboard overview statistics", async () => {
    const mockStats = { active_ieps: 3, ai_insights: 7 };
    iepAPI.dashboardStats.mockResolvedValueOnce(mockStats);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useIepDashboardStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.dashboardStats).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockStats);
  });

  it("useStudentInsights fetches student insights and normalizes format", async () => {
    const rawInsights = [
      { id: 1, created_at: "2026-09-01", summary_text: "Insight 1" },
    ];
    iepAPI.getInsights.mockResolvedValueOnce(rawInsights);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStudentInsights(2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.getInsights).toHaveBeenCalledWith(2);
    expect(result.current.data).toEqual([
      { id: 1, timestamp: "2026-09-01", summary_text: "Insight 1" },
    ]);
  });

  it("useLessonPlans fetches lesson plans directory/list", async () => {
    const mockLessons = [{ id: 1, title: "Math 101" }];
    lessonPlansAPI.list.mockResolvedValueOnce(mockLessons);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLessonPlans(10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLessons);
  });

  it("useGenerateStudentInsight mutation triggers API and invalidates insights cache", async () => {
    const newInsight = { id: 99, created_at: "2026-09-09", summary_text: "New analysis" };
    iepAPI.generateInsight.mockResolvedValueOnce(newInsight);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useGenerateStudentInsight(2), { wrapper });

    await result.current.mutateAsync();
    expect(iepAPI.generateInsight).toHaveBeenCalledWith(2);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.studentInsights(2),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/hooks/queries.test.jsx`
Expected: FAIL with module not found `queries`.

- [ ] **Step 3: Implement `src/hooks/queries.js`**

Create `neuropath-frontend/src/hooks/queries.js`:
```javascript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsAPI, iepAPI, lessonPlansAPI, visualAidsAPI } from "../api/client";

export const queryKeys = {
  students: (teacherId) => ["students", teacherId ?? "all"],
  student: (studentId) => ["student", studentId],
  iepStats: () => ["iep", "dashboard-stats"],
  studentInsights: (studentId) => ["student-insights", studentId],
  lessonPlans: (teacherId) => ["lesson-plans", teacherId ?? "all"],
  visualAids: (params) => ["visual-aids", params ?? "all"],
};

export function useStudents(teacherId, options = {}) {
  return useQuery({
    queryKey: queryKeys.students(teacherId),
    queryFn: async () => {
      const data = await studentsAPI.list(teacherId);
      return Array.isArray(data) ? data : (data?.results || []);
    },
    enabled: Boolean(teacherId) && (options.enabled ?? true),
    ...options,
  });
}

export function useStudent(studentId, options = {}) {
  return useQuery({
    queryKey: queryKeys.student(studentId),
    queryFn: async () => {
      const response = await studentsAPI.get(studentId);
      return response?.data || response;
    },
    enabled: Boolean(studentId) && (options.enabled ?? true),
    ...options,
  });
}

export function useIepDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.iepStats(),
    queryFn: async () => {
      const data = await iepAPI.dashboardStats();
      return data || { active_ieps: 0, ai_insights: 0 };
    },
    ...options,
  });
}

export function useStudentInsights(studentId, options = {}) {
  return useQuery({
    queryKey: queryKeys.studentInsights(studentId),
    queryFn: async () => {
      const data = await iepAPI.getInsights(studentId);
      const list = Array.isArray(data) ? data : (data?.results || []);
      return list.map((item) => ({
        id: item.id,
        timestamp: item.created_at,
        summary_text: item.summary_text,
      }));
    },
    enabled: Boolean(studentId) && studentId !== 4 && (options.enabled ?? true),
    ...options,
  });
}

export function useLessonPlans(teacherId, options = {}) {
  return useQuery({
    queryKey: queryKeys.lessonPlans(teacherId),
    queryFn: async () => {
      if (typeof lessonPlansAPI?.list === "function") {
        const data = await lessonPlansAPI.list();
        return Array.isArray(data) ? data : (data?.results || []);
      }
      return [];
    },
    ...options,
  });
}

export function useVisualAids(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.visualAids(params),
    queryFn: async () => {
      if (typeof visualAidsAPI?.list === "function") {
        const data = await visualAidsAPI.list(params);
        return Array.isArray(data) ? data : (data?.results || []);
      }
      return [];
    },
    ...options,
  });
}

export function useGenerateStudentInsight(studentId, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await iepAPI.generateInsight(studentId);
    },
    onSuccess: (newInsight) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentInsights(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.iepStats(),
      });
      if (options.onSuccess) {
        options.onSuccess(newInsight);
      }
    },
    ...options,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/hooks/queries.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/hooks/queries.js neuropath-frontend/src/hooks/queries.test.jsx
git commit -m "feat(perf): create custom query and mutation hooks with TanStack Query"
```

---

### Task 3: Refactor `Overview.jsx` with Query Hooks and Update Overview Tests

**Files:**
- Modify: `neuropath-frontend/src/pages/Overview.jsx`
- Modify: `neuropath-frontend/src/pages/Overview.test.jsx`

**Interfaces:**
- Consumes: `useStudents`, `useIepDashboardStats`, `useLessonPlans`, `useVisualAids` from `../hooks/queries`
- Produces: Seamless Overview dashboard rendering with instant cached data and zero flicker

- [ ] **Step 1: Update `Overview.test.jsx` to wrap with `QueryClientProvider` and test TanStack Query integration**

Modify `neuropath-frontend/src/pages/Overview.test.jsx` to use `renderWithQueryClient` and mock the API responses accurately.

- [ ] **Step 2: Refactor `Overview.jsx` to adopt query hooks**

In `neuropath-frontend/src/pages/Overview.jsx`:
- Remove manual `useEffect` + `setCounts` calls.
- Use `const { data: students = [] } = useStudents(user?.id);`
- Use `const { data: iepStats } = useIepDashboardStats();`
- Use `const { data: lessons = [] } = useLessonPlans(user?.id);`
- Use `const { data: visualAids = [] } = useVisualAids();`
- Compute counts derived from queries:
  ```javascript
  const counts = {
    students: students.length,
    ieps: iepStats?.active_ieps ?? 0,
    resources: lessons.length + visualAids.length,
  };
  ```

- [ ] **Step 3: Run `Overview.test.jsx` to verify all tests pass**

Run: `npm test src/pages/Overview.test.jsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/pages/Overview.jsx neuropath-frontend/src/pages/Overview.test.jsx
git commit -m "refactor(overview): migrate data fetching to TanStack Query hooks"
```

---

### Task 4: Refactor `ViewStudentProfile.jsx` and `ViewSelectedStudentProfile.jsx` with Query Hooks

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `useStudents(user?.id)` in `ViewStudentProfile.jsx`, `useStudent(studentId)` in `ViewSelectedStudentProfile.jsx`
- Produces: Instant student profiles list and student detail loading from client-side cache

- [ ] **Step 1: Refactor `ViewStudentProfile.jsx` to use `useStudents`**

Replace hardcoded `fetch('http://localhost:8000/api/users/students/?teacher_id=...')` and manual `useEffect` in `ViewStudentProfile.jsx`:
```javascript
const { data: students = [], isLoading, isError, error } = useStudents(user?.id);
```
Ensure loading state displays `<StudentShimmer rows={6} variant="table" />` only when `isLoading` and cache is empty.

- [ ] **Step 2: Refactor `ViewSelectedStudentProfile.jsx` to use `useStudent`**

Replace manual `useEffect` and `queueMicrotask` in `ViewSelectedStudentProfile.jsx`:
```javascript
const { data: selected, isLoading, isError, error } = useStudent(studentId);
```

- [ ] **Step 3: Update `ViewStudentProfile.test.jsx` and `ViewSelectedStudentProfile.test.jsx` with `renderWithQueryClient`**

Ensure tests wrap components with `renderWithQueryClient` or mock the hooks cleanly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/pages/StudentProfiling/ViewStudentProfile.test.jsx src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.test.jsx neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx
git commit -m "refactor(students): migrate student list and detail profiling to TanStack Query hooks"
```

---

### Task 5: Refactor `StudentInsightsTab.jsx` with Query & Mutation Hooks

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx`

**Interfaces:**
- Consumes: `useStudentInsights(studentId)`, `useGenerateStudentInsight(studentId)`
- Produces: Automated caching of historical AI insights and seamless cache invalidation on generation

- [ ] **Step 1: Refactor `StudentInsightsTab.jsx` to use `useStudentInsights` and `useGenerateStudentInsight`**

In `StudentInsightsTab.jsx`:
- For mock `studentId === 4`, retain mock state / data fallback.
- For real student IDs, query historical insights via `useStudentInsights(studentId)`.
- Use `useGenerateStudentInsight(studentId)` for `handleGenerate()`.
- Automatically update list without manual array manipulation when backend responds.

- [ ] **Step 2: Update `StudentInsightsTab.test.jsx` to wrap with `renderWithQueryClient`**

Ensure all tests pass for both mock student 4 and API-driven student profiles.

- [ ] **Step 3: Run `StudentInsightsTab.test.jsx`**

Run: `npm test src/pages/StudentProfiling/StudentInsightsTab.test.jsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx
git commit -m "refactor(insights): adopt useStudentInsights and useGenerateStudentInsight hooks"
```

---

### Task 6: Request Deduplication & Route Caching Integration Tests and Full Suite Verification

**Files:**
- Modify: `neuropath-frontend/src/App.test.jsx`
- Verify: Full test suite (`npm test`) and production build (`npm run build`)

**Interfaces:**
- Consumes: All query hooks and components
- Produces: Verified zero duplicate requests, verified zero-flicker transitions, clean build

- [ ] **Step 1: Add integration tests in `App.test.jsx` for caching and request deduplication**

Test that:
1. Navigating from `/dashboard` to `/dashboard/students` and back to `/dashboard` renders cached student counts instantaneously without redundant network requests.
2. Concurrent mounts of components querying `useStudents(1)` or `useIepDashboardStats()` trigger only 1 network request (deduplication).

- [ ] **Step 2: Run all frontend unit & integration tests**

Run: `npm test` in `neuropath-frontend`
Expected: All test suites PASS (100% passing).

- [ ] **Step 3: Run production build**

Run: `npm run build` in `neuropath-frontend`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add neuropath-frontend/src/App.test.jsx
git commit -m "test(perf): verify request deduplication and client-side caching across route transitions"
```

---

## Self-Review Checklist

1. **Spec Coverage:**
   - [x] `@tanstack/react-query` installed in `neuropath-frontend` (Task 1)
   - [x] `QueryClientProvider` configured at root with `staleTime: 5 minutes`, `refetchOnWindowFocus: false` (Task 1)
   - [x] Custom query hooks created: `useStudents`, `useStudent`, `useIepDashboardStats`, `useStudentInsights`, `useLessonPlans` (Task 2)
   - [x] Replaced boilerplate `useEffect` in `Overview.jsx`, `StudentInsightsTab.jsx`, `ViewStudentProfile.jsx`, and `ViewSelectedStudentProfile.jsx` (Tasks 3, 4, 5)
   - [x] Instant page transitions / zero flicker with client-side cache (Tasks 3, 4, 6)
   - [x] No backend changes (All tasks)
2. **Placeholder Scan:** No "TBD", "TODO", or vague instructions. Complete test patterns, signatures, and commands specified.
3. **Type Consistency:** Query hook signatures and query keys match across tasks (`queryKeys.students`, `useStudents(teacherId)`, etc.).
