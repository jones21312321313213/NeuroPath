# R-GORI Compliance Inspection Button & Details View Implementation Plan (Issue #255)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the "Review Generated IEP Draft" modal displayed after generating an IEP, provide an interactive **"R-GORI"** button that, when clicked, opens the comprehensive R-GORI compliance breakdown (Measurability, Functionality, Generality, and Instructional Context) for each generated goal without blocking loops or database migrations.

**Architecture:**
1. **Explainable R-GORI Engine (Backend):** Upgrade `RGORICheckerService` with `audit_goal_explainable()` to analyze generated annual goals against the 4 R-GORI criteria using fast, deterministic ABCD heuristics, returning scores and concrete pedagogical justifications.
2. **Bundled Payload (Backend):** Attach the `rgori_audit` data to each goal dictionary returned by `POST /api/iep/generate-goals-from-iep/` in a single non-blocking pass, maintaining zero added latency and zero rate-limiting risk.
3. **Interactive R-GORI Inspection View (Frontend):** In the "Review Generated IEP Draft" modal (`IepPostGenerationModal.jsx`), place a prominent button called **"R-GORI"** (with score indicator). When clicked, it opens a dedicated R-GORI compliance drawer or modal displaying the 4-quadrant score breakdown, compliance status (`Exemplary`, `IEP Ready`, `Review Advised`), and pedagogical feedback.

**Tech Stack:** Python 3.13, Django 5.x, React 19, Tailwind CSS, Lucide / Heroicons, Vitest, React Testing Library.

---

## Global Constraints

- Never re-introduce multi-attempt retry loops or blocking rejection gates (no 429 rate limit regressions).
- No new columns or tables in `users/models.py` or `iep_management/models.py`.
- Button must be labeled **"R-GORI"** (or **"R-GORI Compliance"**) located directly within the "Review Generated IEP Draft" modal cards.
- Full test coverage: All backend tests pass with `$env:USE_SQLITE="true"`, all frontend unit tests pass in Vitest, and ESLint has 0 errors and 0 warnings.

---

### Task 1: Backend RGORI Service Explainable Audit Engine

**Files:**
- Modify: `neuropath-backend/iep_management/rgori_service.py`
- Test: `neuropath-backend/iep_management/tests/test_rgori_audit_breakdown.py`

**Interfaces:**
- Consumes: `goal_text: str`, `student_context: str`
- Produces: `dict` with keys `total_score`, `status`, `feedback`, and `breakdown` (with `measurability`, `functionality`, `generality`, `instructional_context`).

- [ ] **Step 1: Write the failing unit tests for RGORI service enrichment**

Create `neuropath-backend/iep_management/tests/test_rgori_audit_breakdown.py`:
```python
from django.test import TestCase
from iep_management.rgori_service import RGORICheckerService


class RGORIAuditBreakdownTests(TestCase):
    def test_audit_goal_explainable_evaluates_smart_abcd_goal(self):
        goal = (
            "Given visual schedule strips and verbal prompts, Alex will independently "
            "transition between classroom activities with 80% accuracy in 4 out of 5 "
            "opportunities across 3 consecutive weeks."
        )
        context = "Student: Alex. Needs support with transitions."
        audit = RGORICheckerService.audit_goal_explainable(goal, context)

        self.assertIn("total_score", audit)
        self.assertIn("status", audit)
        self.assertIn("breakdown", audit)
        self.assertGreaterEqual(audit["total_score"], 65)

        breakdown = audit["breakdown"]
        self.assertIn("measurability", breakdown)
        self.assertIn("functionality", breakdown)
        self.assertIn("generality", breakdown)
        self.assertIn("instructional_context", breakdown)

        self.assertGreater(breakdown["measurability"]["score"], 15)
        self.assertTrue(len(breakdown["measurability"]["explanation"]) > 10)

    def test_audit_goal_explainable_identifies_vague_goal(self):
        vague_goal = "Alex will understand and appreciate reading."
        audit = RGORICheckerService.audit_goal_explainable(vague_goal, "")

        self.assertLess(audit["total_score"], 65)
        self.assertEqual(audit["status"], "Review Advised")
        self.assertIn("non-observable", audit["breakdown"]["measurability"]["explanation"].lower())
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
cd neuropath-backend
$env:USE_SQLITE="true"
.\venv\Scripts\python.exe manage.py test iep_management.tests.test_rgori_audit_breakdown
```
Expected: FAIL with `AttributeError`.

- [ ] **Step 3: Implement `audit_goal_explainable` in `rgori_service.py`**

Modify `neuropath-backend/iep_management/rgori_service.py` to add `audit_goal_explainable(cls, goal_text, student_context="")` evaluating ABCD criteria, observable verbs, mastery thresholds, and generating human-readable rationales.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:USE_SQLITE="true"
.\venv\Scripts\python.exe manage.py test iep_management.tests.test_rgori_audit_breakdown
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/rgori_service.py neuropath-backend/iep_management/tests/test_rgori_audit_breakdown.py
git commit -m "feat(iep): implement audit_goal_explainable with 4-factor scoring in RGORICheckerService"
```

---

### Task 2: Backend Bundled Generation in `views.py`

**Files:**
- Modify: `neuropath-backend/iep_management/views.py:690-715`
- Test: `neuropath-backend/iep_management/tests/test_bundled_rgori_generation.py`

**Interfaces:**
- Consumes: Goal generation response
- Produces: `rgori_audit` attached to each generated goal payload sent to frontend.

- [ ] **Step 1: Write failing unit test for `generate-from-iep` API endpoint**

Create `neuropath-backend/iep_management/tests/test_bundled_rgori_generation.py` verifying `rgori_audit` exists on generated goal payloads.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:USE_SQLITE="true"
.\venv\Scripts\python.exe manage.py test iep_management.tests.test_bundled_rgori_generation
```
Expected: FAIL.

- [ ] **Step 3: Attach `rgori_audit` in `_generate_goal_for_difficulty` in `views.py`**

Modify `neuropath-backend/iep_management/views.py`:
Call `RGORICheckerService.audit_goal_explainable(annual_goal, student_context)` and set `payload["rgori_audit"] = rgori_audit`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:USE_SQLITE="true"
.\venv\Scripts\python.exe manage.py test iep_management.tests.test_bundled_rgori_generation
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_bundled_rgori_generation.py
git commit -m "feat(iep): attach non-blocking rgori_audit payload to generated IEP goals"
```

---

### Task 3: Create `RgoriComplianceModal.jsx` Dialog Component

**Files:**
- Create: `neuropath-frontend/src/components/ui/RgoriComplianceModal.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/RgoriComplianceModal.test.jsx`

**Interfaces:**
- Consumes props:
  - `isOpen`: Boolean
  - `onClose`: Function
  - `goalTitle`: String
  - `annualGoal`: String
  - `audit`: Object with `total_score`, `status`, `feedback`, `breakdown`
- Produces: An accessible modal dialog with header score badge, criteria explanation cards, and pedagogical summary.

- [ ] **Step 1: Write unit tests for `RgoriComplianceModal.jsx`**

Create `neuropath-frontend/src/components/ui/__tests__/RgoriComplianceModal.test.jsx` testing dialog visibility, score rendering, 4 criteria display, and close button behavior.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix neuropath-frontend test -- src/components/ui/__tests__/RgoriComplianceModal.test.jsx --run
```
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `RgoriComplianceModal.jsx`**

Create `neuropath-frontend/src/components/ui/RgoriComplianceModal.jsx` with 4-quadrant criteria grid (Measurability, Functionality, Generality, Instructional Context), score badges, and close handlers.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npm --prefix neuropath-frontend test -- src/components/ui/__tests__/RgoriComplianceModal.test.jsx --run
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/RgoriComplianceModal.jsx neuropath-frontend/src/components/ui/__tests__/RgoriComplianceModal.test.jsx
git commit -m "feat(ui): create RgoriComplianceModal component for detailed audit inspection"
```

---

### Task 4: Add "R-GORI" Button to "Review Generated IEP Draft" Card

**Files:**
- Modify: `neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx`
- Test: `neuropath-frontend/src/components/ui/__tests__/IepPostGenerationModal.test.jsx`

**Interfaces:**
- Consumes: `goal.rgori_audit` in draft goals array.
- Produces: A button called **"R-GORI"** (with score tag) in each goal card header; clicking it opens `RgoriComplianceModal` with that goal's compliance details.

- [ ] **Step 1: Write unit test in `IepPostGenerationModal.test.jsx` verifying R-GORI button and modal trigger**

Modify `neuropath-frontend/src/components/ui/__tests__/IepPostGenerationModal.test.jsx`:
Verify that clicking the **"R-GORI"** button opens the compliance details dialog.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
npm --prefix neuropath-frontend test -- src/components/ui/__tests__/IepPostGenerationModal.test.jsx --run
```
Expected: FAIL.

- [ ] **Step 3: Add the R-GORI button and state in `IepPostGenerationModal.jsx`**

Modify `neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx`:
1. Add state `activeRgoriGoal` for the currently inspected goal.
2. In the goal card header, next to "SMART Aligned", render:
   ```jsx
   <button
     type="button"
     onClick={() => setActiveRgoriGoal(goal)}
     className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
     title="Inspect R-GORI Compliance details"
   >
     <span>🎯 R-GORI</span>
     {goal.rgori_audit && (
       <span className="text-[11px] font-bold bg-white px-1.5 py-0.2 rounded border border-indigo-200">
         {goal.rgori_audit.total_score}/100
       </span>
     )}
   </button>
   ```
3. Render `<RgoriComplianceModal>` when `activeRgoriGoal` is non-null.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
npm --prefix neuropath-frontend test -- src/components/ui/__tests__/IepPostGenerationModal.test.jsx --run
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/components/ui/IepPostGenerationModal.jsx neuropath-frontend/src/components/ui/__tests__/IepPostGenerationModal.test.jsx
git commit -m "feat(ui): add R-Gori compliance button and inspection dialog to Review Generated IEP Draft card"
```

---

### Task 5: End-to-End Test Suite Verification

**Files:**
- Entire repository

- [ ] **Step 1: Run complete backend unit tests**

```powershell
cd neuropath-backend
$env:USE_SQLITE="true"
.\venv\Scripts\python.exe manage.py test
```

- [ ] **Step 2: Run complete frontend unit tests**

```powershell
cd ..\neuropath-frontend
npm test -- --run
```

- [ ] **Step 3: Run ESLint**

```powershell
npm run lint
```
