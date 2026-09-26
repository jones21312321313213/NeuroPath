# Core Reusable UI Primitives (Design System) Design Specification

**Issue Reference:** #112 — `[FE] [REFACTOR]: build core reusable UI primitives (Design System) to eliminate div soup and style duplication`  
**Date:** 2026-09-10  
**Scope:** `neuropath-frontend` (No backend changes)

---

## 1. Overview & Goals

The NeuroPath frontend has experienced style duplication and deeply nested `<div>` "soup" across multiple views (e.g. `.form-card`, `.overview-welcome`, `.summary-disclaimer-box`, ad-hoc modals, and button classes).

This design introduces a cohesive, accessible set of reusable UI primitives in `src/components/ui/` built on semantic HTML5 elements and Tailwind CSS utility tokens. Following this, high-duplication areas (`Overview.jsx`, `StudentInsightsTab.jsx`, `UserProfilePage.jsx`, `LogoutModal.jsx`) will be refactored to consume these primitives directly.

---

## 2. Core UI Primitives

All primitives live in `neuropath-frontend/src/components/ui/` and are re-exported via an `index.js` barrel file:

### 2.1 `<Button>` (`src/components/ui/Button.jsx`)
- **Semantic Tag:** `<button>`
- **Props:**
  - `variant`: `'primary'` | `'secondary'` | `'outline'` | `'danger'` (default: `'primary'`)
  - `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
  - `disabled`: boolean (applies `disabled:opacity-50 disabled:cursor-not-allowed`)
  - `type`: `'button'` | `'submit'` | `'reset'` (default: `'button'`)
  - `icon`: React node (optional icon prefix or suffix)
  - `className`: string
  - `children`: React node
  - `...props`: forwarded HTML attributes (`onClick`, `aria-*`, etc.)
- **Accessibility:** Focus-visible ring (`focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none`), keyboard triggerable via Enter/Space.

### 2.2 `<Card>` (`src/components/ui/Card.jsx`)
- **Semantic Tag:** Defaults to `<section>` or `<article>` via `as` prop.
- **Sub-components:**
  - `Card`: Root container with subtle border (`border-slate-200`), rounded corners (`rounded-xl` or `rounded-2xl`), shadow (`shadow-sm`), and clean background (`bg-white`).
  - `CardHeader` / `Card.Header`: Semantic `<header>` containing card title, subtitle, and action buttons.
  - `CardBody` / `Card.Body`: Main content container with consistent spacing (`p-5` / `p-6`).
  - `CardFooter` / `Card.Footer`: Semantic `<footer>` for footer actions, summaries, or metadata.
- **Export Syntax:** Supports both named imports (`{ Card, CardHeader, CardBody, CardFooter }`) and compound dot-notation (`<Card.Header>`, `<Card.Body>`, `<Card.Footer>`).

### 2.3 `<Badge>` (`src/components/ui/Badge.jsx`)
- **Semantic Tag:** `<span>`
- **Props:**
  - `variant`: `'info'` | `'success'` | `'warning'` | `'purple'` | `'danger'` | `'neutral'` (default: `'info'`)
  - `size`: `'sm'` | `'md'` (default: `'md'`)
  - `children`: React node
  - `className`: string
  - `...props`: forwarded props
- **Styling:** Pill-shaped badge (`rounded-full inline-flex items-center font-medium px-2.5 py-0.5`).

### 2.4 `<Callout>` (`src/components/ui/Callout.jsx`)
- **Semantic Tag:** `<aside>` with `role="alert"` or `role="region"`.
- **Props:**
  - `variant`: `'info'` | `'warning'` | `'error'` | `'success'` (default: `'info'`)
  - `icon`: React node or boolean (defaults to variant emoji/icon)
  - `title`: optional string/node
  - `action`: optional React node (e.g. CTA button)
  - `children`: React node
  - `className`: string
  - `...props`: forwarded props
- **Purpose:** Replaces ad-hoc disclaimer boxes, error banners, and insight notice banners across the application.

### 2.5 `<Modal>` (`src/components/ui/Modal.jsx`)
- **Semantic Tag:** `<div role="dialog" aria-modal="true">` with `<div className="fixed inset-0 bg-black/50 backdrop-blur-xs ...">` overlay.
- **Props:**
  - `isOpen`: boolean
  - `onClose`: function
  - `title`: string or React node
  - `children`: React node
  - `footer`: optional React node (e.g., action buttons)
  - `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
  - `closeOnEsc`: boolean (default: `true`)
  - `closeOnBackdrop`: boolean (default: `true`)
  - `className`: string
- **Accessibility & Keyboard:**
  - Traps focus or returns focus on unmount.
  - Attaches `keydown` listener for `Escape` key to invoke `onClose`.
  - Backdrop click triggers `onClose` when `closeOnBackdrop` is true.

### 2.6 `<EmptyState>` (`src/components/ui/EmptyState.jsx`)
- **Semantic Tag:** `<div className="flex flex-col items-center justify-center text-center p-8 ...">`
- **Props:**
  - `icon`: React node (optional visual icon / emoji)
  - `title`: string or React node
  - `description`: string or React node
  - `action`: optional React node (e.g., `<Button>` CTA)
  - `className`: string
- **Purpose:** Standardizes zero-data placeholders across lists, tables, and tabs.

---

## 3. High-Duplication Refactoring Targets

1. **`src/pages/Overview.jsx`:**
   - Replace outer `.overview-welcome` wrapper with a semantic `<header>` and `<Card>`.
   - Refactor stat cards and quick action cards to use semantic `<article>` / `<button>` / `<Card>` elements.
2. **`src/pages/StudentProfiling/StudentInsightsTab.jsx`:**
   - Replace the custom error banner and disclaimer notice with `<Callout variant="error">` and `<Callout variant="info">`.
   - Replace empty message with `<EmptyState>`.
   - Replace raw form action button with `<Button variant="primary">`.
3. **`src/pages/UserProfilePage.jsx`:**
   - Replace the `.up-card` with `<Card>`, `<CardHeader>`, `<CardBody>`.
   - Replace `.up-banner-success` and `.up-banner-error` with `<Callout>`.
   - Replace buttons with `<Button variant="secondary">` and `<Button variant="primary">`.
4. **`src/components/layout/LogoutModal.jsx`:**
   - Refactor to use the standard `<Modal>` primitive with `<Button variant="outline">` (Cancel) and `<Button variant="danger">` (Log Out).

---

## 4. Testing & Verification

1. **Unit Tests for UI Primitives (`src/components/ui/__tests__/`):**
   - `Button.test.jsx`: tests variant classes, size classes, disabled state, click handling, keyboard trigger.
   - `Card.test.jsx`: tests named and compound rendering, semantic tags (`as` prop), child elements.
   - `Badge.test.jsx`: tests variants and rendering.
   - `Callout.test.jsx`: tests variants (info, warning, error, success), title, icon, action button.
   - `Modal.test.jsx`: tests open/closed state, backdrop click, Escape key close, header/footer rendering.
   - `EmptyState.test.jsx`: tests icon, title, description, and action CTA rendering.
2. **Regression Testing:**
   - Run `npm test` across all 17 test suites to ensure 100% existing test pass rate.
   - Run `npm run build` to verify production Vite build without errors.
