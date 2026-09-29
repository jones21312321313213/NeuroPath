# Direct IEP PDF Export, Design Token Harmonization, Recent Activity Feed & Update Timestamps (Issue #206) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement enhancements ENH22, ENH23, ENH24, and ENH30 across `neuropath-backend` and `neuropath-frontend` to provide one-click direct PDF downloads for IEP documents, harmonize component styling and design tokens (touch targets >= 44px, standard 8px/12px border radii, unified elevation shadows), surface dynamic "Recently Updated" indicators on student profile cards and IEP headers, and introduce an interactive recent activity feed on the main educator dashboard.

**Architecture:**
1. **Direct Download for IEP PDF Export (ENH22):**
   - Backend: Define `IEPBinaryReportRenderEngine` using ReportLab in `iep_management/views.py` and register `GET /api/iep/<int:pk>/export/` via `IEPExportPDFView`. Returns a binary PDF stream with `Content-Disposition: attachment; filename="IEP_<studentName>_v<version>.pdf"`.
   - Frontend: Add `iepAPI.exportPDF(id)` in `src/api/client.js`. In `IepGenerationPage.jsx`, add an "EXPORT PDF" button with loading feedback and direct browser file download using `URL.createObjectURL(blob)`.
2. **Component & Styling System Harmonization (ENH23):**
   - Standardize core UI primitives in `App.css` and `index.css`: buttons with minimum 44px touch targets and 8px border radii, form cards with 12px border radii and unified elevation shadows, standardized form inputs/selects/textareas, and cohesive status badges.
3. **"Recently Updated" Indicators on Student Profiles and IEP Cards (ENH24):**
   - Backend: Add `created_at` and `updated_at` timestamps to `StudentProfile` in `users/models.py`, generate and run migration.
   - Frontend: Surface dynamic relative timestamps ("Updated X days ago" / "Last Updated: <Date>") on student profile cards in `ViewStudentProfile.jsx` and IEP headers in `IepGenerationPage.jsx`.
4. **Recent Activity Section on Main Educator Dashboard (ENH30):**
   - Backend: Add `RecentActivityAPIView` in `tracking/views.py` (`GET /api/tracking/recent-activity/`) returning the latest 5–10 chronological events across IEP creation/updates, student profile registrations, and progress logging for the authenticated teacher.
   - Frontend: Add `trackingAPI.getRecentActivity()` and `useRecentActivity()`. Render a "Recent Activity" widget card on `Overview.jsx` with direct navigation links to corresponding records.

**Tech Stack:** React 19, Vite, TanStack Query, Tailwind CSS v4, Django 6, Django REST Framework, ReportLab, Vitest, Testing Library.

---

### Task 1: Direct IEP PDF Export (ENH22)

**Files:**
- Modify: `neuropath-backend/iep_management/views.py`
- Modify: `neuropath-backend/iep_management/urls.py`
- Create: `neuropath-backend/iep_management/tests/test_iep_export_pdf.py`
- Modify: `neuropath-frontend/src/api/client.js`
- Modify: `neuropath-frontend/src/api/client.test.js`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

- [ ] **Step 1: Write backend tests for IEP PDF export**
  - Create `neuropath-backend/iep_management/tests/test_iep_export_pdf.py` asserting:
    - `GET /api/iep/<id>/export/` with valid auth returns `200 OK`, `content_type='application/pdf'`, and `attachment; filename="IEP_...pdf"`.
    - Returns 404 for an IEP belonging to another teacher or non-existent IEP.
    - PDF body starts with `%PDF-`.

- [ ] **Step 2: Implement backend `IEPBinaryReportRenderEngine` and `IEPExportPDFView`**
  - In `neuropath-backend/iep_management/views.py`:
    - Implement `IEPBinaryReportRenderEngine.generate_iep_pdf_stream(iep)`.
    - Implement `IEPExportPDFView(APIView)` returning `HttpResponse(pdf_stream, content_type='application/pdf')`.
  - In `neuropath-backend/iep_management/urls.py`:
    - Register `path('<int:pk>/export/', views.IEPExportPDFView.as_view(), name='export_iep_pdf')`.

- [ ] **Step 3: Run backend tests and verify**
  - Run `.\venv\Scripts\python.exe manage.py test iep_management --keepdb --noinput`.

- [ ] **Step 4: Update frontend `iepAPI.exportPDF` in `client.js` and test**
  - Add `exportPDF: async (iepId) => ...` in `neuropath-frontend/src/api/client.js`.
  - Add test in `neuropath-frontend/src/api/client.test.js`.
  - Run `npx vitest run src/api/client.test.js`.

- [ ] **Step 5: Add "EXPORT PDF" button to `ViewIEPPanel` in `IepGenerationPage.jsx`**
  - Add `handleExportPDF` function handling blob download via `URL.createObjectURL`.
  - Add "EXPORT PDF" button inside `iep-view-actions` with loading indicator ("Exporting PDF...") and accessible error alerts.

- [ ] **Step 6: Write frontend unit tests for IEP PDF export**
  - Add tests in `IepGenerationPage.test.jsx` asserting clicking "EXPORT PDF" calls `iepAPI.exportPDF` and triggers download.

---

### Task 2: Component & Styling System Harmonization (Design Tokens) (ENH23)

**Files:**
- Modify: `neuropath-frontend/src/App.css`
- Modify: `neuropath-frontend/src/index.css`

- [ ] **Step 1: Enforce minimum touch targets and standardized border radii**
  - Update `.btn` in `App.css`: `min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;`.
  - Update `.form-input`, `.form-select`, `.form-textarea`: `min-height: 44px; border-radius: 8px;`.
  - Update `.form-card`: `border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1); border: 1px solid #f1f5f9;`.
  - Update status badge tokens: `.iep-status-badge`, `.vsp-pill`, `.step-badge` to consistent padding (`4px 10px; font-size: 0.75rem; border-radius: 9999px; font-weight: 600;`).

- [ ] **Step 2: Verify styling and accessibility across components**
  - Run `npm run lint` and `npm run build` to verify no CSS errors or broken styles.

---

### Task 3: "Recently Updated" Indicators on Student Profiles and IEP Cards (ENH24)

**Files:**
- Modify: `neuropath-backend/users/models.py`
- Create: `neuropath-backend/users/migrations/0005_studentprofile_created_at_updated_at.py`
- Modify: `neuropath-backend/users/tests.py`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.test.jsx`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`

- [ ] **Step 1: Add timestamps to `StudentProfile` model**
  - In `neuropath-backend/users/models.py`: add `created_at` and `updated_at` fields.
  - Run `makemigrations` and `migrate`.

- [ ] **Step 2: Add backend tests for student timestamps**
  - In `neuropath-backend/users/tests.py`: verify `created_at` and `updated_at` are automatically populated and serialized.

- [ ] **Step 3: Update `ViewStudentProfile.jsx` to render "Recently Updated" badge**
  - In `ViewStudentProfile.jsx`: render a prominent updated badge on each student card with relative time (e.g., "Updated 2 days ago" or "Updated recently").
  - Update `ViewStudentProfile.test.jsx` with tests verifying the badge is rendered.

- [ ] **Step 4: Update IEP presentation with relative update badge**
  - In `IepGenerationPage.jsx`: format the last updated badge with relative & formatted timestamps.

---

### Task 4: Recent Activity Section on Main Educator Dashboard (ENH30)

**Files:**
- Modify: `neuropath-backend/tracking/views.py`
- Modify: `neuropath-backend/tracking/urls.py`
- Modify: `neuropath-backend/tracking/tests.py`
- Modify: `neuropath-frontend/src/api/client.js`
- Modify: `neuropath-frontend/src/api/client.test.js`
- Modify: `neuropath-frontend/src/hooks/queries.js`
- Modify: `neuropath-frontend/src/pages/Overview.jsx`
- Modify: `neuropath-frontend/src/pages/Overview.test.jsx`

- [ ] **Step 1: Write backend tests for Recent Activity API**
  - In `neuropath-backend/tracking/tests.py`: test `GET /api/tracking/recent-activity/` returns recent actions scoped to teacher.

- [ ] **Step 2: Implement `RecentActivityAPIView` in `tracking/views.py`**
  - Aggregate latest events across `IEPModel`, `StudentProfile`, and `StudentProgress`.
  - Register route in `tracking/urls.py`.

- [ ] **Step 3: Add `getRecentActivity` to `client.js` and `queries.js`**
  - In `client.js`: `trackingAPI.getRecentActivity()`.
  - In `queries.js`: `useRecentActivity()`.

- [ ] **Step 4: Add Recent Activity widget to `Overview.jsx`**
  - Render a "Recent Activity" widget card on `Overview.jsx` displaying event icons, descriptions, relative timestamps, and direct links to students/IEPs.
  - Display empty state when no activity exists.

- [ ] **Step 5: Write frontend unit tests in `Overview.test.jsx`**
  - Test rendering of recent activity items, links, and empty states.

---

### Task 5: Full Regression Testing & Verification

- [ ] **Step 1: Run all frontend tests (`npm test -- --run`)**
- [ ] **Step 2: Run all backend tests (`python manage.py test`)**
- [ ] **Step 3: Run ESLint (`npm run lint`)**
- [ ] **Step 4: Run build (`npm run build`)**
