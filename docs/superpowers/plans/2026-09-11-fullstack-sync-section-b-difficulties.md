# Fullstack Sync Section B Difficulties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize newly added Section B difficulty rows from IEP editing in View IEP to the student profile in both the backend database and the frontend client/generator state, ensuring immediate reflection in Generate IEP without requiring a page refresh.

**Architecture:** Implement a backend save hook in `IEPEditAPIView.perform_update` to deduplicate and persist new difficulty markers into `StudentProfile`, while updating frontend `IepGenerationPage.jsx` `handleSaveEdit` / `handleUpdateIep` to synchronize `studentsAPI.update`, local React state, and TanStack Query cache.

**Tech Stack:** React 19, React Router v7, TanStack Query, Vitest, Testing Library, Django 6, Django REST Framework.

## Global Constraints
- When editing Section B in View IEP and saving, newly added difficulty rows must be merged and deduplicated with existing student difficulty markers.
- Deduplication must be case-insensitive, preserving original formatting and order.
- Switching to Generate IEP must immediately display the newly synced difficulties in `form.difficultyMarkers` and generate corresponding `form.barrierRows` with 0 page refreshes.
- All existing and new automated tests in `IepGenerationPage.test.jsx` and backend tests must pass.

---

### Task 1: Backend IEP Save Hook for Student Difficulty Sync

**Files:**
- Modify: `neuropath-backend/iep_management/views.py:207-221`
- Test: `neuropath-backend/iep_management/tests/test_iep_views.py` (or new test file `neuropath-backend/iep_management/tests/test_iep_diff_sync.py`)

**Interfaces:**
- Consumes: `IEPModel.difficulties`, `IEPModel.generatedDetails['barrierRows']`, `StudentProfile.profileDetails`, `StudentProfile.preferences`
- Produces: Updated `studentID.profileDetails['difficultyMarkers']` and `studentID.preferences` on `IEPEditAPIView` update

- [ ] **Step 1: Write backend test for difficulty sync on IEP edit**

```python
# In neuropath-backend/iep_management/tests/test_iep_diff_sync.py
import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel

class IEPDifficultySyncTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='spedteacher@test.com',
            email='spedteacher@test.com',
            password='password123'
        )
        self.teacher = Teacher.objects.create(
            name='Sped Teacher',
            email='spedteacher@test.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            teacher=self.teacher,
            name='Test Student',
            age=8,
            grade=3,
            profileDetails={'difficultyMarkers': ['Difficulty in Seeing']},
            preferences=json.dumps({'difficultyMarkers': ['Difficulty in Seeing']})
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            baselineData='Initial baseline',
            difficulties='Difficulty in Seeing',
            generatedDetails={'barrierRows': [{'difficulty': 'Difficulty in Seeing'}]}
        )
        self.client.force_authenticate(user=self.user)

    def test_sync_new_section_b_difficulties_to_student_profile(self):
        payload = {
            'difficulties': 'Difficulty in Seeing\nDifficulty in Mobility',
            'generatedDetails': {
                'barrierRows': [
                    {'difficulty': 'Difficulty in Seeing'},
                    {'difficulty': 'Difficulty in Mobility'}
                ]
            }
        }
        response = self.client.put(f'/api/iep/{self.iep.iepID}/edit/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.student.refresh_from_db()
        markers = self.student.profileDetails.get('difficultyMarkers', [])
        self.assertIn('Difficulty in Seeing', markers)
        self.assertIn('Difficulty in Mobility', markers)
        self.assertEqual(len(markers), 2)
```

- [ ] **Step 2: Run backend test to verify it fails before implementation**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test_db.sqlite3"; python manage.py test iep_management.tests.test_iep_diff_sync`
Expected: FAIL (`'Difficulty in Mobility' not found in markers`)

- [ ] **Step 3: Implement difficulty sync in `IEPEditAPIView.perform_update`**

Modify `neuropath-backend/iep_management/views.py`:
```python
class IEPEditAPIView(generics.UpdateAPIView):
    serializer_class = IEPUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPModel.objects.none()
        return IEPModel.objects.filter(studentID__teacher=teacher)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        from .serializers import IEPListDetailSerializer
        return Response(IEPListDetailSerializer(instance).data)

    def perform_update(self, serializer):
        iep = serializer.save()
        student = iep.studentID
        if student:
            raw_difficulties = []
            if iep.difficulties:
                raw_difficulties.extend([d.strip() for d in iep.difficulties.splitlines() if d.strip()])
            if isinstance(iep.generatedDetails, dict) and 'barrierRows' in iep.generatedDetails:
                for r in iep.generatedDetails['barrierRows']:
                    if isinstance(r, dict) and r.get('difficulty'):
                        d_str = str(r['difficulty']).strip()
                        if d_str:
                            raw_difficulties.append(d_str)

            if raw_difficulties:
                profile_details = student.profileDetails if isinstance(student.profileDetails, dict) else {}
                existing_markers = profile_details.get('difficultyMarkers') or []
                if isinstance(existing_markers, str):
                    existing_markers = [m.strip() for m in existing_markers.splitlines() if m.strip()]
                elif not isinstance(existing_markers, list):
                    existing_markers = []

                seen = set()
                merged = []
                for item in existing_markers:
                    key = item.strip().lower()
                    if key and key not in seen:
                        seen.add(key)
                        merged.append(item.strip())
                for item in raw_difficulties:
                    key = item.strip().lower()
                    if key and key not in seen:
                        seen.add(key)
                        merged.append(item.strip())

                profile_details['difficultyMarkers'] = merged
                student.profileDetails = profile_details
                try:
                    import json
                    existing_prefs = json.loads(student.preferences) if student.preferences else {}
                    if not isinstance(existing_prefs, dict):
                        existing_prefs = {}
                except Exception:
                    existing_prefs = {}
                existing_prefs['difficultyMarkers'] = merged
                student.preferences = json.dumps(existing_prefs)
                student.save(update_fields=['profileDetails', 'preferences'])
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME="test_db.sqlite3"; python manage.py test iep_management.tests.test_iep_diff_sync`
Expected: PASS

- [ ] **Step 5: Commit backend changes**

```bash
git add neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_iep_diff_sync.py
git commit -m "feat(backend): sync section B difficulties to student profile on IEP edit (#135)"
```

---

### Task 2: Frontend Difficulty Deduplication and Profile Sync in `IepGenerationPage.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`

**Interfaces:**
- Consumes: `editBarrierRows`, `selectedStudent`, `studentsAPI.update`
- Produces: `mergeDifficulties` utility, updated `students` & `selectedStudent` state, and sync via `studentsAPI.update`

- [ ] **Step 1: Add `mergeDifficulties` helper function to `IepGenerationPage.jsx`**

```javascript
export function mergeDifficulties(existingList = [], newList = []) {
  const seen = new Set();
  const result = [];
  const combined = [...(existingList || []), ...(newList || [])];
  for (const item of combined) {
    const trimmed = String(item || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}
```

- [ ] **Step 2: Update `ViewIEPPanel` and `IEPGenerationPage` to coordinate student profile update on save**

In `ViewIEPPanel` `handleSaveEdit`:
- Calculate `mergedDifficulties`:
  ```javascript
  const newRowDifficulties = editBarrierRows
    .map((r) => String(r.difficulty || "").trim())
    .filter(Boolean);
  const existingDifficulties = getStudentProfileDifficulties(selectedStudent);
  const mergedDifficulties = mergeDifficulties(existingDifficulties, newRowDifficulties);
  ```
- Pass `updatedDifficulties: mergedDifficulties` to `onUpdateIep(selectedIep, payload, mergedDifficulties)`.

In `handleUpdateIep` in `IEPGenerationPage`:
- Call `studentsAPI.update(studentId, updatedStudentPayload)` if new difficulties were added.
- Update `selectedStudent`, `students` array, and `form.difficultyMarkers` / `form.barrierRows`.
- If `queryClient` is in scope, update the cache.

- [ ] **Step 3: Update `onStudentUpdated` callback or direct state in `IEPGenerationPage`**

Ensure that when `selectedStudent` changes with the new difficulties, `form.difficultyMarkers` and `form.barrierRows` update immediately so navigating to Generate IEP renders the new tags and rows without a page refresh.

- [ ] **Step 4: Commit frontend changes**

```bash
git add neuropath-frontend/src/pages/IepGenerationPage.jsx
git commit -m "feat(frontend): sync edit Section B difficulties to student profile and form state (#135)"
```

---

### Task 3: Comprehensive Automated Tests in `IepGenerationPage.test.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

- [ ] **Step 1: Add tests for Section B difficulty synchronization and deduplication**

Write unit and integration tests:
1. `studentsAPI.update` is called with deduplicated difficulties when adding new difficulty rows in Edit Section B and clicking SAVE CHANGES.
2. Switching to Generate IEP displays the newly added difficulty marker tag in Step 1 immediately.
3. Case-insensitive duplicate difficulties are deduplicated and not added twice.

- [ ] **Step 2: Run vitest test suite**

Run: `npm test`
Expected: All tests in `IepGenerationPage.test.jsx` and across the entire frontend pass (28 test files, 214+ tests).

- [ ] **Step 3: Commit frontend tests**

```bash
git add neuropath-frontend/src/pages/IepGenerationPage.test.jsx
git commit -m "test: verify Section B difficulty synchronization between Edit IEP and Generate IEP (#135)"
```

---

### Task 4: Full Verification and PR Preparation

**Files:**
- Modify/Create: `.github/pull_request_template.md` (ensure matches requested template)

- [ ] **Step 1: Verify all frontend and backend tests pass**
- [ ] **Step 2: Check git diff and status**
- [ ] **Step 3: Prepare PR with the exact title and body format specified in instructions**
