# WCAG 2.1 AA Accessibility, Semantic HTML Landmarks, and Keyboard Navigation Design Specification

**Issue Reference:** #113 — `[FE] [A11Y]: enforce WCAG 2.1 AA accessibility, semantic HTML landmarks, and keyboard navigation`  
**Date:** 2026-09-10  
**Scope:** `neuropath-frontend` (Zero backend changes)

---

## 1. Overview & Goals

NeuroPath is an assistive educational platform built specifically for Special Education (SPED) teachers. To ensure compliance with modern educational accessibility standards (**WCAG 2.1 Level AA / Section 508**), this specification outlines the architectural design to:
1. Establish semantic page landmarks (`<header>`, `<nav>`, `<aside>`, `<main>`) and a keyboard "Skip to main content" link.
2. Eliminate non-semantic interactive `<div>` and `<span>` click handlers, replacing them with native `<button type="button">` elements or proper ARIA button patterns with keyboard event handlers (`Enter`, `Space`).
3. Ensure 100% of form inputs, selects, textareas, and search boxes across the app have explicit `<label htmlFor="id">` associations or descriptive `aria-label` attributes.
4. Implement accessible modal behaviors with focus trapping, `Escape` key dismissal, and focus restoration to the trigger element upon closing.
5. Guarantee WCAG 2.1 AA compliant color contrast ratios (minimum 4.5:1 for standard text) and highly visible `:focus-visible` focus rings for keyboard navigation.
6. Implement automated accessibility testing using `axe-core` within the Vitest test suite.

---

## 2. Architectural Design

### 2.1 Focus Trapping Hook (`src/hooks/useFocusTrap.js`)
To provide consistent, accessible modal behavior across all current and future dialogs without duplicate code:
- **Signature:** `useFocusTrap({ isActive, containerRef, onEscape, returnFocus = true })`
- **Behavior:**
  - When `isActive` transitions to `true`:
    1. Stores `document.activeElement` in a ref (`triggerElementRef`).
    2. Queries all focusable elements inside `containerRef` (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`).
    3. Focuses the first focusable element (or the container if `tabIndex={-1}`).
  - While active, intercepts `Tab` and `Shift+Tab` keydown events:
    - If `Tab` is pressed on the last focusable element, wraps focus around to the first focusable element.
    - If `Shift+Tab` is pressed on the first focusable element, wraps focus backwards to the last focusable element.
  - Intercepts `Escape` keydown and triggers `onEscape()`.
  - When `isActive` becomes `false` or on unmount, automatically restores focus to `triggerElementRef.current`.

### 2.2 Skip Navigation Link (`src/components/layout/SkipLink.jsx`)
- **Semantic Tag:** `<a href="#main-content">Skip to main content</a>`
- **Styling:** Visually hidden offscreen (`sr-only`), but slides into view at the top of the viewport when focused via keyboard (`focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400`).
- **Placement:** Placed at the very beginning of the dashboard layout in `App.jsx`.

### 2.3 Semantic Page Landmarks & Navigation (`App.jsx`, `Sidebar.jsx`, `Topbar.jsx`)

1. **`App.jsx` (`DashboardLayout`):**
   - Render `<SkipLink />` as the first child.
   - Wrap `<Outlet />` inside `<main id="main-content" tabIndex={-1} className="main-content focus:outline-none" aria-label="Main content">`.
2. **`Topbar.jsx`:**
   - Uses `<header className="topbar" role="banner">`.
   - Refactor `.topbar-pill` from `<div onClick={handleProfileClick}>` into `<button type="button" className="topbar-pill" onClick={handleProfileClick} aria-label={`View profile for ${teacherName}`}>`.
3. **`Sidebar.jsx`:**
   - Uses `<aside className="sidebar" aria-label="Sidebar">`.
   - Navigation links are wrapped inside `<nav className="sidebar-nav" aria-label="Main Navigation">`.
   - Replaces `.sidebar-header` `<div>` click handler with a semantic `<button type="button" className="sidebar-brand-btn" onClick={handleToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>`.
   - Collapsible navigation items have `aria-expanded={isCategoryExpanded}` and `aria-controls={`nav-group-${item.key}`}`.
   - Subnav containers have `id={`nav-group-${item.key}`}` and `role="region"`.
   - Remove outer `aside` `onClick` handler or replace with an explicit accessible button.

---

## 3. Modal Consolidation & Dialog Accessibility

1. **`<Modal>` Primitive (`src/components/ui/Modal.jsx`):**
   - Refactor to consume `useFocusTrap`.
   - Ensure proper ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-dialog-title"`.
   - Support `closeOnEsc` and focus restoration.
2. **`TeacherTutorialModal.jsx`:**
   - Integrate `useFocusTrap` on the tutorial container.
   - Add `aria-labelledby="tutorial-modal-title"` and keyboard support for previous/next/skip buttons.
3. **`LogoutModal.jsx`:**
   - Consumes the upgraded `<Modal>` primitive.
4. **`UpdateStudentProfile.jsx` (`SuccessModal`):**
   - Refactor custom `.usp-modal-overlay` / `.usp-modal` into the standard `<Modal>` primitive with `<Button>` for the action.

---

## 4. Form Accessibility & Explicit Label Associations

1. **`UpdateStudentProfile.jsx` & `CreateStudentProfile.jsx`:**
   - Ensure every `<FormField>`, `<SelectField>`, `<TextAreaField>`, and `<CheckOption>` generates unique `id` attributes linked to `<label htmlFor={id}>`.
2. **`UserProfilePage.jsx`:**
   - Add explicit `<label htmlFor="...">` to all password fields, notification checkboxes, and text inputs.
3. **`ViewStudentProfile.jsx`, `ViewProgressDashboard.jsx`, `ViewStudentRecords.jsx`:**
   - Ensure all search inputs have explicit `id` and `aria-label="Search students by name"`.
4. **`IepGenerationPage.jsx`:**
   - Ensure all dynamic rows, strategy checkboxes, assistive technology inputs, and manual goal fields have explicit `aria-label` or `<label htmlFor="...">` attributes.
5. **`loginPage.jsx` & `registerPage.jsx`:**
   - Verify all inputs have explicit `htmlFor` and accessible password toggle buttons with `aria-label="Show password"` / `aria-label="Hide password"`.

---

## 5. Visual Focus Rings & WCAG AA Color Contrast

1. **Focus Ring Styles (`src/index.css` & `src/App.css`):**
   - Add universal `:focus-visible` styling:
     ```css
     :focus-visible {
       outline: 2px solid #0284c7;
       outline-offset: 2px;
     }
     ```
   - Ensure all buttons, links, inputs, and interactive components have visible, distinct focus rings during keyboard navigation.
2. **Color Contrast Verification (WCAG AA 4.5:1):**
   - Audit low-contrast text colors across the app:
     - Subtitle text `#5a9dbf` on white (`#ffffff`) has a contrast ratio of ~3.1:1. Darken to `#1e78a6` (contrast ~4.8:1).
     - Muted badge / placeholder texts adjusted to meet 4.5:1 for normal text and 3.0:1 for large text / graphical objects.

---

## 6. Automated Testing & Verification

1. **Install `axe-core` / test utility in `neuropath-frontend`:**
   - Install `axe-core` as a devDependency.
   - Create accessibility test helper (`src/test/a11y-helper.js`) to run axe rules on rendered React containers.
2. **Accessibility Test Suites (`src/test/a11y.test.jsx` & primitive tests):**
   - Test layout landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, and `<SkipLink>`.
   - Test keyboard focus trap: `Tab` wraps around, `Shift+Tab` wraps back, `Escape` triggers close, focus restored to trigger.
   - Test form labeling: verify zero unlabeled inputs across major forms.
   - Run `axe.run()` across `Sidebar`, `Topbar`, `Modal`, `Button`, `Overview`, and `UpdateStudentProfile`.
3. **Regression Testing:**
   - Run `npm test` to ensure 100% of existing tests continue to pass.
   - Run `npm run build` to verify production Vite build.
