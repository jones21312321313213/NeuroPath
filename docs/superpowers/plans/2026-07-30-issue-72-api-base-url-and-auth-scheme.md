# Issue #72 — Fix Hardcoded Localhost URLs & Auth Header Scheme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every frontend backend call go through the single env-driven base URL in `src/api/client.js` using one consistent `Token` auth header, so pointing `VITE_API_URL` at a non-localhost backend works with zero code changes.

**Architecture:** `src/api/client.js` becomes the only place that knows the backend host. Its `request()` helper already attaches `Authorization: Token <key>` and throws on `!response.ok`, so every caller (AuthContext, Sidebar, the two student-profile pages) routes through the exported API objects instead of raw `fetch`/`axios`. The fictional `/auth/*` surface in `authAPI` is replaced with the real `/users/*` routes the Django backend actually serves, and a matching `POST /api/users/logout/` endpoint is added to the backend so logout is no longer a no-op.

**Tech Stack:** React 19 + Vite 8 (frontend, ESLint flat config, no test runner), Django + DRF with `rest_framework.authtoken` (backend, ruff-linted).

## Global Constraints

- Auth header scheme is **`Authorization: Token <key>`** everywhere. The backend sets `DEFAULT_AUTHENTICATION_CLASSES = ['rest_framework.authentication.TokenAuthentication']` (`neuropath-backend/neuropath_core/settings.py:158-162`) and `TeacherLoginController` returns `Token.objects.get_or_create(user=user).key` (`neuropath-backend/users/views.py:237`). `Bearer` is wrong and must not survive anywhere.
- Token is read from `localStorage` key `neuropath_access_token`; user object from `neuropath_user`. Do not rename these keys.
- The only permitted fallback host literal is the one inside `client.js`: `import.meta.env.VITE_API_URL || "http://localhost:8000/api"`, defined **once** as `BASE_URL`. No other file in `neuropath-frontend/src/` may contain `localhost` or `127.0.0.1`.
- `VITE_API_URL` includes the `/api` prefix (see `neuropath-frontend/.env.example`). Endpoint paths passed to `request()` therefore start after `/api` — e.g. `/users/login/`.
- Real backend routes (`neuropath-backend/users/urls.py`, mounted at `api/users/` by `neuropath_core/urls.py:24`): `register/`, `login/`, `students/`, `students/<pk>/`, `students/<pk>/view/`, `profile/update/`. There is **no** `/api/auth/…` namespace and **no** token-refresh endpoint — `djangorestframework_simplejwt` is in `requirements.txt` but unused by any code.
- Frontend has no test runner (`neuropath-frontend/package.json` has no `test` script). Verification is `npm run lint` + `npm run build` for frontend and `ruff check .` + `python manage.py check` for backend, matching `.github/workflows/ci.yml`.
- Commit after each task.

---

## File Structure

| File | Responsibility after this change |
| --- | --- |
| `neuropath-frontend/src/api/client.js` | **Modify.** Sole owner of `BASE_URL`; exports it. `authAPI` rewritten to real `/users/*` routes. `usersAPI.updateProfile` switched from FormData+`Bearer` to JSON via `request()` (i.e. `Token`). Inline base-URL literals in `visualAidsAPI.exportUrl` / `teachingStrategiesAPI.exportUrl` replaced with `BASE_URL`. |
| `neuropath-frontend/src/context/AuthContext.jsx` | **Modify.** Drops its own `BASE_URL` and `axios`; `login`/`register`/`logout`/`updateUser` delegate to `authAPI` / `usersAPI`. |
| `neuropath-frontend/src/components/layout/Sidebar.jsx` | **Modify.** Drops `axios` and the hardcoded logout URL; calls `logout()` from `useAuth()`. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx` | **Modify.** Raw `fetch` → `studentsAPI.list(teacherId)`; adds an error state. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx` | **Modify.** Raw `fetch` → `studentsAPI.get(studentId)`; adds an error state. |
| `neuropath-backend/users/views.py` | **Modify.** Adds `TeacherLogoutController` deleting the caller's auth token. |
| `neuropath-backend/users/urls.py` | **Modify.** Routes `logout/` to `TeacherLogoutController`. |

---

## Task 1: Backend logout endpoint

The frontend requirement "logout must actually call the backend correctly" is unimplementable today — `POST /api/users/logout/` 404s because no such route exists (`neuropath-backend/users/urls.py:10-23`). With DRF `TokenAuthentication` the token never expires, so a client-only logout leaves a valid credential alive forever. This task adds the minimal server-side counterpart: delete the token row.

**Files:**
- Modify: `neuropath-backend/users/views.py` (append after `TeacherProfileUpdateController`, which ends at line ~323)
- Modify: `neuropath-backend/users/urls.py:12`

**Interfaces:**
- Produces: `POST /api/users/logout/` — requires `Authorization: Token <key>`; returns `200 {"message": "Logout successful."}`; returns `401` when the header is missing or the token is unknown.

- [ ] **Step 1: Add the logout controller**

Append to `neuropath-backend/users/views.py`:

```python
# =====================================================================
# TEACHER LOGOUT
# POST /api/users/logout/
# Deletes the caller's DRF auth token so the credential can no longer
# be replayed. Requires Authorization: Token <key>.
# =====================================================================
class TeacherLogoutController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Token.objects.filter(user=request.user).delete()
        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )
```

`APIView`, `IsAuthenticated`, `Token`, `Response`, and `status` are already imported at `neuropath-backend/users/views.py:1-11` — do not add imports.

- [ ] **Step 2: Route it**

In `neuropath-backend/users/urls.py`, add `TeacherLogoutController` to the existing `from .views import(...)` block and add the route directly below the `login/` line:

```python
    path('login/', TeacherLoginController.as_view(), name='teacher-login'),
    path('logout/', TeacherLogoutController.as_view(), name='teacher-logout'),
```

- [ ] **Step 3: Verify**

Run from `neuropath-backend`:

```bash
ruff check .
python manage.py check
```

Expected: `ruff check .` reports no new errors versus the pre-change baseline; `python manage.py check` prints `System check identified no issues`.

- [ ] **Step 4: Commit**

```bash
git add neuropath-backend/users/views.py neuropath-backend/users/urls.py
git commit -m "feat(users): add POST /api/users/logout/ that revokes the auth token"
```

---

## Task 2: Make `client.js` the single source of base URL and auth surface

**Files:**
- Modify: `neuropath-frontend/src/api/client.js:1-2` (export `BASE_URL`), `:36-55` (`authAPI`), `:116` and `:134` (inline literals), `:214-239` (`usersAPI`)

**Interfaces:**
- Produces:
  - `export const BASE_URL: string`
  - `authAPI.login({ email, password }) → Promise<{ message, token, teacher }>`
  - `authAPI.register(payload) → Promise<object>`
  - `authAPI.logout() → Promise<{ message }>`
  - `usersAPI.updateProfile({ id, first_name, last_name, email, password? }) → Promise<{ id, first_name, last_name, email }>`
  - `studentsAPI.list(teacherId) → Promise<Array>` and `studentsAPI.get(id) → Promise<object>` (already present at `:58-72`, unchanged)

- [ ] **Step 1: Export `BASE_URL`**

Replace lines 1-2 of `neuropath-frontend/src/api/client.js`:

```js
// Single source of truth for the backend host. Set VITE_API_URL (including the
// /api prefix) to point the app at a non-localhost backend — see .env.example.
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";
```

- [ ] **Step 2: Replace `authAPI` with the routes the backend actually serves**

Replace the whole `authAPI` block (`:36-55`) with:

```js
// ── Auth ───────────────────────────────────────────────────────────────────────
// Routes live under /api/users/ (see neuropath-backend/users/urls.py).
// The backend uses DRF TokenAuthentication: tokens do not expire and there is
// no refresh endpoint, so there is nothing to refresh.
export const authAPI = {
  register: (payload) =>
    request("/users/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/users/login/", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/users/logout/", { method: "POST" }),
};
```

`me` and `refreshToken` are removed: `/auth/me/` and `/auth/token/refresh/` do not exist on the backend and neither was ever called.

- [ ] **Step 3: Use `BASE_URL` in the two export-URL helpers**

At `neuropath-frontend/src/api/client.js:116` replace:

```js
  exportUrl: (id) => `${BASE_URL}/resources/export-visual-aid/${id}/`,
```

and at `:134` replace:

```js
  exportUrl: (id) => `${BASE_URL}/resources/query-strategies/${id}/export/`,
```

- [ ] **Step 4: Rewrite `usersAPI.updateProfile` to use `request()`**

Replace the whole `usersAPI` block (`:214-239`) with:

```js
// ── Users / Teacher Profile ────────────────────────────────────────────────────
export const usersAPI = {
  // PATCH /api/users/profile/update/
  // Accepts { id, first_name, last_name, email, password? } as JSON — the
  // backend controller reads request.data and does not handle file uploads.
  updateProfile: (payload) =>
    request("/users/profile/update/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
```

This deletes the last `Authorization: Bearer` usage and the duplicated `res.ok`/error-message block, which `request()` (`:18-32`) already does identically.

- [ ] **Step 5: Verify**

Run from `neuropath-frontend`:

```bash
npm run lint
```

Expected: no errors. (`client.js` has no importers of the removed members yet — Task 3 wires them up.)

- [ ] **Step 6: Commit**

```bash
git add neuropath-frontend/src/api/client.js
git commit -m "refactor(api): export BASE_URL, point authAPI at real /users routes, drop Bearer scheme"
```

---

## Task 3: Route `AuthContext` through `client.js`

**Files:**
- Modify: `neuropath-frontend/src/context/AuthContext.jsx:1-4` (imports), `:17-43` (`login`/`register`/`logout`), `:49-96` (`updateUser`)

**Interfaces:**
- Consumes: `authAPI.login`, `authAPI.register`, `authAPI.logout`, `usersAPI.updateProfile` from Task 2.
- Produces: context value `{ user, login, register, logout, updateUser, isAuthenticated }` — same shape as today, so `Sidebar.jsx` and `UserProfilePage.jsx` keep working. `logout` is now `async`.

- [ ] **Step 1: Swap the imports**

Replace lines 1-5 of `neuropath-frontend/src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { authAPI, usersAPI } from "../api/client";

const AuthContext = createContext(null);
```

`axios` and the local `BASE_URL` are gone — `client.js` owns the host.

- [ ] **Step 2: Rewrite `login` and `register`**

Replace `:17-37`:

```jsx
  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem("neuropath_access_token", data.token);
    localStorage.setItem("neuropath_user", JSON.stringify(data.teacher));
    setUser(data.teacher);
    return data;
  };

  const register = async (userData) => authAPI.register(userData);
```

Note the response shape changes from axios (`response.data`) to `request()` (the parsed body directly). `LoginPage`/`RegisterPage` consume the return value of these context functions, not axios responses, so they are unaffected.

- [ ] **Step 3: Make `logout` revoke the token server-side**

Replace `:39-43`:

```jsx
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Token already invalid or backend unreachable — clear locally regardless.
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("neuropath_user");
      localStorage.removeItem("neuropath_access_token");
      setUser(null);
    }
  }, []);
```

- [ ] **Step 4: Rewrite `updateUser` on top of `usersAPI.updateProfile`**

Replace `:49-96`:

```jsx
  // ── Update teacher profile ─────────────────────────────
  // PATCH /api/users/profile/update/ — the backend identifies the teacher by
  // the `id` field in the body and authenticates via the Token header.
  const updateUser = useCallback(
    async (formData) => {
      const payload = {
        id: user?.id,
        first_name: formData.get("first_name") || "",
        last_name: formData.get("last_name") || "",
        email: formData.get("email") || "",
      };

      // Only include password if the user actually typed one
      const password = formData.get("password");
      if (password) payload.password = password;

      const data = await usersAPI.updateProfile(payload);

      // Merge updated fields back into React state + localStorage
      const updated = { ...user, ...data };
      localStorage.setItem("neuropath_user", JSON.stringify(updated));
      setUser(updated);

      return data;
    },
    [user],
  );
```

`UserProfilePage.jsx:97` calls `await updateUser(formData)` with a `FormData` instance and catches thrown errors, so the `FormData` parameter and throw-on-failure contract are preserved.

- [ ] **Step 5: Verify**

Run from `neuropath-frontend`:

```bash
npm run lint
```

Expected: no errors, and no unused-import warning for `axios`.

- [ ] **Step 6: Commit**

```bash
git add neuropath-frontend/src/context/AuthContext.jsx
git commit -m "refactor(auth): route AuthContext login/register/logout/profile through api client"
```

---

## Task 4: Fix `Sidebar.jsx` logout

**Files:**
- Modify: `neuropath-frontend/src/components/layout/Sidebar.jsx:1-4` (imports), `:50` (`useAuth` destructure), `:62-75` (`handleConfirmLogout`)

**Interfaces:**
- Consumes: `logout` from `useAuth()` (Task 3).

- [ ] **Step 1: Drop the axios import**

Replace lines 1-4:

```jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutModal from "./LogoutModal";
```

- [ ] **Step 2: Pull `logout` out of the context**

At `:50` replace `const { user } = useAuth();` with:

```jsx
  const { user, logout } = useAuth();
```

- [ ] **Step 3: Delegate to the context's `logout`**

Replace `handleConfirmLogout` (`:62-75`):

```jsx
  const handleConfirmLogout = async () => {
    // AuthContext.logout() revokes the token server-side and clears auth state;
    // it never throws, so the redirect below always runs.
    await logout();
    sessionStorage.clear();
    setIsModalOpen(false);
    window.location.href = "/login";
  };
```

`localStorage.clear()` is replaced by the targeted `removeItem` calls inside `logout()`, which is deliberate — `clear()` also wiped unrelated app state.

- [ ] **Step 4: Verify**

Run from `neuropath-frontend`:

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/layout/Sidebar.jsx
git commit -m "fix(sidebar): logout via AuthContext with the app's Token auth scheme"
```

---

## Task 5: Route the student-profile pages through `studentsAPI`

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx:1-4` (imports), `:10-32` (state + effect), and the loading/empty render path
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx:1-3` (imports), `:43-61` (state + effect), and the `!selected` render path

**Interfaces:**
- Consumes: `studentsAPI.list(teacherId)` and `studentsAPI.get(id)` from `client.js:59-61`. Both go through `request()`, which throws an `Error` with a backend-derived message when `!response.ok` — this replaces the missing `res.ok` check.

- [ ] **Step 1: `ViewStudentProfile.jsx` — import the client**

Add to the import block at the top (after the `StudentShimmer` import at `:4`):

```jsx
import { studentsAPI } from "../../api/client";
```

- [ ] **Step 2: `ViewStudentProfile.jsx` — add an error state**

Replace `:10-13`:

```jsx
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
```

- [ ] **Step 3: `ViewStudentProfile.jsx` — replace the raw fetch**

Replace the effect body (`:15-32`):

```jsx
  useEffect(() => {
    const teacherId = user?.id;
    if (!teacherId) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let cancelled = false;
    setError("");

    studentsAPI
      .list(teacherId)
      .then((data) => {
        if (cancelled) return;
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load student profiles.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);
```

- [ ] **Step 4: `ViewStudentProfile.jsx` — surface the error**

Directly after the `if (loading) { … }` block (which ends at `:60`), insert:

```jsx
  if (error) {
    return (
      <div className="page-content">
        <div className="form-card">
          <h2 className="form-section-title">View Student Profiles</h2>
          <div className="placeholder-page">{error}</div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: `ViewSelectedStudentProfile.jsx` — import the client**

Add after the `StudentInsightsTab` import at `:3`:

```jsx
import { studentsAPI } from "../../api/client";
```

- [ ] **Step 6: `ViewSelectedStudentProfile.jsx` — add an error state**

Replace `:44-46`:

```jsx
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");
```

- [ ] **Step 7: `ViewSelectedStudentProfile.jsx` — replace the raw fetch**

Replace the effect body (`:48-61`):

```jsx
  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    setError("");

    studentsAPI
      .get(studentId)
      .then((response) => {
        if (cancelled) return;
        setSelected(response?.data || response);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load student details.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);
```

- [ ] **Step 8: `ViewSelectedStudentProfile.jsx` — surface the error**

Replace the `if (!selected) { … }` block (`:76-82`):

```jsx
  if (error || !selected) {
    return (
      <div className="page-content">
        <div className="placeholder-page">
          {error || "No student details found."}
        </div>
      </div>
    );
  }
```

- [ ] **Step 9: Verify**

Run from `neuropath-frontend`:

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx
git commit -m "refactor(students): fetch profiles via api client with error handling"
```

---

## Task 6: Verify the acceptance criteria hold

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Prove no hardcoded hosts remain outside the single fallback**

Run from `neuropath-frontend`:

```bash
grep -rn "127\.0\.0\.1\|localhost" src/
```

Expected output: exactly one line — the `BASE_URL` fallback in `src/api/client.js`.

- [ ] **Step 2: Prove one auth header scheme**

Run from `neuropath-frontend`:

```bash
grep -rn "Authorization" src/
```

Expected output: exactly one line — `Authorization: \`Token ${token}\`` inside `request()` in `src/api/client.js`.

- [ ] **Step 3: Prove `axios` is no longer used for backend calls**

Run from `neuropath-frontend`:

```bash
grep -rn "axios" src/
```

Expected output: nothing.

- [ ] **Step 4: Lint and build**

Run from `neuropath-frontend`:

```bash
npm run lint
npm run build
```

Expected: lint clean, build succeeds.

- [ ] **Step 5: Backend gates**

Run from `neuropath-backend`:

```bash
ruff check .
python manage.py check
```

Expected: no new ruff errors versus baseline; `System check identified no issues`.

- [ ] **Step 6: Manual non-localhost check (human partner)**

Set `neuropath-frontend/.env` to a non-localhost value, e.g. `VITE_API_URL=http://127.0.0.1:8000/api` swapped for the LAN IP of the backend host (`VITE_API_URL=http://192.168.x.x:8000/api`), add that host to `ALLOWED_HOSTS`/CORS on the backend, then run `npm run dev` and exercise: register → login → view student profiles → open one profile → edit profile → logout. All five must succeed with no code changes.

- [ ] **Step 7: Commit any doc updates**

If nothing changed in this task, skip the commit.

---

## Self-Review

**Spec coverage:**

| Issue #72 requirement | Task |
| --- | --- |
| Replace every hardcoded `127.0.0.1`/`localhost` URL with the shared base URL | Tasks 2, 3, 4, 5; verified in Task 6 Step 1 |
| Route the two student-profile pages through `client.js` with `res.ok` handling | Task 5 (error handling comes from `request()`) |
| Pick one auth header scheme matching the backend | `Token`, per Global Constraints; `Bearer` removed in Task 2 Step 4; verified in Task 6 Step 2 |
| Consolidate on a single auth API surface; wire up refresh if meant to be used | Task 2 Step 2 + Task 3. Refresh is **removed, not wired**: the backend serves no refresh endpoint and DRF `TokenAuthentication` tokens do not expire. |
| Fix `Sidebar.jsx` logout to call the backend with the real auth scheme | Task 1 (endpoint) + Task 3 Step 3 + Task 4 |
| AC: non-localhost `VITE_API_URL` works with no code changes | Task 6 Step 6 |
| AC: no raw hardcoded backend hosts in `src/` | Task 6 Step 1 |
| AC: one consistent header scheme | Task 6 Step 2 |

**Deviation from the issue, flagged for the reviewer:** the issue assumes `POST /api/users/logout/` exists. It does not — hence Task 1 adds it (backend change in a `[FE]`-labelled issue). Without it, "fix logout to actually call the backend correctly" cannot be satisfied and the token would remain valid after logout.

**Type consistency:** `authAPI.logout()` takes no argument (the token identifies the user via the header) — unlike the old `logout(refreshToken)` signature, and Task 3 Step 3 calls it with no argument. `usersAPI.updateProfile` takes a plain object in Tasks 2 and 3, not `FormData`; `AuthContext.updateUser` still accepts `FormData` from `UserProfilePage.jsx` and converts it. `studentsAPI.list`/`get` signatures are unchanged from `client.js`.
