# Allow Selecting From Multiple Created IEPs in Instructional Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow teachers to view and select from multiple created IEP records/versions when generating Lesson Plans and Teaching Strategies in Instructional Support, ensuring materials are generated using the specific IEP's goals and accommodations.

**Architecture:** 
Extend backend endpoints (`GenerateLessonPlanAPIView`, `TeachingStrategyGenerationController`, and `StandaloneIEPGoalViewSet`) to provide `availableIEPs` per student, support querying by specific `iep_id`, and ensure automatic Section C goal synchronization for queried IEPs.
On the frontend, extend `lessonPlansAPI` and `teachingStrategiesAPI` to accept `iep_id`, introduce an intuitive, accessible IEP Version Selector in `ManageLessonPlans.jsx` and `ManageTeachingStrategies.jsx` between Student selection and Goal selection, dynamically fetch goals for the selected IEP, and verify with comprehensive backend and frontend unit tests.

**Tech Stack:** Django REST Framework, Python 3.12+, React 19, Vitest, Testing Library.

## Global Constraints
- Target Issue: #160 (`[BE/FE] [FEATURE]: Allow selecting from multiple created IEPs when generating in Instructional Support`)
- Must maintain backward compatibility for API consumers who do not supply `iep_id` (fallback to latest IEP)
- Must preserve existing model relationships (`IEPModel`, `IEPGoal`, `StudentProfile`, `Teacher`)
- Default to the newest/latest IEP version when a student is selected while clearly presenting older versions for selection
- PR must conform strictly to `.github/pull_request_template.md` and pass `.github/workflows/pr-template-lint.yml`

---

### Task 1: Backend IEP Version Discovery and Scoped Goal Retrieval

**Files:**
- Modify: `neuropath-backend/resources/views.py:125-163, 315-342, 935-961`
- Modify: `neuropath-backend/iep_management/views.py:320-346`
- Test: `neuropath-backend/resources/tests/test_instructional_ai.py`

**Interfaces:**
- Consumes:
  - `GET /api/resources/generate-lesson/?student_id=<id>&iep_id=<id>`
  - `GET /api/resources/generate-strategy/?student_id=<id>&iep_id=<id>`
  - `GET /api/iep/goals/?iep=<iep_id>`
- Produces:
  - `directory`: array of students containing `availableIEPs` (with `iepID`, `version`, `createdDate`, `label`, `program_type`, `accommodations`), `selectedIEPID`, and `availableGoals` scoped to the requested/latest IEP.

- [ ] **Step 1: Write failing backend tests for multi-IEP support in `test_instructional_ai.py`**

Add tests to `neuropath-backend/resources/tests/test_instructional_ai.py`:
```python
    def test_directory_lists_multiple_ieps_and_scopes_goals_to_selected_iep(self):
        from rest_framework.test import APIClient
        from common_test_utils import create_teacher_with_login, create_student
        from resources.views import _saved_ieps_for_student, _goal_options_for_student

        user, teacher, token = create_teacher_with_login('multi_iep_teacher@example.com')
        student = create_student(teacher, name='Multi IEP Student', parental_consent_obtained=True)

        # Create IEP Version 1
        iep_v1 = IEPModel.objects.create(
            studentID=student,
            version=1,
            accommodations='Visual schedule',
            difficulties='Reading'
        )
        goal_v1 = IEPGoal.objects.create(
            iep=iep_v1,
            subject_category='Reading',
            annual_goal='Improve reading comprehension to 80%'
        )

        # Create IEP Version 2
        iep_v2 = IEPModel.objects.create(
            studentID=student,
            version=2,
            accommodations='Noise-canceling headphones and frequent breaks',
            difficulties='Sensory overload'
        )
        goal_v2 = IEPGoal.objects.create(
            iep=iep_v2,
            subject_category='Sensory Regulation',
            annual_goal='Utilize sensory breaks independently'
        )

        # Test helper functions
        saved_ieps = list(_saved_ieps_for_student(student))
        self.assertEqual(len(saved_ieps), 2)
        self.assertEqual(saved_ieps[0].pk, iep_v2.pk) # Newest first

        # Default options should return latest IEP (v2)
        latest_goals = _goal_options_for_student(student)
        self.assertEqual(len(latest_goals), 1)
        self.assertEqual(latest_goals[0]['goalID'], goal_v2.pk)

        # Explicit iep_id options should return goals for v1
        v1_goals = _goal_options_for_student(student, iep_id=iep_v1.pk)
        self.assertEqual(len(v1_goals), 1)
        self.assertEqual(v1_goals[0]['goalID'], goal_v1.pk)

        # Test GenerateLessonPlanAPIView GET with multiple IEPs
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = client.get('/api/resources/generate-lesson/')
        self.assertEqual(response.status_code, 200)
        dir_entry = next((s for s in response.data['directory'] if s['studentID'] == student.pk), None)
        self.assertIsNotNone(dir_entry)
        self.assertIn('availableIEPs', dir_entry)
        self.assertEqual(len(dir_entry['availableIEPs']), 2)
        self.assertEqual(dir_entry['availableIEPs'][0]['version'], 2)
        self.assertEqual(dir_entry['availableIEPs'][1]['version'], 1)
        # Default goals should be from latest IEP v2
        self.assertEqual(dir_entry['availableGoals'][0]['goalID'], goal_v2.pk)

        # Request specific iep_id=iep_v1.pk
        response_v1 = client.get(f'/api/resources/generate-lesson/?student_id={student.pk}&iep_id={iep_v1.pk}')
        self.assertEqual(response_v1.status_code, 200)
        dir_entry_v1 = next((s for s in response_v1.data['directory'] if s['studentID'] == student.pk), None)
        self.assertEqual(dir_entry_v1['selectedIEPID'], iep_v1.pk)
        self.assertEqual(dir_entry_v1['availableGoals'][0]['goalID'], goal_v1.pk)

        # Test TeachingStrategyGenerationController GET with multiple IEPs
        strat_resp = client.get(f'/api/resources/generate-strategy/?student_id={student.pk}&iep_id={iep_v1.pk}')
        self.assertEqual(strat_resp.status_code, 200)
        strat_entry = next((s for s in strat_resp.data['directory'] if s['studentID'] == student.pk), None)
        self.assertEqual(strat_entry['selectedIEPID'], iep_v1.pk)
        self.assertEqual(strat_entry['availableGoals'][0]['goalID'], goal_v1.pk)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test resources.tests.test_instructional_ai.InstructionalAIServiceTestCase.test_directory_lists_multiple_ieps_and_scopes_goals_to_selected_iep`
Expected: FAIL with `ImportError: cannot import name '_saved_ieps_for_student' from 'resources.views'`

- [ ] **Step 3: Implement backend helpers and endpoints in `resources/views.py` and `iep_management/views.py`**

In `neuropath-backend/resources/views.py`:
```python
def _iep_summary_payload(iep):
    """Structured IEP descriptor for selection menus."""
    created = iep.createdDate.strftime('%B %d, %Y') if iep.createdDate else ''
    return {
        "iepID": iep.pk,
        "version": iep.version,
        "createdDate": created,
        "label": f"IEP Version {iep.version} ({created})" if created else f"IEP Version {iep.version}",
        "program_type": iep.program_type or "Graded",
        "accommodations": iep.accommodations or "",
    }


def _saved_ieps_for_student(student):
    """Return all saved IEPs/versions for one student, newest first."""
    return (
        IEPModel.objects
        .filter(studentID=student)
        .order_by('-version', '-createdDate', '-iepID')
    )


def _latest_saved_iep_for_student(student):
    """Return the newest saved IEP/version for one student."""
    return _saved_ieps_for_student(student).first()


def _get_iep_for_student(student, iep_id=None):
    """Return specific IEP if requested and owned by student, else latest saved IEP."""
    if iep_id:
        iep = IEPModel.objects.filter(studentID=student, iepID=iep_id).first()
        if iep:
            return iep
    return _latest_saved_iep_for_student(student)


def _goal_options_for_iep(iep):
    """Extract goal options for a specific IEP instance."""
    if not iep:
        return []

    _sync_goals_from_generated_details(iep)

    goals = (
        IEPGoal.objects
        .filter(iep=iep)
        .prefetch_related('objective_rows')
        .order_by('goalID')
    )
    return [_goal_option_payload(goal) for goal in goals]


def _goal_options_for_student(student, iep_id=None):
    """Return goal options for a student, optionally targeted to an IEP ID."""
    iep = _get_iep_for_student(student, iep_id=iep_id)
    return _goal_options_for_iep(iep)


def _latest_goal_options_for_student(student):
    return _goal_options_for_student(student, iep_id=None)
```

Update `GenerateLessonPlanAPIView.get` and `TeachingStrategyGenerationController.get` to:
- Parse `student_id = request.query_params.get('student_id') or request.query_params.get('studentID')`
- Parse `iep_id = request.query_params.get('iep_id') or request.query_params.get('iepID') or request.query_params.get('iep')`
- For each student:
  - Populate `availableIEPs`: `[_iep_summary_payload(iep) for iep in ieps]`
  - Determine `target_iep`: if `iep_id` and student matches, pick that IEP; otherwise `ieps.first()`
  - Populate `selectedIEPID`: `target_iep.pk if target_iep else None`
  - Populate `availableGoals`: `_goal_options_for_iep(target_iep) if target_iep else []`

In `neuropath-backend/iep_management/views.py` (`StandaloneIEPGoalViewSet`):
- When `iep_id` is supplied:
  - Query `IEPModel.objects.filter(iepID=iep_id, studentID__teacher=teacher).first()`
  - Call `_sync_goals_from_generated_details(target_iep)` to ensure goals are synced
  - Return `IEPGoal.objects.filter(iep=target_iep).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')`

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test resources.tests.test_instructional_ai`
Expected: PASS (All tests passing)

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/resources/views.py neuropath-backend/iep_management/views.py neuropath-backend/resources/tests/test_instructional_ai.py
git commit -m "feat(backend): support multi-iep selection and scoped goal retrieval (#160)"
```

---

### Task 2: Frontend API Client Extension and IEP Selection Styling

**Files:**
- Modify: `neuropath-frontend/src/api/client.js:164-188, 305-322`
- Modify: `neuropath-frontend/src/styles/ManageTeachingStrategies.css`
- Modify: `neuropath-frontend/src/styles/ManageLessonPlans.css`

**Interfaces:**
- Consumes: `teacherId`, optional `studentId`, optional `iepId`
- Produces: API requests with query parameters to `/resources/generate-lesson/` and `/resources/generate-strategy/`

- [ ] **Step 1: Update `client.js` with `getDirectory` parameters support**

In `neuropath-frontend/src/api/client.js`:
Update `teachingStrategiesAPI.getDirectory`:
```javascript
  getDirectory: (teacherId, studentId, iepId) => {
    const params = new URLSearchParams();
    if (teacherId) params.append("teacher_id", teacherId);
    if (studentId) params.append("student_id", studentId);
    if (iepId) params.append("iep_id", iepId);
    const qs = params.toString();
    return request(`/resources/generate-strategy/${qs ? `?${qs}` : ""}`);
  },
```
Update `lessonPlansAPI.getDirectory`:
```javascript
  getDirectory: (teacherId, studentId, iepId) => {
    const params = new URLSearchParams();
    if (teacherId) params.append("teacher_id", teacherId);
    if (studentId) params.append("student_id", studentId);
    if (iepId) params.append("iep_id", iepId);
    const qs = params.toString();
    return request(`/resources/generate-lesson/${qs ? `?${qs}` : ""}`);
  },
```

- [ ] **Step 2: Add styles for IEP Selector in `ManageTeachingStrategies.css`**

Add CSS classes:
- `.ts-iep-grid`: Grid displaying IEP version selection cards
- `.ts-iep-item`: Individual selectable IEP card with active border and elevation
- `.ts-iep-header`: Flex row with version title and "Latest" badge
- `.ts-iep-badge-latest`: Pill badge highlighting the current active/latest version
- `.ts-iep-meta`: Details showing creation date, program type, and accommodations preview

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/styles/ManageTeachingStrategies.css neuropath-frontend/src/styles/ManageLessonPlans.css
git commit -m "style(frontend): add iep selector api parameters and styles (#160)"
```

---

### Task 3: Implement IEP Selector in `ManageLessonPlans.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/ManageLessonPlans.jsx`
- Create: `neuropath-frontend/src/pages/ManageLessonPlans.test.jsx`

**Interfaces:**
- Consumes: Student selection, `iepAPI.listByStudent`, `iepAPI.listGoalsByIep`
- Produces: Updated `selectedIEP`, `selectedGoal`, scoped generation payload

- [ ] **Step 1: Write frontend tests for IEP selection in `ManageLessonPlans.test.jsx`**

Create `neuropath-frontend/src/pages/ManageLessonPlans.test.jsx`:
- Mock `lessonPlansAPI`, `iepAPI`, `useAuth`, `react-router-dom`
- Test 1: Renders student directory, selecting a student displays IEP versions selector
- Test 2: When student has multiple IEP versions, both versions are listed, with latest pre-selected
- Test 3: Switching to another IEP version loads goals for that specific IEP
- Test 4: Generating lesson plan passes the goal from the selected IEP

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ManageLessonPlans.test.jsx`
Expected: FAIL (IEP selector not yet rendered in ManageLessonPlans)

- [ ] **Step 3: Implement IEP selector in `ManageLessonPlans.jsx`**

In `neuropath-frontend/src/pages/ManageLessonPlans.jsx`:
- Add state: `availableIEPs`, `selectedIEP`, `loadingIEPs`, `loadingGoals`
- In `selectStudent`:
  - Reset `selectedIEP`, `selectedGoal`, `availableIEPs`
  - Fetch student's IEPs using `iepAPI.listByStudent(student.studentID)` (or fallback to `student.availableIEPs`)
  - Pick latest IEP (version with highest version number or first in list)
  - Fetch goals for that chosen IEP using `iepAPI.listGoalsByIep(chosenIep.iepID)`
- Add `handleSelectIEP(iep)`:
  - Set `selectedIEP(iep)`
  - Clear `selectedGoal(null)`
  - Load goals for selected IEP using `iepAPI.listGoalsByIep(iep.iepID)`
- In the JSX:
  - After Step 1 (Choose a Student), render Step 2: "Select an IEP Version":
    - If student has 0 IEPs: render EmptyState prompting to Generate IEP.
    - If student has IEPs: render `.ts-iep-grid` with `.ts-iep-item` cards for each IEP version, highlighting the selected one, displaying version number, date created, program type, and accommodations preview.
  - Step 3: "Select an IEP Goal":
    - Display the goals loaded from the currently selected IEP version.
    - Clear visual indication of which IEP version the goals belong to.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ManageLessonPlans.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/ManageLessonPlans.jsx neuropath-frontend/src/pages/ManageLessonPlans.test.jsx
git commit -m "feat(frontend): allow selecting from multiple ieps in lesson plans (#160)"
```

---

### Task 4: Implement IEP Selector in `ManageTeachingStrategies.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx`
- Create: `neuropath-frontend/src/pages/ManageTeachingStrategies.test.jsx`

**Interfaces:**
- Consumes: Student selection, `iepAPI.listByStudent`, `iepAPI.listGoalsByIep`
- Produces: Updated `selectedIEP`, `selectedGoal`, scoped generation payload to `teachingStrategiesAPI.generate`

- [ ] **Step 1: Write frontend tests for IEP selection in `ManageTeachingStrategies.test.jsx`**

Create `neuropath-frontend/src/pages/ManageTeachingStrategies.test.jsx`:
- Mock `teachingStrategiesAPI`, `iepAPI`, `useAuth`, `react-router-dom`
- Test 1: Selecting a student reveals IEP versions selector with all versions listed
- Test 2: Switching IEP version fetches goals specifically for that version
- Test 3: Generating strategy triggers `generate` with the selected IEP's goal ID

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ManageTeachingStrategies.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement IEP selector in `ManageTeachingStrategies.jsx`**

In `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx`:
- Add state: `availableIEPs`, `selectedIEP`, `loadingIEPs`, `loadingGoals`
- In `selectStudent`:
  - Fetch IEPs via `iepAPI.listByStudent(student.studentID)`
  - Select latest IEP as default
  - Fetch goals for the latest IEP via `iepAPI.listGoalsByIep(latestIEP.iepID)`
- Add `handleSelectIEP(iep)`:
  - Set `selectedIEP(iep)`
  - Clear `selectedGoal(null)`
  - Fetch goals for the selected IEP via `iepAPI.listGoalsByIep(iep.iepID)`
- In the JSX:
  - Add Step 2: "Select an IEP Version"
  - Step 3: "Select an IEP Goal" (scoped to selected IEP)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ManageTeachingStrategies.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/ManageTeachingStrategies.jsx neuropath-frontend/src/pages/ManageTeachingStrategies.test.jsx
git commit -m "feat(frontend): allow selecting from multiple ieps in teaching strategies (#160)"
```

---

### Task 5: End-to-End Verification & Pull Request Creation

**Files:**
- Modify: `.github/pull_request_template.md` (check format)
- Run: Backend test suite & Frontend test suite

- [ ] **Step 1: Run complete backend test suite**
Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test.sqlite3"; python manage.py test`
Expected: All backend tests pass with 0 failures

- [ ] **Step 2: Run complete frontend test suite**
Run: `npm test`
Expected: All frontend tests pass with 0 failures

- [ ] **Step 3: Push branch and create Pull Request**
- Push branch `Pakibabes/be-fe-feature-allow-selecting-from-multiple-crea` to `origin`
- Use `gh pr create` with PR body strictly matching `.github/pull_request_template.md` and passing `pr-template-lint.yml`
