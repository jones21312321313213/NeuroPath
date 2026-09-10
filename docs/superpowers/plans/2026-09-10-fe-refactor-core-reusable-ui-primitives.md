# Core Reusable UI Primitives (Design System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cohesive, accessible suite of core UI primitives (`Button`, `Card`, `Badge`, `Callout`, `Modal`, `EmptyState`) in `neuropath-frontend/src/components/ui/` using semantic HTML5 and Tailwind CSS tokens, and refactor high-duplication areas to eliminate div soup and style collisions.

**Architecture:** Build standalone, reusable primitives with semantic markup, comprehensive props, keyboard focus rings, and clean class composition. Expose named and compound exports via `src/components/ui/index.js`. Refactor targeted components (`LogoutModal`, `UserProfilePage`, `Overview`, `StudentInsightsTab`) to consume the primitives seamlessly while preserving 100% test compatibility.

**Tech Stack:** React 19, Tailwind CSS v4, Vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event.

## Global Constraints

- Scope is strictly limited to `neuropath-frontend/` (No backend or API changes).
- No extra third-party UI dependencies (e.g. Radix/Headless UI); build native React primitives with Tailwind utility tokens.
- All interactive primitives must support keyboard navigation (`focus-visible` outline rings, `Enter`/`Space` activation, `Escape` key close on modals).
- Composite components (`Card`) must support both named exports (`CardHeader`) and dot-notation compound components (`Card.Header`).
- All existing test suites (131 tests across 17 test files) and new unit tests must pass (`npm test`) and `npm run build` must succeed without errors.

---

### Task 1: Button Primitive

**Files:**
- Create: `neuropath-frontend/src/components/ui/Button.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/Button.test.jsx`

**Interfaces:**
- Consumes: React standard button attributes
- Produces:
  ```jsx
  export function Button({
    variant = "primary", // "primary" | "secondary" | "outline" | "danger"
    size = "md",       // "sm" | "md" | "lg"
    disabled = false,
    type = "button",
    icon = null,
    className = "",
    children,
    ...props
  })
  export default Button;
  ```

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/Button.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button component", () => {
  it("renders with default props and children", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies variant classes properly", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-blue-600");

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-slate-100");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-slate-300");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("applies size classes properly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-xs");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-base");
  });

  it("handles clicks and respects disabled state", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Active</Button>);
    
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={handleClick} disabled>Disabled</Button>);
    const disabledBtn = screen.getByRole("button");
    expect(disabledBtn).toBeDisabled();
    await user.click(disabledBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders with an icon prefix", () => {
    render(<Button icon={<span data-testid="test-icon">⭐</span>}>With Icon</Button>);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/Button.test.jsx` (inside `neuropath-frontend`)  
Expected: FAIL with "Cannot find module '../Button'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/Button.jsx
import React from "react";

const variantClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus-visible:ring-blue-500",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 focus-visible:ring-slate-400 border border-slate-200",
  outline: "bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 focus-visible:ring-slate-400",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus-visible:ring-red-500",
};

const sizeClasses = {
  sm: "text-xs px-2.5 py-1.5 rounded-md gap-1.5",
  md: "text-sm px-4 py-2 rounded-lg gap-2",
  lg: "text-base px-5 py-2.5 rounded-xl gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  icon = null,
  className = "",
  children,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  const variantStyle = variantClasses[variant] || variantClasses.primary;
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantStyle} ${sizeStyle} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
}

export default Button;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/Button.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/Button.jsx neuropath-frontend/src/components/ui/__tests__/Button.test.jsx
git commit -m "feat(ui): add Button primitive with variants and accessibility"
```

---

### Task 2: Card Primitive (with Header, Body, Footer)

**Files:**
- Create: `neuropath-frontend/src/components/ui/Card.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/Card.test.jsx`

**Interfaces:**
- Consumes: React
- Produces:
  ```jsx
  export function Card({ as: Component = "section", className = "", children, ...props })
  export function CardHeader({ as: Component = "header", className = "", children, ...props })
  export function CardBody({ as: Component = "div", className = "", children, ...props })
  export function CardFooter({ as: Component = "footer", className = "", children, ...props })
  Card.Header = CardHeader;
  Card.Body = CardBody;
  Card.Footer = CardFooter;
  export default Card;
  ```

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/Card.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody, CardFooter } from "../Card";

describe("Card component suite", () => {
  it("renders full card structure using named exports and default semantic elements", () => {
    const { container } = render(
      <Card data-testid="card-root">
        <CardHeader data-testid="card-header">Header Title</CardHeader>
        <CardBody data-testid="card-body">Body Content</CardBody>
        <CardFooter data-testid="card-footer">Footer Content</CardFooter>
      </Card>
    );

    const card = screen.getByTestId("card-root");
    expect(card.tagName.toLowerCase()).toBe("section");
    expect(card).toHaveClass("bg-white", "rounded-xl", "border");

    const header = screen.getByTestId("card-header");
    expect(header.tagName.toLowerCase()).toBe("header");
    expect(header).toHaveTextContent("Header Title");

    const body = screen.getByTestId("card-body");
    expect(body).toHaveTextContent("Body Content");

    const footer = screen.getByTestId("card-footer");
    expect(footer.tagName.toLowerCase()).toBe("footer");
    expect(footer).toHaveTextContent("Footer Content");
  });

  it("supports compound dot-notation syntax", () => {
    render(
      <Card data-testid="compound-card">
        <Card.Header>Compound Header</Card.Header>
        <Card.Body>Compound Body</Card.Body>
        <Card.Footer>Compound Footer</Card.Footer>
      </Card>
    );

    expect(screen.getByText("Compound Header")).toBeInTheDocument();
    expect(screen.getByText("Compound Body")).toBeInTheDocument();
    expect(screen.getByText("Compound Footer")).toBeInTheDocument();
  });

  it("supports custom semantic html tags via 'as' prop", () => {
    render(
      <Card as="article" data-testid="article-card">
        <CardBody as="main">Article Body</CardBody>
      </Card>
    );

    const card = screen.getByTestId("article-card");
    expect(card.tagName.toLowerCase()).toBe("article");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/Card.test.jsx`  
Expected: FAIL with "Cannot find module '../Card'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/Card.jsx
import React from "react";

export function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs text-slate-800 transition-all ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ as: Component = "header", className = "", children, ...props }) {
  return (
    <Component
      className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardBody({ as: Component = "div", className = "", children, ...props }) {
  return (
    <Component className={`p-5 ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

export function CardFooter({ as: Component = "footer", className = "", children, ...props }) {
  return (
    <Component
      className={`px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-3 ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/Card.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/Card.jsx neuropath-frontend/src/components/ui/__tests__/Card.test.jsx
git commit -m "feat(ui): add Card primitive with header, body, footer and compound syntax"
```

---

### Task 3: Badge Primitive

**Files:**
- Create: `neuropath-frontend/src/components/ui/Badge.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/Badge.test.jsx`

**Interfaces:**
- Consumes: React
- Produces:
  ```jsx
  export function Badge({
    variant = "info", // "info" | "success" | "warning" | "purple" | "danger" | "neutral"
    size = "md",      // "sm" | "md"
    className = "",
    children,
    ...props
  })
  export default Badge;
  ```

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/Badge.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge component", () => {
  it("renders with default info variant", () => {
    render(<Badge>New Update</Badge>);
    const badge = screen.getByText("New Update");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-50", "text-blue-700");
  });

  it("renders different color variants", () => {
    const { rerender } = render(<Badge variant="success">Completed</Badge>);
    expect(screen.getByText("Completed")).toHaveClass("bg-emerald-50", "text-emerald-700");

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending")).toHaveClass("bg-amber-50", "text-amber-700");

    rerender(<Badge variant="purple">AI Generated</Badge>);
    expect(screen.getByText("AI Generated")).toHaveClass("bg-purple-50", "text-purple-700");

    rerender(<Badge variant="danger">High Support</Badge>);
    expect(screen.getByText("High Support")).toHaveClass("bg-red-50", "text-red-700");
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText("Small")).toHaveClass("text-[11px]");

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText("Medium")).toHaveClass("text-xs");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/Badge.test.jsx`  
Expected: FAIL with "Cannot find module '../Badge'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/Badge.jsx
import React from "react";

const variantClasses = {
  info: "bg-blue-50 text-blue-700 border-blue-200/60",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 border-amber-200/60",
  purple: "bg-purple-50 text-purple-700 border-purple-200/60",
  danger: "bg-red-50 text-red-700 border-red-200/60",
  neutral: "bg-slate-100 text-slate-700 border-slate-200/60",
};

const sizeClasses = {
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
};

export function Badge({
  variant = "info",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-full border select-none transition-colors";
  const variantStyle = variantClasses[variant] || variantClasses.info;
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`${baseClasses} ${variantStyle} ${sizeStyle} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/Badge.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/Badge.jsx neuropath-frontend/src/components/ui/__tests__/Badge.test.jsx
git commit -m "feat(ui): add Badge primitive with color variants and size options"
```

---

### Task 4: Callout Primitive (Replaces duplicate disclaimer boxes & alert banners)

**Files:**
- Create: `neuropath-frontend/src/components/ui/Callout.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/Callout.test.jsx`

**Interfaces:**
- Consumes: React
- Produces:
  ```jsx
  export function Callout({
    variant = "info", // "info" | "warning" | "error" | "success"
    icon,
    title,
    action,
    className = "",
    children,
    ...props
  })
  export default Callout;
  ```

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/Callout.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout } from "../Callout";

describe("Callout component", () => {
  it("renders with default info variant and children content", () => {
    render(<Callout>This is an informative notice.</Callout>);
    const alert = screen.getByRole("region");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("This is an informative notice.");
    expect(alert).toHaveClass("bg-blue-50/70", "border-blue-200");
  });

  it("renders title, custom icon, and action CTA", () => {
    render(
      <Callout
        title="Notice Title"
        icon={<span data-testid="custom-icon">ℹ️</span>}
        action={<button>Review</button>}
      >
        Detailed explanation text
      </Callout>
    );

    expect(screen.getByText("Notice Title")).toBeInTheDocument();
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByText("Detailed explanation text")).toBeInTheDocument();
  });

  it("renders error and warning variants with appropriate roles", () => {
    const { rerender } = render(<Callout variant="error">Something went wrong</Callout>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50/80", "text-red-900");

    rerender(<Callout variant="warning">Please proceed with caution</Callout>);
    expect(screen.getByRole("region")).toHaveClass("bg-amber-50/80", "text-amber-900");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/Callout.test.jsx`  
Expected: FAIL with "Cannot find module '../Callout'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/Callout.jsx
import React from "react";

const variantClasses = {
  info: {
    container: "bg-blue-50/70 border-blue-200 text-blue-900",
    iconColor: "text-blue-600",
    defaultIcon: "💡",
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
    iconColor: "text-emerald-600",
    defaultIcon: "✅",
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200 text-amber-900",
    iconColor: "text-amber-600",
    defaultIcon: "⚠️",
  },
  error: {
    container: "bg-red-50/80 border-red-200 text-red-900",
    iconColor: "text-red-600",
    defaultIcon: "⚠️",
  },
};

export function Callout({
  variant = "info",
  icon,
  title,
  action,
  className = "",
  children,
  ...props
}) {
  const config = variantClasses[variant] || variantClasses.info;
  const role = variant === "error" ? "alert" : "region";
  const displayedIcon = icon !== undefined ? icon : config.defaultIcon;

  return (
    <aside
      role={role}
      className={`rounded-xl border p-4 flex gap-3 text-sm leading-relaxed transition-colors ${config.container} ${className}`.trim()}
      {...props}
    >
      {displayedIcon && (
        <span className={`shrink-0 text-base select-none mt-0.5 ${config.iconColor}`}>
          {displayedIcon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold mb-1 text-inherit">{title}</h4>}
        {children && <div className="text-inherit/90">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center ml-2">{action}</div>}
    </aside>
  );
}

export default Callout;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/Callout.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/Callout.jsx neuropath-frontend/src/components/ui/__tests__/Callout.test.jsx
git commit -m "feat(ui): add Callout primitive for accessible notices and disclaimer banners"
```

---

### Task 5: Modal Primitive

**Files:**
- Create: `neuropath-frontend/src/components/ui/Modal.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/Modal.test.jsx`

**Interfaces:**
- Consumes: React, `Button`
- Produces:
  ```jsx
  export function Modal({
    isOpen = false,
    onClose,
    title,
    children,
    footer,
    size = "md", // "sm" | "md" | "lg"
    closeOnEsc = true,
    closeOnBackdrop = true,
    className = "",
    ...props
  })
  export default Modal;
  ```

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/Modal.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("Modal component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} title="Modal Title">
        Modal Content
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true with title, body, and footer", () => {
    render(
      <Modal
        isOpen={true}
        title="Modal Title"
        footer={<button>Submit</button>}
      >
        Modal Content
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Title">
        Content
      </Modal>
    );

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={true} title="Title">
        Content
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/Modal.test.jsx`  
Expected: FAIL with "Cannot find module '../Modal'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/Modal.jsx
import React, { useEffect, useRef } from "react";

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
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

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
        ref={modalRef}
        className={`bg-white rounded-2xl shadow-xl border border-slate-100 w-full ${maxWidthClass} overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-scaleUp ${className}`.trim()}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/Modal.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/Modal.jsx neuropath-frontend/src/components/ui/__tests__/Modal.test.jsx
git commit -m "feat(ui): add Modal primitive with keyboard accessibility, backdrop dismiss, and focus handling"
```

---

### Task 6: EmptyState Primitive & Barrel Index

**Files:**
- Create: `neuropath-frontend/src/components/ui/EmptyState.jsx`
- Create/Update: `neuropath-frontend/src/components/ui/index.js`
- Test: `neuropath-frontend/src/components/ui/__tests__/EmptyState.test.jsx`

**Interfaces:**
- Consumes: React, `Button`
- Produces:
  ```jsx
  export function EmptyState({
    icon = "📭",
    title,
    description,
    action = null,
    className = "",
    ...props
  })
  export default EmptyState;
  ```
  And re-exports all primitives (`Button`, `Card`, `CardHeader`, `CardBody`, `CardFooter`, `Badge`, `Callout`, `Modal`, `EmptyState`) in `src/components/ui/index.js`.

- [ ] **Step 1: Write the failing test**

```jsx
// neuropath-frontend/src/components/ui/__tests__/EmptyState.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";
import { Button } from "../Button";

describe("EmptyState component", () => {
  it("renders with title and description", () => {
    render(
      <EmptyState
        title="No Students Found"
        description="Try adjusting your search criteria or add a new student."
      />
    );

    expect(screen.getByText("No Students Found")).toBeInTheDocument();
    expect(screen.getByText(/adjusting your search criteria/i)).toBeInTheDocument();
  });

  it("renders custom icon and action CTA button", () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">📁</span>}
        title="No Records"
        description="Create your first record to get started."
        action={<Button>Create Record</Button>}
      />
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create record/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/ui/__tests__/EmptyState.test.jsx`  
Expected: FAIL with "Cannot find module '../EmptyState'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// neuropath-frontend/src/components/ui/EmptyState.jsx
import React from "react";

export function EmptyState({
  icon = "📭",
  title,
  description,
  action = null,
  className = "",
  ...props
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 my-4 ${className}`.trim()}
      {...props}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-2xl mb-4 select-none">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
```

```javascript
// neuropath-frontend/src/components/ui/index.js
export { Button, default as ButtonDefault } from "./Button";
export { Card, CardHeader, CardBody, CardFooter, default as CardDefault } from "./Card";
export { Badge, default as BadgeDefault } from "./Badge";
export { Callout, default as CalloutDefault } from "./Callout";
export { Modal, default as ModalDefault } from "./Modal";
export { EmptyState, default as EmptyStateDefault } from "./EmptyState";
export { default as CountUp } from "./CountUp";
export { default as GlareHover } from "./GlareHover";
export { default as ClickSpark } from "./ClickSpark";
export { default as RotatingText } from "./RotatingText";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/components/ui/__tests__/EmptyState.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/EmptyState.jsx neuropath-frontend/src/components/ui/index.js neuropath-frontend/src/components/ui/__tests__/EmptyState.test.jsx
git commit -m "feat(ui): add EmptyState primitive and centralize UI barrel exports"
```

---

### Task 7: Refactor `LogoutModal` and Profile Views (`UserProfilePage.jsx`)

**Files:**
- Modify: `neuropath-frontend/src/components/layout/LogoutModal.jsx`
- Modify: `neuropath-frontend/src/pages/UserProfilePage.jsx`
- Test: `neuropath-frontend/src/components/layout/Sidebar.test.jsx`, `neuropath-frontend/src/pages/UserProfilePage.jsx`

**Interfaces:**
- Consumes: `Modal`, `Button`, `Card`, `Callout` from `src/components/ui`
- Produces: Clean, accessible modal and user profile UI replacing duplicated `.modal-overlay`, `.up-card`, `.up-banner-*`, and raw buttons.

- [ ] **Step 1: Write / Run tests to establish baseline**

Run: `npm test src/components/layout/Sidebar.test.jsx`  
Expected: PASS

- [ ] **Step 2: Refactor `LogoutModal.jsx` using `Modal` and `Button` primitives**

```jsx
// neuropath-frontend/src/components/layout/LogoutModal.jsx
import React from "react";
import { Modal, Button } from "../ui";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Logout"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} className="btn-back">
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} className="logout-confirm">
            Log Out
          </Button>
        </>
      }
    >
      <p className="text-slate-600 m-0">
        Are you sure you want to log out of your session?
      </p>
    </Modal>
  );
}
```

- [ ] **Step 3: Refactor `UserProfilePage.jsx` using `Card`, `Callout`, `Button` primitives**

In `src/pages/UserProfilePage.jsx`:
- Replace `.up-banner-success` and `.up-banner-error` with `<Callout variant="success">` and `<Callout variant="error">`.
- Replace raw `.up-edit-btn`, `.btn-back`, `.btn-submit` with `<Button variant="...">`.
- Replace outer `.up-card` with semantic `<Card as="section">`, `<CardHeader>`, `<CardBody>`.

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npm test`  
Expected: All 17+ test suites PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/layout/LogoutModal.jsx neuropath-frontend/src/pages/UserProfilePage.jsx
git commit -m "refactor(ui): adopt Modal, Card, Button, and Callout primitives in LogoutModal and UserProfilePage"
```

---

### Task 8: Refactor `Overview.jsx` and `StudentInsightsTab.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/Overview.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx`
- Test: `neuropath-frontend/src/pages/Overview.test.jsx`, `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx`

**Interfaces:**
- Consumes: `Card`, `Button`, `Callout`, `Badge`, `EmptyState` from `src/components/ui`
- Produces: Modernized semantic layout without div soup.

- [ ] **Step 1: Write / Run tests to establish baseline**

Run: `npm test src/pages/Overview.test.jsx src/pages/StudentProfiling/StudentInsightsTab.test.jsx`  
Expected: PASS

- [ ] **Step 2: Refactor `Overview.jsx`**

In `src/pages/Overview.jsx`:
- Use semantic `<header className="overview-welcome mb-6">` for the welcome header.
- Use `<Card as="article">` or `<Card as="section">` for section wrappers and stat cards while keeping existing CSS class hooks (`stat-card`, `quick-action-card`, etc.) to preserve styling and test selectors.
- Replace raw button wrappers with accessible `<button>` components with keyboard focus rings.

- [ ] **Step 3: Refactor `StudentInsightsTab.jsx`**

In `src/pages/StudentProfiling/StudentInsightsTab.jsx`:
- Replace custom `.error-banner` inline style with `<Callout variant="error">{error}</Callout>`.
- Replace `.placeholder-page` paragraph when `insights.length === 0` with `<EmptyState title="No AI insights yet" description="Generate an AI-powered summary to analyze student learning patterns." action={<Button onClick={handleGenerate} disabled={generating}>Generate and Analyze</Button>} />`.
- Replace raw `<button className="btn btn-submit">` with `<Button variant="primary" onClick={handleGenerate} disabled={generating}>{generating ? "Analyzing Profile..." : "Generate and Analyze"}</Button>`.

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npm test src/pages/Overview.test.jsx src/pages/StudentProfiling/StudentInsightsTab.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/Overview.jsx neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx
git commit -m "refactor(ui): adopt Card, Callout, Button, and EmptyState primitives in Overview and StudentInsightsTab"
```

---

### Task 9: Full Regression Suite Verification & Build Check

**Files:**
- All files across `neuropath-frontend`

- [ ] **Step 1: Run full test suite**

Run: `npm test` (inside `neuropath-frontend`)  
Expected: All 18+ test suites (all unit tests + UI primitive tests) PASS

- [ ] **Step 2: Run production build**

Run: `npm run build` (inside `neuropath-frontend`)  
Expected: Vite build succeeds without warnings or TypeScript/syntax errors

- [ ] **Step 3: Final verification commit if needed**

```bash
git status
```
