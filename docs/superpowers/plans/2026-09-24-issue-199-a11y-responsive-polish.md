# Elevate Color Contrast, Responsive Breakpoints, Focus Rings, Active Sidebar & Date Pickers (Issue #199) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement enhancements ENH11 through ENH15 to achieve full WCAG 2.1 AA color contrast compliance, responsive mobile/tablet layouts, visible keyboard focus rings, visually distinct active sidebar navigation with `aria-current="page"`, and standardized calendar date pickers across forms.

**Architecture:** 
1. Refactor `Sidebar.jsx` and `App.css` to add `aria-current="page"` and prominent, high-contrast active states (`#ffffff` background with `#0369a1` text and left accent bar) along with visible `:focus-visible` rings.
2. Remove destructive `outline: none !important` instances across stylesheets and add accessible `:focus-visible` rings across interactive elements, while updating low-contrast light blue typography (`#38bdf8`, `#82c7ff`, `#5aabf0`, `#5a9dbf`) to WCAG 2.1 AA compliant hues (`#0284c7`, `#0369a1`, `#0f172a`).
3. Add responsive mobile/tablet media queries for Section B tables, Outcome Monitoring grids, and student cards, ensuring touch targets meet the $\ge 44 \times 44\text{ px}$ requirement and tables scroll horizontally without breaking viewports.
4. Upgrade student profiling birthdate inputs in `CreateStudentProfile.jsx` and `UpdateStudentProfile.jsx` to native `type="date"` calendar pickers with format hints and robust date validation.

**Tech Stack:** React 19, Tailwind CSS 4, React Router 7, Vitest, Testing Library.

## Global Constraints

- Scope is strictly limited to `neuropath-frontend` (zero backend/API changes).
- All modified styles and components must meet WCAG 2.1 AA contrast requirements ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text/UI components).
- Interactive touch targets must meet the minimum size requirement ($\ge 44 \times 44\text{ px}$).
- Zero ESLint warnings or errors (`npm run lint`).
- 100% test pass rate across all Vitest test suites (`npm test -- --run`).
- Vite production build must succeed (`npm run build`).

---

### Task 1: Sidebar Active State Prominence & Focus Rings (ENH14 & ENH13)

**Files:**
- Modify: `neuropath-frontend/src/components/layout/Sidebar.jsx`
- Modify: `neuropath-frontend/src/App.css:190-305`
- Test: `neuropath-frontend/src/components/layout/Sidebar.test.jsx`

**Interfaces:**
- `Sidebar`: Nav buttons communicate active page via `aria-current="page"`.
- CSS classes: `.sidebar-nav-item.active`, `.sidebar-subnav-item.active` render high-contrast active indicators with left accent bar and visible focus rings.

- [ ] **Step 1: Write failing tests in `Sidebar.test.jsx`**
  - Add test asserting that the active top-level nav item (when having no subnav children) has `aria-current="page"`.
  - Add test asserting that when on a sub-route (e.g. `/dashboard/students`), the active subnav item has `aria-current="page"`.
  - Add test asserting that inactive items do not have `aria-current="page"`.
  - Run `npm test -- src/components/layout/Sidebar.test.jsx` and verify failure.

- [ ] **Step 2: Update `Sidebar.jsx` with `aria-current` attributes**
  - For top-level item button:
    ```jsx
    aria-current={item.children.length === 0 && active ? "page" : undefined}
    ```
  - For subnav item button:
    ```jsx
    aria-current={isChildActive ? "page" : undefined}
    ```
  - Ensure all nav buttons retain accessible label/title attributes and chevron indicators.

- [ ] **Step 3: Update `App.css` active styling and focus rings for Sidebar**
  - Upgrade `.sidebar-nav-item.active`:
    ```css
    .sidebar-nav-item.active {
      background: #ffffff;
      color: #0369a1;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-left: 4px solid #0284c7;
    }
    ```
  - Upgrade `.sidebar-subnav-item.active`:
    ```css
    .sidebar-subnav-item.active {
      background: rgba(255, 255, 255, 0.95);
      color: #0369a1;
      font-weight: 700;
      border-left: 3px solid #0284c7;
    }
    .sidebar-subnav-item.active .subnav-bullet {
      background: #0284c7;
    }
    ```
  - Add `:focus-visible` styling for `.sidebar-nav-item`, `.sidebar-subnav-item`, and `.sidebar-logout-btn`:
    ```css
    .sidebar-nav-item:focus-visible,
    .sidebar-subnav-item:focus-visible,
    .sidebar-logout-btn:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 2px;
    }
    ```

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/components/layout/Sidebar.test.jsx`.
  - Ensure all Sidebar tests pass.

- [ ] **Step 5: Commit changes**
  - `git commit -m "feat(sidebar): add aria-current and prominent active styling with focus rings (ENH14, ENH13)"`

---

### Task 2: WCAG 2.1 AA Color Contrast Audit & Focus Ring Restoration (ENH11 & ENH13)

**Files:**
- Modify: `neuropath-frontend/src/styles/OutcomeMonitoring.css`
- Modify: `neuropath-frontend/src/styles/ViewStudentProfile.css`
- Modify: `neuropath-frontend/src/styles/ViewSelectedStudentProfile.css`
- Modify: `neuropath-frontend/src/styles/UpdateStudentProfile.css`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/test/a11y.test.jsx`

**Interfaces:**
- Color tokens: Replace `#38bdf8`, `#82c7ff`, `#5aabf0`, `#5a9dbf` with `#0284c7` / `#0369a1` / `#0f172a` ensuring contrast ratios $\ge 4.5:1$.
- Focus indicators: Replace destructive `outline: none !important` with accessible `:focus-visible` rings.

- [ ] **Step 1: Write failing contrast and focus tests in `a11y.test.jsx`**
  - Add test asserting that interactive buttons and search inputs have visible focus-visible styles.
  - Run `npm test -- src/test/a11y.test.jsx` to verify existing suites.

- [ ] **Step 2: Update `OutcomeMonitoring.css`**
  - Remove all `outline: none !important` declarations on `.om-search-input:focus`, `.om-filter-select:focus`, and `.rpm-input:focus, .rpm-select:focus, .rpm-textarea:focus`.
  - Replace with:
    ```css
    :focus-visible {
      outline: 2px solid #0284c7 !important;
      outline-offset: 2px !important;
    }
    ```
  - Fix low contrast text:
    - `.om-field-label`: change `color: #5aabf0;` to `color: #0369a1;`.
    - `.om-goal-area`: change `color: #3d9de8;` to `color: #0369a1;` and background to `rgba(2, 132, 199, 0.12);`.
    - `.om-filter-label`: change `color: #1e6fbf;` to `color: #0369a1;`.
    - `.om-student-row:hover`: change `border-color: #93c5fd;` to `border-color: #0284c7;`.

- [ ] **Step 3: Update `ViewStudentProfile.css` & `ViewSelectedStudentProfile.css`**
  - In `ViewStudentProfile.css`:
    - Remove `outline: none;` on `.vsp-search` and add `:focus-visible` with `outline: 2px solid #0284c7; outline-offset: 2px;`.
    - Darken `.vsp-card-meta`: change `#5a9dbf` to `#0369a1`.
    - Darken `.vsp-id-label`: change `#82c7ff` to `#0284c7`.
    - Darken `.vsp-empty-sub`: change `#82c7ff` to `#475569`.
    - Darken `.vsp-empty-text`: change `#4a7a94` to `#0f172a`.
    - Darken `.vsp-empty-btn-secondary`: change `#3d9de8` to `#0284c7`.
    - Darken `.vsp-search::placeholder`: change `#aac8d8` to `#64748b`.
  - In `ViewSelectedStudentProfile.css`:
    - Add `.tab-btn:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }`.
    - Add `.btn:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }`.

- [ ] **Step 4: Update `App.css` and `UpdateStudentProfile.css`**
  - In `App.css`:
    - On `.form-input:focus, .form-select:focus, .form-textarea:focus`: change `border-color: #38bdf8;` to `border-color: #0284c7;` and `box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);`.
    - Ensure `.form-input:focus-visible, .form-select:focus-visible, .form-textarea:focus-visible` have `outline: 2px solid #0284c7; outline-offset: 1px;`.
  - In `UpdateStudentProfile.css`:
    - On `.form-input:focus, .form-select:focus, .form-textarea:focus`: change `border-color: #38bdf8;` to `border-color: #0284c7;` and `box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);`.

- [ ] **Step 5: Run tests and verify**
  - Run `npm test -- src/test/a11y.test.jsx`.
  - Verify all accessibility tests pass.

- [ ] **Step 6: Commit changes**
  - `git commit -m "feat(a11y): elevate text contrast to WCAG 2.1 AA and restore visible focus rings (ENH11, ENH13)"`

---

### Task 3: Mobile & Tablet Responsive Layout Polish (ENH12)

**Files:**
- Modify: `neuropath-frontend/src/styles/OutcomeMonitoring.css`
- Modify: `neuropath-frontend/src/styles/ViewStudentRecords.css`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/pages/ViewProgressDashboard.test.jsx`
- Test: `neuropath-frontend/src/pages/ViewStudentRecords.test.jsx`

**Interfaces:**
- Responsive breakpoints (`@media (max-width: 768px)`, `@media (max-width: 640px)`).
- Touch target sizes ($\ge 44 \times 44\text{ px}$).
- Horizontal scroll containers for Section B and tracking tables.

- [ ] **Step 1: Write responsive layout tests**
  - In `ViewProgressDashboard.test.jsx` and `ViewStudentRecords.test.jsx`, verify elements render with responsive classes and container wrappers.
  - Run tests to check baseline.

- [ ] **Step 2: Add responsive media queries to `OutcomeMonitoring.css`**
  - Add mobile & tablet layout rules:
    ```css
    @media (max-width: 768px) {
      .om-card {
        padding: 20px 16px;
      }
      .om-header {
        padding: 16px 20px;
      }
      .om-profile-grid {
        grid-template-columns: 1fr;
      }
      .om-search-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .om-search-input {
        min-width: 100%;
      }
      .om-filters {
        flex-wrap: wrap;
      }
      .om-record-actions {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      .om-export-btn {
        width: 100%;
        text-align: center;
      }
    }

    @media (max-width: 640px) {
      .om-student-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .va-select-btn {
        width: 100%;
        text-align: center;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }
    ```
  - Ensure interactive buttons meet minimum touch target size of 44px:
    ```css
    .va-select-btn,
    .om-filter-select,
    .rpm-btn-submit,
    .rpm-btn-cancel {
      min-height: 44px;
    }
    ```

- [ ] **Step 3: Update `ViewStudentRecords.css` and `App.css`**
  - In `ViewStudentRecords.css`:
    ```css
    .vsr-table {
      min-width: 640px;
    }
    .vsr-table-scroll {
      -webkit-overflow-scrolling: touch;
    }
    ```
  - In `App.css`:
    - Ensure `.iep-table-wrap` has `-webkit-overflow-scrolling: touch;`.

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/pages/ViewProgressDashboard.test.jsx src/pages/ViewStudentRecords.test.jsx`.

- [ ] **Step 5: Commit changes**
  - `git commit -m "feat(responsive): add mobile/tablet layouts, table scroll, and 44px touch targets (ENH12)"`

---

### Task 4: Standardized Calendar Date Pickers Across All Date Fields (ENH15)

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Test: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`
- Test: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`

**Interfaces:**
- Date fields: `Birthdate` converted to `type="date"` with consistent layout, validation, and format hints.
- Backwards-compatible validator: Accepts standard ISO `YYYY-MM-DD` and parses `MM-DD-YYYY` without breaking existing records.

- [ ] **Step 1: Write failing tests in `CreateStudentProfile.test.jsx` and `UpdateStudentProfile.test.jsx`**
  - Add test in `CreateStudentProfile.test.jsx` checking that the Birthdate field has `type="date"`.
  - Add test validating that selecting a past date succeeds, while future birthdate shows error "Birthdate must be a date in the past."
  - Add test in `UpdateStudentProfile.test.jsx` checking that Birthdate has `type="date"`.
  - Run tests and verify failure.

- [ ] **Step 2: Update `CreateStudentProfile.jsx`**
  - Update `Birthdate` field to `type="date"`:
    ```jsx
    <FormField
      label="Birthdate"
      type="date"
      value={form.birthdate}
      onChange={setField("birthdate")}
    />
    ```
  - Standardize birthdate validation:
    ```javascript
    if (form.birthdate && form.birthdate.trim()) {
      let birthDateObj;
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      const legacyRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/;
      const trimmed = form.birthdate.trim();

      if (isoRegex.test(trimmed)) {
        const [year, month, day] = trimmed.split("-").map(Number);
        birthDateObj = new Date(year, month - 1, day);
      } else if (legacyRegex.test(trimmed)) {
        const [month, day, year] = trimmed.split("-").map(Number);
        birthDateObj = new Date(year, month - 1, day);
      } else {
        setError("Birthdate must be a valid date (YYYY-MM-DD).");
        return false;
      }

      if (isNaN(birthDateObj.getTime())) {
        setError("Birthdate is not a valid calendar date.");
        return false;
      }

      if (birthDateObj >= new Date()) {
        setError("Birthdate must be a date in the past.");
        return false;
      }
    }
    ```

- [ ] **Step 3: Update `UpdateStudentProfile.jsx`**
  - Update `Birthdate` field to `type="date"`.
  - Add corresponding birthdate validation in `validateStepOne()`.

- [ ] **Step 4: Run tests and verify**
  - Run `npm test -- src/pages/CreateStudentProfile.test.jsx src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`.
  - Ensure all tests pass.

- [ ] **Step 5: Commit changes**
  - `git commit -m "feat(forms): standardize birthdate fields to calendar date pickers with validation (ENH15)"`

---

### Task 5: End-to-End Verification & Quality Gates

**Files:**
- Verify all modified files across codebase.

- [ ] **Step 1: Run ESLint**
  - Run `npm run lint` in `neuropath-frontend`.
  - Verify 0 errors and 0 warnings.

- [ ] **Step 2: Run Full Unit Test Suite**
  - Run `npm test -- --run` in `neuropath-frontend`.
  - Verify 100% test pass rate across all suites.

- [ ] **Step 3: Run Production Build**
  - Run `npm run build` in `neuropath-frontend`.
  - Verify clean Vite build output.

- [ ] **Step 4: Push Branch & Open Pull Request**
  - Push `feat/issue-199-a11y-responsive-polish` to `origin`.
  - Open PR linking `Closes #199` using `.github/pull_request_template.md` format.
