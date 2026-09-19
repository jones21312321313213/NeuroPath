# [FE] [REFACTOR]: Migrate Legacy Custom CSS to Tailwind CSS Utility System

## Summary
The `neuropath-frontend` application currently uses a hybrid styling architecture: modern UI components (`src/components/ui/`) and modals leverage Tailwind CSS v4, while major feature pages still rely on legacy, custom CSS stylesheets (`src/App.css` and 11 files in `src/styles/`, totaling ~3,500 lines).

This technical debt causes styling inconsistencies, high specificity collisions, duplicate CSS rules, and bloated bundle sizes. This issue tracks the incremental migration of all legacy stylesheets to Tailwind CSS v4 and the shared UI design system primitives.

---

## Requirements (list the requirements for this task)
- [ ] **Phase 1: Shared Layout & Navigation**
  - Refactor `src/styles/Topbar.css` and `src/App.css` navigation/shell rules to Tailwind utilities.
  - Standardize sidebar, main layout container, and responsive breakpoint wrappers.
- [ ] **Phase 2: Student Profiling Module**
  - Migrate `src/styles/ViewStudentProfile.css`, `src/styles/ViewSelectedStudentProfile.css`, and `src/styles/UpdateStudentProfile.css`.
  - Migrate `src/styles/StudentInsight.css` to Tailwind flex/grid cards and accessible badges.
- [ ] **Phase 3: IEP Generation Workflow**
  - Replace custom table, accordion, and tab styles in `IepGenerationPage.jsx` with Tailwind utilities and `src/components/ui/` primitives.
- [ ] **Phase 4: Instructional Support Module**
  - Migrate `src/styles/ManageLessonPlans.css`, `src/styles/ManageTeachingStrategies.css`, and `src/styles/ManageVisualAids.css`.
  - Replace bespoke card grids, action bars, and prompt panels with Tailwind components.
- [ ] **Phase 5: Outcome Monitoring & Student Records**
  - Migrate `src/styles/OutcomeMonitoring.css` and `src/styles/ViewStudentRecords.css`.
  - Ensure charts and printable student record preview layouts retain proper print media styling (`@media print`).
- [ ] **Phase 6: Cleanup & Deprecation**
  - Safely delete empty and redundant `.css` files from `src/styles/` and prune `App.css`.
  - Verify that `dist/assets/*.css` bundle size is reduced.

---

## Screenshots (if applicable)
N/A (Visual fidelity must match or exceed current staging deployment).

---

## Related User Stories
- **As a SPED Teacher**, I want a visually cohesive, modern, and accessible user interface that renders consistently across desktop screens, tablets, and print media.
- **As a Frontend Developer**, I want a single unified styling system (Tailwind CSS) so that styling components is fast, predictable, and free of CSS class conflicts.

---

## Acceptance Criteria
- [ ] All 11 legacy stylesheets in `src/styles/*.css` are phased out and replaced with Tailwind CSS classes.
- [ ] Core primitives in `src/components/ui/` (`Button`, `Card`, `Badge`, `Callout`, `Modal`, `EmptyState`) are used consistently across all modules.
- [ ] All interactive states (focus rings, hover, active, disabled) comply with WCAG 2.1 AA accessibility contrast standards.
- [ ] Responsive design behavior is preserved across standard viewports (mobile, tablet, desktop).
- [ ] Printable PDF/document layouts (Student Records, Visual Aids) retain high-quality print styling.
- [ ] All 343+ frontend Vitest tests pass with 0 regressions.
- [ ] `npm run lint` and `npm run build` pass with 0 errors.

---

## Definition of Done
- Refactored components submitted via incremental, reviewable PRs targeting `development`.
- All legacy CSS files in `src/styles/` removed.
- Visual inspection confirms 1:1 parity with the deployed staging baseline.
- Automated tests and linters pass cleanly.
