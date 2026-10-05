# Issue #198: Interactive Breadcrumbs, Unsaved-Changes Guard, Toasts, Error Recovery & Rosters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver QA enhancements ENH06 through ENH10, transforming static breadcrumbs into interactive navigation, safeguarding dirty form inputs with an unsaved-changes guard, providing a unified toast notification system, equipping error states with actionable retry capabilities, and adding roster search, sorting, and pagination.

**Architecture:**
- Create reusable navigation, guard, feedback, and layout primitives in `src/components/layout/` and `src/components/ui/`.
- Provide centralized `ToastContext` providing non-blocking, accessible feedback for asynchronous actions.
- Build an unsaved-changes hook and modal safeguarding educators from accidental data loss across key editing views.
- Standardize query error recovery with `ErrorState` across student and resource views.
- Equip roster pages with sorting and a responsive `Pagination` control.

**Tech Stack:** React 19, React Router v7, TanStack Query v5, Tailwind CSS, Vitest, React Testing Library.

---

### Task 1: ENH06 — Interactive Breadcrumb Navigation Links

**Files:**
- Create: `neuropath-frontend/src/components/layout/Breadcrumbs.jsx`
- Create: `neuropath-frontend/src/components/layout/Breadcrumbs.test.jsx`
- Modify: `neuropath-frontend/src/components/layout/Topbar.jsx`
- Modify: `neuropath-frontend/src/App.jsx`
- Modify: `neuropath-frontend/src/styles/Topbar.css`

**Interfaces:**
- `Breadcrumbs({ items })`: `items` is `Array<{ label: string, to?: string }>` (or backward-compatible string).
- Intermediate items render accessible `<Link to={to} className="topbar-breadcrumb-link">`.
- Terminal item renders `<span aria-current="page" className="topbar-breadcrumb-current">`.

- [ ] **Step 1: Write unit tests for Breadcrumbs in `Breadcrumbs.test.jsx`**
- [ ] **Step 2: Implement `Breadcrumbs.jsx` with full ARIA semantics (`<nav aria-label="Breadcrumb">`, `<ol>`, `<li>`, `aria-current="page"`)**
- [ ] **Step 3: Update `App.jsx` `getBreadcrumb` to return structured item arrays and wire into `Topbar.jsx`**
- [ ] **Step 4: Update `Topbar.css` with clean link styling and hover states**
- [ ] **Step 5: Verify all breadcrumb and layout tests pass**

---

### Task 2: ENH07 — Unsaved-Changes Protection & Navigation Guard

**Files:**
- Create: `neuropath-frontend/src/components/ui/UnsavedChangesModal.jsx`
- Create: `neuropath-frontend/src/components/ui/__tests__/UnsavedChangesModal.test.jsx`
- Create: `neuropath-frontend/src/hooks/useUnsavedChanges.js`
- Create: `neuropath-frontend/src/hooks/__tests__/useUnsavedChanges.test.jsx`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`

**Interfaces:**
- `useUnsavedChanges({ isDirty, message })`:
  - Returns `{ showPrompt, confirmNavigation, cancelNavigation, handleBlockedNavigation }`.
  - Attaches `window.addEventListener("beforeunload")` when `isDirty` is true.
  - Listens for `popstate` to intercept browser back button.
- `UnsavedChangesModal({ isOpen, onConfirm, onCancel, title, message })`:
  - Accessible modal dialog (`role="dialog"`, `aria-modal="true"`).
  - "Stay on Page" (primary, calls `onCancel`).
  - "Discard & Leave" (danger/secondary, calls `onConfirm`).

- [ ] **Step 1: Write unit tests for `UnsavedChangesModal.test.jsx`**
- [ ] **Step 2: Implement `UnsavedChangesModal.jsx`**
- [ ] **Step 3: Write tests for `useUnsavedChanges.test.jsx` and implement `useUnsavedChanges.js`**
- [ ] **Step 4: Integrate guard into `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx`**
- [ ] **Step 5: Verify form dirty-checking and modal prompt behavior with unit tests**

---

### Task 3: ENH08 — Standardized Action Toast Notification System

**Files:**
- Create: `neuropath-frontend/src/context/ToastContext.jsx`
- Create: `neuropath-frontend/src/context/ToastContext.test.jsx`
- Create: `neuropath-frontend/src/components/ui/ToastContainer.jsx`
- Modify: `neuropath-frontend/src/App.jsx`
- Integrate into CRUD pages (`CreateStudentProfile.jsx`, `UpdateStudentProfile.jsx`)

**Interfaces:**
- `useToast()` returns `{ toast: { success(msg, opts), error(msg, opts), info(msg, opts), warning(msg, opts) }, removeToast(id) }`.
- Toast notification item: `{ id, type, message, duration }`.
- `ToastContainer`: Fixed bottom-right overlay, `role="status"`, `aria-live="polite"`, auto-dismiss after duration (default 4000ms), manual close button.

- [ ] **Step 1: Write unit tests for `ToastContext.test.jsx`**
- [ ] **Step 2: Implement `ToastContext.jsx` and `ToastContainer.jsx`**
- [ ] **Step 3: Wire `ToastProvider` and `<ToastContainer />` into `App.jsx`**
- [ ] **Step 4: Trigger success toasts upon student profile creation and updates**
- [ ] **Step 5: Verify toast dispatch, rendering, and auto-dismiss tests pass**

---

### Task 4: ENH09 — Actionable "Retry" Buttons on Error & Empty States

**Files:**
- Create: `neuropath-frontend/src/components/ui/ErrorState.jsx`
- Create: `neuropath-frontend/src/components/ui/__tests__/ErrorState.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx`

**Interfaces:**
- `ErrorState({ title, message, onRetry, className })`:
  - Renders `role="alert"`, descriptive text, warning icon, and "Try Again" button calling `onRetry`.
  - Accessible focus and high-contrast styling.

- [ ] **Step 1: Write unit tests for `ErrorState.test.jsx`**
- [ ] **Step 2: Implement `ErrorState.jsx`**
- [ ] **Step 3: Replace static placeholder error screens in `ViewStudentProfile.jsx` and `ViewSelectedStudentProfile.jsx` with `ErrorState` and wire `refetch`**
- [ ] **Step 4: Verify error recovery tests pass**

---

### Task 5: ENH10 — Search, Sorting, and Pagination Controls for Lists

**Files:**
- Create: `neuropath-frontend/src/components/ui/Pagination.jsx`
- Create: `neuropath-frontend/src/components/ui/__tests__/Pagination.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.test.jsx`

**Interfaces:**
- `Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize, onPageSizeChange })`:
  - Accessible `<nav aria-label="Pagination Navigation">`.
  - Previous / Next buttons with `disabled` states at boundaries.
  - Page number chips with `aria-current="page"`.
- `ViewStudentProfile.jsx`:
  - State: `search`, `sortBy` ("name_asc", "name_desc", "grade_asc", "grade_desc"), `page`, `pageSize`.
  - Slices `filtered` students according to `page` and `pageSize`.
  - Renders sort selector dropdown and `Pagination` component.

- [ ] **Step 1: Write unit tests for `Pagination.test.jsx`**
- [ ] **Step 2: Implement `Pagination.jsx`**
- [ ] **Step 3: Update `ViewStudentProfile.jsx` with sorting dropdown and paginated rendering**
- [ ] **Step 4: Add unit tests in `ViewStudentProfile.test.jsx` verifying search, sorting, and pagination**
- [ ] **Step 5: Run full frontend test suite and linter to confirm zero regressions**
