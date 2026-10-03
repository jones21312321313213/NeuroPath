## 🌟 Feature Description
Currently, the **View Progress Dashboard** (`ViewProgressDashboard.jsx`) displays an empty state (*"No progress data found for this student"*) because there is no frontend mechanism for teachers to record daily/weekly student performance scores, nor is initial baseline progress automatically seeded from generated IEPs.

## 🎯 Proposed Solution
1. **Interactive "+ Log Progress" Modal in Progress Dashboard**:
   - Allow teachers to record progress entries for any student with Domain/Subject selection (e.g. *Communication, Mathematics, Reading, Social Skills, Behavioral*), performance score (0% – 100%), evaluation date, and observation notes.
   - Submits to `POST /api/tracking/analytics/` and dynamically refreshes the subject cards and line charts.
2. **Executive KPI Summary Cards**:
   - Render high-level summary cards above the line chart:
     - 📈 **Overall Mastery Rate**: Average score across all domains.
     - 🎯 **Goals on Track**: Count of subjects scoring $\ge 70\%$.
     - ⚠️ **Needs Support**: Count of subjects scoring $< 70\%$.
     - 📅 **Last Evaluated**: Date of the latest progress entry.
3. **Auto-Seed Initial Baseline Progress on IEP Creation (Backend)**:
   - When an IEP is finalized and saved in `IEPGenerationAPIView`, create initial baseline `StudentProgress` data points so the progress chart immediately renders starting trends for the learner's identified difficulty areas.

## 📋 Requirements
- [ ] Add `RecordProgressModal` component in `neuropath-frontend/src/pages/ViewProgressDashboard.jsx` (or reusable component).
- [ ] Connect form submission to `trackingAPI.recordProgress` (`POST /api/tracking/analytics/`).
- [ ] Add KPI metric cards to `ViewProgressDashboard.jsx`.
- [ ] Update `IEPGenerationAPIView` (or post-save hook) to create initial baseline progress entries when a new IEP is generated.
- [ ] Enforce teacher tenant isolation and RA 10173 data privacy rules.
- [ ] Add unit and integration tests covering progress recording, dashboard aggregation, and initial baseline seeding.

## 🧪 Acceptance Criteria
- [ ] Teachers can click "+ Log Progress" to record new performance evaluations for a student.
- [ ] Subject list and historical line charts update immediately with newly logged progress scores.
- [ ] Executive KPI summary cards reflect accurate aggregate statistics.
- [ ] Multi-tenant isolation verified (teachers can only view and log progress for their assigned students).
- [ ] All frontend and backend automated tests pass (100% green).
