# WCAG 2.1 AA Accessibility, Semantic HTML Landmarks, and Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce WCAG 2.1 Level AA accessibility across the NeuroPath frontend by introducing semantic landmarks, keyboard navigation, focus-trapped modals, explicit form labels, WCAG AA color contrast, visible focus rings, and automated axe-core test suites.

**Architecture:** Build a reusable `useFocusTrap` hook and `<SkipLink>` layout component; upgrade `<Modal>` and existing dialogs to strictly trap and restore keyboard focus; refactor dashboard layout to use semantic `<header>`, `<nav>`, `<aside>`, and `<main>` landmarks; systematically link all form inputs with `<label htmlFor="id">`; enforce global `:focus-visible` rings; and automate a11y compliance with `axe-core`.

**Tech Stack:** React 19, Tailwind CSS 4, React Router 7, Vitest 4, `@testing-library/react`, `axe-core`.

## Global Constraints

- Scope is strictly limited to `neuropath-frontend` (zero backend/API changes).
- Zero critical accessibility violations reported by automated audit tools (`axe-core`).
- Entire dashboard must be navigable using `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`.
- All 162+ existing frontend unit tests must continue to pass (`npm test`).
- Production Vite build must succeed (`npm run build`).

---

### Task 1: Focus Trapping Hook & A11y Test Helper

**Files:**
- Create: `neuropath-frontend/src/hooks/useFocusTrap.js`
- Create: `neuropath-frontend/src/hooks/useFocusTrap.test.jsx`
- Create: `neuropath-frontend/src/test/a11y-helper.js`
- Modify: `neuropath-frontend/package.json`

**Interfaces:**
- Produces: `useFocusTrap({ isActive, containerRef, onEscape, returnFocus })`
- Produces: `runAxeAudit(container, options)` test utility

- [ ] **Step 1: Install `axe-core` as devDependency**

Run: `npm install -D axe-core` in `neuropath-frontend`
Expected: `axe-core` installed and added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create axe-core test helper**

Create `neuropath-frontend/src/test/a11y-helper.js`:
```javascript
import axe from "axe-core";

/**
 * Runs an accessibility audit on a rendered DOM container.
 * @param {HTMLElement} container - The DOM node to audit.
 * @param {object} options - Optional axe configuration overrides.
 * @returns {Promise<axe.AxeResults>}
 */
export async function runAxeAudit(container, options = {}) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    },
    ...options,
  });
  return results;
}
```

- [ ] **Step 3: Write the failing test for `useFocusTrap`**

Create `neuropath-frontend/src/hooks/useFocusTrap.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

function TrapComponent({ onEscape, returnFocus = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useFocusTrap({
    isActive: isOpen,
    containerRef,
    onEscape: () => {
      onEscape?.();
      setIsOpen(false);
    },
    returnFocus,
  });

  return (
    <div>
      <button
        type="button"
        id="trigger-btn"
        onClick={() => setIsOpen(true)}
      >
        Open Dialog
      </button>

      {isOpen && (
        <div ref={containerRef} tabIndex={-1} data-testid="dialog-container">
          <button type="button" id="first-btn">
            First
          </button>
          <input type="text" id="middle-input" placeholder="Middle" />
          <button type="button" id="last-btn">
            Last
          </button>
        </div>
      )}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("focuses the first focusable element when opened", async () => {
    const user = userEvent.setup();
    render(<TrapComponent />);

    const trigger = screen.getByRole("button", { name: "Open Dialog" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("traps focus inside the container on Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<TrapComponent />);

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    const firstBtn = screen.getByRole("button", { name: "First" });
    const middleInput = screen.getByPlaceholderText("Middle");
    const lastBtn = screen.getByRole("button", { name: "Last" });

    expect(firstBtn).toHaveFocus();

    await user.tab();
    expect(middleInput).toHaveFocus();

    await user.tab();
    expect(lastBtn).toHaveFocus();

    // Tab on last element should wrap around to first
    await user.tab();
    expect(firstBtn).toHaveFocus();

    // Shift+Tab on first element should wrap backwards to last
    await user.tab({ shift: true });
    expect(lastBtn).toHaveFocus();
  });

  it("calls onEscape when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleEscape = vi.fn();
    render(<TrapComponent onEscape={handleEscape} />);

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    expect(screen.getByTestId("dialog-container")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it("restores focus to trigger element when unmounted/closed", async () => {
    const user = userEvent.setup();
    render(<TrapComponent />);

    const trigger = screen.getByRole("button", { name: "Open Dialog" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/hooks/useFocusTrap.test.jsx`
Expected: FAIL with "Cannot find module './useFocusTrap'".

- [ ] **Step 5: Implement `useFocusTrap`**

Create `neuropath-frontend/src/hooks/useFocusTrap.js`:
```javascript
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Hook to trap focus inside a container, listen for Escape key, and restore focus on close.
 *
 * @param {object} options
 * @param {boolean} options.isActive - Whether the trap is currently active (e.g. modal is open)
 * @param {import("react").RefObject<HTMLElement>} options.containerRef - Ref pointing to the trap container element
 * @param {() => void} [options.onEscape] - Callback triggered when user hits Escape
 * @param {boolean} [options.returnFocus=true] - Whether to restore focus to previous active element upon deactivation
 */
export function useFocusTrap({
  isActive = false,
  containerRef,
  onEscape,
  returnFocus = true,
}) {
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Capture currently focused element to return focus later
    triggerElementRef.current = document.activeElement;

    const container = containerRef?.current;
    if (!container) return;

    // Initial focus: first focusable element or container
    const focusables = Array.from(
      container.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onEscape) {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const currentFocusables = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = currentFocusables[0];
      const lastElement = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, cycle back to last
        if (
          document.activeElement === firstElement ||
          document.activeElement === container
        ) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, cycle forward to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (returnFocus && triggerElementRef.current && typeof triggerElementRef.current.focus === "function") {
        triggerElementRef.current.focus();
      }
    };
  }, [isActive, containerRef, onEscape, returnFocus]);
}

export default useFocusTrap;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/hooks/useFocusTrap.test.jsx`
Expected: PASS (4 tests passed).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/hooks/useFocusTrap.js src/hooks/useFocusTrap.test.jsx src/test/a11y-helper.js
git commit -m "feat(a11y): implement useFocusTrap hook and axe test helper (#113)"
```

---

### Task 2: Accessible Modal Primitive & Dialog Refactors

**Files:**
- Modify: `neuropath-frontend/src/components/ui/Modal.jsx`
- Modify: `neuropath-frontend/src/components/ui/__tests__/Modal.test.jsx`
- Modify: `neuropath-frontend/src/components/TeacherTutorialModal.jsx`
- Modify: `neuropath-frontend/src/components/TeacherTutorialModal.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`

**Interfaces:**
- Consumes: `useFocusTrap` from `src/hooks/useFocusTrap.js`
- Produces: `<Modal>` with built-in focus trap, ARIA dialog attributes, and focus restoration

- [ ] **Step 1: Update Modal unit tests for focus trap & Escape handling**

Update `neuropath-frontend/src/components/ui/__tests__/Modal.test.jsx`:
```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../Modal";
import { Button } from "../Button";

describe("Modal Primitive A11y", () => {
  it("renders with role='dialog', aria-modal='true', and aria-labelledby", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-dialog-title");
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("traps focus and closes on Escape key", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <div>
        <button type="button" id="open-btn">Open</button>
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Accessible Dialog"
          footer={
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary">Confirm</Button>
            </>
          }
        >
          <p>Dialog body text</p>
        </Modal>
      </div>
    );

    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });

    // Focus starts on close button (first focusable element)
    expect(closeBtn).toHaveFocus();

    await user.tab();
    expect(cancelBtn).toHaveFocus();

    await user.tab();
    expect(confirmBtn).toHaveFocus();

    // Tab wraps to closeBtn
    await user.tab();
    expect(closeBtn).toHaveFocus();

    // Escape triggers onClose
    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Upgrade `Modal.jsx` using `useFocusTrap`**

Modify `neuropath-frontend/src/components/ui/Modal.jsx`:
```jsx
import { useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = "",
  ...props
}) {
  const modalContainerRef = useRef(null);

  useFocusTrap({
    isActive: isOpen,
    containerRef: modalContainerRef,
    onEscape: closeOnEsc ? onClose : undefined,
    returnFocus: true,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-dialog-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
      onClick={handleBackdropClick}
      {...props}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl border border-slate-100 w-full ${maxWidthClass} overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-scaleUp outline-none ${className}`.trim()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            {title && (
              <h3 id="modal-dialog-title" className="text-lg font-semibold text-slate-900 m-0">
                {title}
              </h3>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto text-slate-700 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
```

- [ ] **Step 3: Upgrade `TeacherTutorialModal.jsx` with `useFocusTrap`**

Modify `neuropath-frontend/src/components/TeacherTutorialModal.jsx`:
- Import `useFocusTrap` from `../hooks/useFocusTrap`.
- Create a `containerRef = useRef(null)`.
- Call `useFocusTrap({ isActive: true, containerRef, onEscape: onComplete })`.
- Attach `ref={containerRef}` and `tabIndex={-1}` to `.tutorial-modal-container`.

- [ ] **Step 4: Refactor `UpdateStudentProfile.jsx` `SuccessModal` to use `<Modal>` and `<Button>`**

In `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`:
- Import `{ Modal, Button }` from `../../components/ui`.
- Replace `SuccessModal` function with:
```jsx
function SuccessModal({ studentName, onClose }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Profile Updated!"
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose} className="w-full">
          Done
        </Button>
      }
    >
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold mx-auto mb-3">
          ✓
        </div>
        <p className="text-slate-600 text-sm">
          <strong>{studentName}</strong>'s profile has been saved successfully.
        </p>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Run modal tests to verify all pass**

Run: `npx vitest run src/components/ui/__tests__/Modal.test.jsx src/components/TeacherTutorialModal.test.jsx src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Modal.jsx src/components/ui/__tests__/Modal.test.jsx src/components/TeacherTutorialModal.jsx src/pages/StudentProfiling/UpdateStudentProfile.jsx
git commit -m "feat(a11y): add focus trapping and keyboard dialog handling to modals (#113)"
```

---

### Task 3: Semantic Layout Landmarks, Skip Link, Topbar & Sidebar

**Files:**
- Create: `neuropath-frontend/src/components/layout/SkipLink.jsx`
- Modify: `neuropath-frontend/src/App.jsx`
- Modify: `neuropath-frontend/src/components/layout/Topbar.jsx`
- Modify: `neuropath-frontend/src/components/layout/Sidebar.jsx`
- Modify: `neuropath-frontend/src/components/layout/Sidebar.test.jsx`

**Interfaces:**
- Produces: `<SkipLink targetId="main-content" />`
- Produces: Semantic landmarks: `<header role="banner">`, `<aside aria-label="Sidebar">`, `<nav aria-label="Main Navigation">`, `<main id="main-content">`

- [ ] **Step 1: Create `SkipLink.jsx`**

Create `neuropath-frontend/src/components/layout/SkipLink.jsx`:
```jsx
export default function SkipLink({ targetId = "main-content", children = "Skip to main content" }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:font-semibold focus:text-sm focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all"
    >
      {children}
    </a>
  );
}
```

- [ ] **Step 2: Update `App.jsx` with SkipLink and `<main id="main-content">`**

In `neuropath-frontend/src/App.jsx`:
- Import `SkipLink` from `./components/layout/SkipLink`.
- In `DashboardLayout()`:
```jsx
function DashboardLayout() {
  const { user, markTutorialComplete } = useAuth();
  const location = useLocation();
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

  const breadcrumb = useMemo(() => getBreadcrumb(location.pathname), [location.pathname]);
  const showTutorial = user && user.has_completed_tutorial === false;

  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <SkipLink targetId="main-content" />
      {showTutorial && (
        <TeacherTutorialModal onComplete={markTutorialComplete} />
      )}
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="main-area">
        <Topbar
          breadcrumb={breadcrumb}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content focus:outline-none"
          aria-label="Main content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `Topbar.jsx` with `<header>` and accessible profile button**

In `neuropath-frontend/src/components/layout/Topbar.jsx`:
```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teacherName = `Teacher ${user?.first_name || ""}`;
  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();

  const handleProfileClick = () => {
    navigate("/dashboard/profile");
    if (setActivePage) setActivePage("my-profile");
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-user">
        <button
          type="button"
          className="topbar-pill"
          onClick={handleProfileClick}
          aria-label={`View user profile for ${teacherName}`}
        >
          <div className="topbar-pill-avatar" aria-hidden="true">{initials || "👤"}</div>
          <span className="topbar-pill-name">{teacherName}</span>
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update `Sidebar.jsx` with semantic `<aside>`, `<nav aria-label="Main Navigation">`, and accessible collapsible controls**

In `neuropath-frontend/src/components/layout/Sidebar.jsx`:
- Ensure `<aside className="sidebar..." aria-label="Sidebar">`.
- Change `.sidebar-header` to a `<button type="button" className="sidebar-header sidebar-header-btn" onClick={handleToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>`.
- Add `<nav className="sidebar-nav" aria-label="Main Navigation">`.
- For each group button, add `aria-expanded={item.children.length > 0 ? isCategoryExpanded : undefined}` and `aria-controls={item.children.length > 0 ? `subnav-${item.key}` : undefined}`.
- For each subnav, add `id={`subnav-${item.key}`}` and `role="region" aria-label={`${item.label} sub-navigation`}`.
- Keep `sidebar-empty-space` accessible with `role="button"` and `tabIndex={0}` or remove non-button click events.

- [ ] **Step 5: Run Sidebar and App tests to verify pass**

Run: `npx vitest run src/components/layout/Sidebar.test.jsx src/App.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/SkipLink.jsx src/App.jsx src/components/layout/Topbar.jsx src/components/layout/Sidebar.jsx src/components/layout/Sidebar.test.jsx
git commit -m "feat(a11y): add SkipLink and semantic page landmarks for Topbar and Sidebar (#113)"
```

---

### Task 4: Form Input Labels, IDs & Search Accessibility

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/ViewProgressDashboard.jsx`
- Modify: `neuropath-frontend/src/pages/ViewStudentRecords.jsx`
- Modify: `neuropath-frontend/src/pages/UserProfilePage.jsx`
- Modify: `neuropath-frontend/src/pages/loginPage.jsx`
- Modify: `neuropath-frontend/src/pages/registerPage.jsx`

**Interfaces:**
- Ensures all inputs have linked `<label htmlFor="id">` or `aria-label`.

- [ ] **Step 1: Update form fields in `UpdateStudentProfile.jsx` to bind `htmlFor` and `id`**

In `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`:
```jsx
function FormField({ label, placeholder, value, onChange, type = "text" }) {
  const inputId = label
    ? `usp-field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">{label}:</label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-input gray-input"
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  const selectId = label
    ? `usp-select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={selectId} className="form-label">{label}:</label>
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className="form-select gray-input"
      >
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  helpText,
}) {
  const areaId = label
    ? `usp-area-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={areaId} className="form-label">{label}</label>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        id={areaId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-textarea gray-input"
      />
    </div>
  );
}
```

- [ ] **Step 2: Add `aria-label="Search by student name"` to search inputs**

In `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`, `ViewProgressDashboard.jsx`, and `ViewStudentRecords.jsx`:
Add `aria-label="Search by student name"` and `id="search-students-input"` to the search `<input>`.

- [ ] **Step 3: Update `UserProfilePage.jsx` form inputs with explicit `htmlFor` / `id`**

In `neuropath-frontend/src/pages/UserProfilePage.jsx`:
Ensure each input (`firstName`, `lastName`, `email`, `currentPassword`, `newPassword`, `confirmPassword`) has an `id` matching its `<label htmlFor="...">`.

- [ ] **Step 4: Update `loginPage.jsx` and `registerPage.jsx` password toggle buttons**

In `loginPage.jsx` and `registerPage.jsx`:
Ensure the password toggle button has `aria-label={showPass ? "Hide password" : "Show password"}`.

- [ ] **Step 5: Run form and auth tests to verify pass**

Run: `npx vitest run src/pages/loginPage.test.jsx src/pages/CreateStudentProfile.test.jsx src/pages/StudentProfiling/ViewStudentProfile.test.jsx src/pages/StudentProfiling/UpdateStudentProfile.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentProfiling/UpdateStudentProfile.jsx src/pages/StudentProfiling/ViewStudentProfile.jsx src/pages/ViewProgressDashboard.jsx src/pages/ViewStudentRecords.jsx src/pages/UserProfilePage.jsx src/pages/loginPage.jsx src/pages/registerPage.jsx
git commit -m "feat(a11y): associate explicit labels, ids, and aria-labels on all forms (#113)"
```

---

### Task 5: Focus Rings, Button Semantics & WCAG AA Color Contrast

**Files:**
- Modify: `neuropath-frontend/src/index.css`
- Modify: `neuropath-frontend/src/App.css`
- Modify: `neuropath-frontend/src/components/ui/Button.jsx`
- Modify: `neuropath-frontend/src/components/ui/__tests__/Button.test.jsx`

**Interfaces:**
- Produces: Global `:focus-visible` ring rules and WCAG AA 4.5:1 color contrast.

- [ ] **Step 1: Write test in `Button.test.jsx` for focus-visible ring styles**

Update `neuropath-frontend/src/components/ui/__tests__/Button.test.jsx`:
Verify that `Button` includes `focus-visible:ring-2` and `focus-visible:outline-none`.

- [ ] **Step 2: Add global focus-visible and contrast styles to `index.css` & `App.css`**

In `neuropath-frontend/src/index.css`:
```css
@import "tailwindcss";

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
}

#root {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

/* ── Global Accessible Focus Rings (WCAG 2.1 AA) ── */
:focus-visible {
  outline: 2px solid #0284c7;
  outline-offset: 2px;
}

/* Visually Hidden Utility for Screen Readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

In `neuropath-frontend/src/App.css`:
Update low-contrast color values:
- Change `.topbar-breadcrumb` / secondary text colors from `#5a9dbf` (3.1:1) to `#1e78a6` (4.8:1).
- Add `:focus-visible` styles to `.btn`, `.sidebar-nav-item`, and `.form-input`.

- [ ] **Step 3: Run Button and UI test suite**

Run: `npx vitest run src/components/ui/__tests__/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/App.css src/components/ui/Button.jsx src/components/ui/__tests__/Button.test.jsx
git commit -m "feat(a11y): add global focus-visible styles and enforce WCAG AA color contrast (#113)"
```

---

### Task 6: Automated Axe Accessibility Test Suite & Full Verification

**Files:**
- Create: `neuropath-frontend/src/test/a11y.test.jsx`

**Interfaces:**
- Runs automated `axe-core` tests on the Dashboard layout, Modal dialogs, Button variants, Topbar, Sidebar, and Forms.

- [ ] **Step 1: Create `src/test/a11y.test.jsx`**

Create `neuropath-frontend/src/test/a11y.test.jsx`:
```jsx
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { runAxeAudit } from "./a11y-helper";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Topbar from "../components/layout/Topbar";
import Sidebar from "../components/layout/Sidebar";
import SkipLink from "../components/layout/SkipLink";
import { AuthProvider } from "../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Automated WCAG 2.1 AA Accessibility Audit (axe-core)", () => {
  it("Button primitives have zero axe violations", async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
      </div>
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("SkipLink component has zero axe violations", async () => {
    const { container } = render(<SkipLink targetId="main-content" />);
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Topbar header landmark has zero axe violations", async () => {
    const { container } = renderWithProviders(
      <Topbar breadcrumb="DASHBOARD / Home" />
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Sidebar navigation landmark has zero axe violations", async () => {
    const { container } = renderWithProviders(<Sidebar collapsed={false} />);
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Modal dialog has zero axe violations", async () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Student Details Dialog"
        footer={<Button onClick={() => {}}>Close</Button>}
      >
        <p>Accessible modal dialog content.</p>
      </Modal>
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the automated accessibility test suite**

Run: `npx vitest run src/test/a11y.test.jsx`
Expected: PASS with 0 violations across all audited components.

- [ ] **Step 3: Run the full test suite and production build**

Run: `npm test` in `neuropath-frontend`
Expected: All 26+ test files and 165+ tests pass.

Run: `npm run build` in `neuropath-frontend`
Expected: Build succeeds with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/test/a11y.test.jsx
git commit -m "test(a11y): add automated axe-core accessibility test suite (#113)"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-fe-a11y-wcag-landmarks-and-keyboard-navigation.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
