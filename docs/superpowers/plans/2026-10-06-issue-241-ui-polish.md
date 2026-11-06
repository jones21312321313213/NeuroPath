# Implementation Plan - Issue #241: Instructional Support UI Polish, Toast Notifications, IEP Banner Cleanup, and Modal Readability

**Target Branch:** `fix/issue-241-ui-polish`  
**Tracking Issue:** [Issue #241](https://github.com/jones21312321313213/NeuroPath/issues/241)  
**Parent PR:** Targets `main` (will sync to `staging` for Vercel production deployment)

---

## 1. Problem Statement & Scope

During user evaluation and live testing of NeuroPath, the following UI and notification polish items were identified:
1. **View IEP Next Steps Banner:** The callout block (`.iep-next-steps-card`) in the View IEP panel ("Instructional Support: Use this IEP in the Classroom", buttons for Create Lesson Plan, Create Visual Aid, Teaching Strategies, and Back to Overview) clutters the document reading area and needs to be removed.
2. **Instructional Support Tab Positioning:** In all 3 instructional support pages (`ManageLessonPlans`, `ManageTeachingStrategies`, `ManageVisualAids`), the newly added "Info" tab should be positioned at the leftmost side (`[Info, Generate, Manage...]`), while preserving the default active tab behavior.
3. **Generation Success Notifications (Lesson Plans):** Replace the static in-flow completion card (`.ts-success-msg`) with a top-right notification toast that smoothly slides down/in upon generation and auto-dismisses (slides out) after 5 seconds.
4. **Generation Success Notifications (Teaching Strategies):** Remove the static in-flow card upon generating a strategy and show the same 5-second top-right slide-in/out notification.
5. **Generation Success Notifications (Visual Aids):** Align Visual Aids generation with the top-right 5-second slide-in/out notification behavior.
6. **IEP Progress Palette Simplification:** Simplify the color palette in `IepLoadingModal` (reduce multi-colored rainbow badge clutter to a cohesive, calm blue and slate palette).
7. **Review Generated IEP Draft Modal Readability:** Make the modal dialog wider (`size="5xl"`) and enlarge the Objectives and Milestones table font and cell padding for effortless reading.

---

## 2. Technical Approach & Design

### A. Remove View IEP Next Steps Banner
- File: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
  - Remove `<section className="iep-next-steps-card" aria-label="Instructional Support Next Steps">` (lines ~1526–1593) from the View IEP panel.
  - Keep the Post-IEP prompt in the IEP generation completion flow (`aria-label="Post-IEP Next Steps"`) intact.
- File: `neuropath-frontend/src/pages/IepNextSteps.test.jsx`
  - Update the test "navigates from View IEP classroom tools to each instructional support page" to verify that the View IEP panel renders cleanly without the `.iep-next-steps-card` banner, or test navigation via dedicated overview / post-generation routes.

### B. Leftmost "Info" Tab in Instructional Support Pages
- Files:
  - `neuropath-frontend/src/pages/ManageLessonPlans.jsx`: Reorder `TABS` to `[ { key: "info", ... }, { key: "generate", ... }, { key: "manage", ... } ]`. Keep `activeTab` initial state as `"generate"`.
  - `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx`: Reorder `TABS` to `[ { key: "info", ... }, { key: "generate", ... }, { key: "manage", ... } ]`. Keep `activeTab` initial state as `"generate"`.
  - `neuropath-frontend/src/pages/ManageVisualAids.jsx`: Reorder `TABS` to `[ { key: "info", ... }, { key: "generate", ... }, { key: "view", ... }, { key: "delete", ... } ]`. Keep `activeTab` initial state as `"generate"`.

### C. Top-Right Slide-In & Slide-Out Toast Notifications (5 Seconds)
- File: `neuropath-frontend/src/components/ui/ToastContainer.jsx`
  - Position container at `fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0`.
  - Support `toast.isExiting` state for applying exit animation class `.toast-slide-out` before DOM unmount.
- File: `neuropath-frontend/src/context/ToastContext.jsx`
  - In `addToast`, record `isExiting: false`.
  - When `duration > 0`, dispatch an exit state update at `duration - 400ms`, then remove toast at `duration`.
- File: `neuropath-frontend/src/index.css`
  - Define `@keyframes toastSlideInTopRight` (slides down from `-16px` and fades in) and `@keyframes toastSlideOutTopRight` (slides up to `-16px` and fades out).
  - Add classes `.toast-slide-in` and `.toast-slide-out`.
- File: `neuropath-frontend/src/pages/ManageLessonPlans.jsx`
  - In `handleGenerate`: Call `toast.success(res.message || "Lesson plan sequence generated successfully.", { duration: 5000 })`.
  - In JSX: Remove the in-flow `{generated.message && <div className="ts-success-msg ...">...</div>}` block.
- File: `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx`
  - In `GenerateTab`: Call `useToast()` to get `toast`.
  - In `handleGenerate`: Call `toast.success(data.message || "Teaching strategy successfully generated.", { duration: 5000 })`.
  - In JSX: Remove the in-flow `{generated.message && <div className="ts-success-msg ...">...</div>}` block.
- File: `neuropath-frontend/src/pages/ManageVisualAids.jsx`
  - In `handleGenerate`: Ensure `toast.success("Visual aid generated! Please review and decide whether to save.", { duration: 5000 })` is called.

### D. Simplified IEP Progress Modal Palette
- File: `neuropath-frontend/src/components/ui/IepLoadingModal.jsx`
  - Unify styling to clean blues and slates:
    - Header icon: `bg-blue-50 border-blue-100 text-blue-600`.
    - Goal Area tag: `bg-blue-50 text-blue-700 border-blue-200/60`.
    - Progress Bar: single consistent `bg-blue-600` accent.
    - Percentage text: `text-blue-600 font-mono font-bold`.
    - Stepper: Active item uses `bg-blue-50/60 border-blue-200 text-blue-900`, completed uses `bg-slate-50 border-slate-200 text-slate-700`, pending uses `opacity-60`.
    - Step circles: `bg-blue-600` with white checkmark for completed, `bg-blue-600` with pulse for active, `bg-slate-200` for pending.
    - Status badges: `bg-blue-100 text-blue-800` for active, `bg-slate-100 text-slate-700` for completed.
    - Reassurance note: replace high-contrast amber with soothing `bg-slate-50 border-slate-200 text-slate-600`.

### E. Enlarge Review Generated IEP Draft Modal & Objectives Readability
- File: `neuropath-frontend/src/components/ui/Modal.jsx`
  - Add `"5xl": "max-w-5xl"` and `"6xl": "max-w-6xl"` to `sizeClasses`.
- File: `neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx`
  - Set modal `size="5xl"`.
  - In the Objectives & Milestones table:
    - Increase font size to `text-sm` (cells: `text-sm text-slate-800`, objective text: `text-sm font-semibold text-slate-900`).
    - Increase padding to `px-4 py-3`.
    - Header: `text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100`.
    - Ensure clear readable column widths and smooth scroll handling.

---

## 3. Testing Strategy

1. **Frontend Vitest Suite:**
   - Run `npm run test` in `neuropath-frontend`.
   - Update tests where tab position, toast timing, or next-steps banners were asserted:
     - `IepNextSteps.test.jsx`
     - `ManageLessonPlans.test.jsx`
     - `ManageTeachingStrategies.test.jsx`
     - `ManageVisualAids.test.jsx`
     - `ToastContext.test.jsx`
2. **Backend Test Suite:**
   - Run Django test suite with SQLite (`python manage.py test`) to verify 0 regressions across the 257 tests.
3. **Linter & Build:**
   - `npm run lint` in `neuropath-frontend`
   - `npm run build` in `neuropath-frontend`
   - `ruff check .` in `neuropath-backend`
