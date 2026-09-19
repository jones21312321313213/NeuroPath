# Issue #68 — Fix Crash and Broken-Endpoint Bugs in iep_management and resources Apps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve crash and validation failure bugs in `iep_management` (`GeneratedAIInsight.__str__`) and `resources` (`TeachingStrategyViewSet.create` and `LessonPlanViewSet.create`), and add regression test coverage for all three flows.

**Architecture:** Correct schema mismatches across Django models, serializers, and views by pointing field lookups to existing model properties (`StudentProfile.name` instead of non-existent `studentName`), extracting student profile references via the parent foreign key (`iep_goal.iep.studentID` instead of non-existent serializer field `student`), and aligning the `LessonPlanViewSet.create` payload to use `LessonPlanSerializer` fields (`iep_goal`, `lessonContent`).

**Tech Stack:** Python 3.13, Django 6.0, Django REST Framework (DRF), SQLite (in-memory test runner), Ruff linter.

## Global Constraints

- Never reference non-existent model attributes (`StudentProfile` primary name field is `name`, primary key is `studentID`).
- ViewSet permissions and tenant isolation checks must be maintained: endpoints must reject unauthenticated requests (HTTP 401) and foreign teacher access (HTTP 404).
- TDD discipline is strictly enforced: write failing regression tests first, verify RED failure, implement the minimal fix, and verify GREEN.
- Code style and hygiene: all changes must pass `ruff check .` with zero errors or warnings.
- Commit after each task with clear commit messages.

---

## File Structure

| File | Responsibility / Changes |
| --- | --- |
| `neuropath-backend/neuropath_core/settings.py` | **Modify.** Configure SQLite in-memory database when running tests or when `USE_SQLITE=True` and provide default for `DB_PASSWORD` so test runner runs smoothly. |
| `neuropath-backend/iep_management/models.py` | **Modify.** Update `GeneratedAIInsight.__str__` to reference `self.student.name` instead of `self.student.studentName`. |
| `neuropath-backend/iep_management/tests.py` | **Modify.** Add regression tests for `GeneratedAIInsight.__str__` string representation. |
| `neuropath-backend/resources/views.py` | **Modify.** Fix `TeachingStrategyViewSet.create` to look up `student_profile` from `iep_goal.iep.studentID`; fix `LessonPlanViewSet.create` to validate request against `LessonPlanSerializer` with `iep_goal` and auto-populate `lessonContent`. |
| `neuropath-backend/resources/tests.py` | **Modify.** Add regression tests for `TeachingStrategyViewSet.create` and `LessonPlanViewSet.create` (blank content auto-generation, explicit content, unauthenticated access, and cross-teacher rejection). |

---

## Task 1: Test Runner Configuration for In-Memory SQLite

Running `python manage.py test` currently attempts to connect to remote PostgreSQL pooler unless `DB_PASSWORD` is provided and test runner uses SQLite. This task configures `settings.py` so running `python manage.py test` automatically uses in-memory SQLite and defaults `DB_PASSWORD` to avoid `ImproperlyConfigured` errors.

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py:90-105`

**Interfaces:**
- Consumes: Django settings environment variables
- Produces: Seamless execution of `python manage.py test`

- [ ] **Step 1: Update `settings.py` database configuration for tests**

In `neuropath-backend/neuropath_core/settings.py`, modify the database block around line 90:

```python
import sys

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

if 'test' in sys.argv or env.bool('USE_SQLITE', default=False):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', default='postgres'),
            'USER': env('DB_USER', default='postgres.mdlsncdlpgbfjcccavuv'),
            'PASSWORD': env('DB_PASSWORD', default=''),
            'HOST': env('DB_HOST', default='aws-1-ap-southeast-1.pooler.supabase.com'),
            'PORT': env('DB_PORT', default='6543'),
        }
    }
```

- [ ] **Step 2: Run test suite to verify settings**

Run: `python manage.py test` in `neuropath-backend`
Expected: `Ran 64 tests in ... OK`

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/neuropath_core/settings.py
git commit -m "chore: configure in-memory sqlite database for test runner"
```

---

## Task 2: Fix `GeneratedAIInsight.__str__` Field Reference

`GeneratedAIInsight.__str__` references `self.student.studentName`, but `StudentProfile` model only has the field `name`. Calling `str()` on a `GeneratedAIInsight` raises `AttributeError`.

**Files:**
- Modify: `neuropath-backend/iep_management/models.py:101-102`
- Test: `neuropath-backend/iep_management/tests.py`

**Interfaces:**
- Produces: `GeneratedAIInsight.__str__() -> str` format `"Insight for <student.name> generated by <teacher.username>"`

- [ ] **Step 1: Write the failing regression test**

In `neuropath-backend/iep_management/tests.py`, add a test case to verify `GeneratedAIInsight.__str__`:

```python
from .models import GeneratedAIInsight

class GeneratedAIInsightModelTests(TestCase):
    """Regression tests for GeneratedAIInsight model methods."""

    def setUp(self):
        self.user, self.teacher, self.token = create_teacher_with_login('insight_teacher@example.com')
        self.student = create_student(self.teacher, name='Alice Smith')

    def test_generated_ai_insight_str_representation(self):
        insight = GeneratedAIInsight.objects.create(
            student=self.student,
            teacher=self.user,
            summary_text='Student demonstrates high engagement in visual tasks.'
        )
        expected_str = f"Insight for {self.student.name} generated by {self.user.username}"
        self.assertEqual(str(insight), expected_str)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test iep_management.tests.GeneratedAIInsightModelTests`
Expected: FAIL with `AttributeError: 'StudentProfile' object has no attribute 'studentName'`

- [ ] **Step 3: Fix `GeneratedAIInsight.__str__` in `iep_management/models.py`**

In `neuropath-backend/iep_management/models.py` (lines 101-102):

Replace:
```python
    def __str__(self):
        return f"Insight for {self.student.studentName} generated by {self.teacher.username}"
```

With:
```python
    def __str__(self):
        return f"Insight for {self.student.name} generated by {self.teacher.username}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test iep_management.tests.GeneratedAIInsightModelTests`
Expected: PASS (1 test OK)

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/models.py neuropath-backend/iep_management/tests.py
git commit -m "fix(iep_management): reference correct StudentProfile name field in GeneratedAIInsight.__str__"
```

---

## Task 3: Fix `TeachingStrategyViewSet.create` Field Traversal

`TeachingStrategyViewSet.create` attempts to access `serializer.validated_data['student']` when `strategyContent` is not provided. Since `TeachingStrategySerializer` does not define a `student` field (it defines `iep_goal`), accessing `['student']` raises an unhandled `KeyError` resulting in a 500 error.

**Files:**
- Modify: `neuropath-backend/resources/views.py:985-996`
- Test: `neuropath-backend/resources/tests.py`

**Interfaces:**
- Consumes: `POST /api/resources/teaching-strategies/` with JSON payload `{'iep_goal': <int>, 'title': <str>, 'strategyContent': <str optional>}`
- Produces: HTTP 201 with generated or provided `strategyContent` saved on the `TeachingStrategy` record

- [ ] **Step 1: Write the failing regression tests**

In `neuropath-backend/resources/tests.py`, add a test class `TeachingStrategyCreateTests`:

```python
class TeachingStrategyCreateTests(TestCase):
    """Regression tests for TeachingStrategyViewSet.create endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user1, self.teacher1, self.token1 = create_teacher_with_login('strat_owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('strat_other@example.com')

        self.student1 = create_student(
            self.teacher1,
            name='Student One',
            learning_style='Visual',
            interests='Dinosaurs',
            sensory_preferences='Low noise'
        )
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            goalName='Math Goal',
            target_metric='Count to 20',
            annual_goal='Master basic counting'
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_teaching_strategy_with_blank_content_generates_strategy(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Visual Counting Strategy',
            'strategyContent': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        self.assertTrue(len(response.data['data']['strategyContent']) > 0)
        self.assertIn('Visual', response.data['data']['strategyContent'])
        self.assertTrue(
            TeachingStrategy.objects.filter(
                iep_goal=self.goal1,
                title='Visual Counting Strategy'
            ).exists()
        )

    def test_create_teaching_strategy_with_explicit_content(self):
        self._auth(self.token1)
        custom_content = "This is custom actionable strategy content that exceeds ten characters."
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Custom Strategy',
            'strategyContent': custom_content
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['strategyContent'], custom_content)

    def test_create_teaching_strategy_with_foreign_goal_rejected(self):
        self._auth(self.token2)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Hijack Strategy',
            'strategyContent': 'Some valid content here.'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_teaching_strategy_invalid_data_rejected(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': 999999,
            'title': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test resources.tests.TeachingStrategyCreateTests`
Expected: FAIL on `test_create_teaching_strategy_with_blank_content_generates_strategy` with `KeyError: 'student'` (HTTP 500)

- [ ] **Step 3: Fix `TeachingStrategyViewSet.create` in `resources/views.py`**

In `neuropath-backend/resources/views.py` (lines 985-996):

Replace:
```python
            if not serializer.validated_data.get('strategyContent'):
                student_profile = serializer.validated_data['student']
                title = serializer.validated_data['title']
                
                # NEW: Pass the entire student_profile object, not just the name string!
                generated_content = StrategyGenerationManagerService.generate_strategy_content(
                    title=title, 
                    student_profile=student_profile 
                )
                
                serializer.validated_data['strategyContent'] = generated_content
```

With:
```python
            if not serializer.validated_data.get('strategyContent'):
                iep_goal = serializer.validated_data.get('iep_goal')
                student_profile = iep_goal.iep.studentID
                title = serializer.validated_data['title']
                
                # Pass the student_profile object resolved from the IEP goal foreign key
                generated_content = StrategyGenerationManagerService.generate_strategy_content(
                    title=title, 
                    student_profile=student_profile 
                )
                
                serializer.validated_data['strategyContent'] = generated_content
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python manage.py test resources.tests.TeachingStrategyCreateTests`
Expected: PASS (4 tests OK)

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/resources/views.py neuropath-backend/resources/tests.py
git commit -m "fix(resources): resolve StudentProfile from iep_goal in TeachingStrategyViewSet.create"
```

---

## Task 4: Fix `LessonPlanViewSet.create` Payload Schema and Generation Flow

`LessonPlanViewSet.create` constructed an ad-hoc payload with `studentID` and `content` keys rather than `iep_goal` and `lessonContent`, causing `LessonPlanSerializer` validation to always fail with `{'iep_goal': ['This field is required.']}`.

**Files:**
- Modify: `neuropath-backend/resources/views.py:233-260`
- Test: `neuropath-backend/resources/tests.py`

**Interfaces:**
- Consumes: `POST /api/resources/lesson-plans/` with JSON payload `{'iep_goal': <int>, 'title': <str>, 'lessonContent': <str optional>, 'topic': <str optional>, 'status': <str optional>}`
- Produces: HTTP 201 with saved `LessonPlan` record linked to `iep_goal` and populated `lessonContent`

- [ ] **Step 1: Write the failing regression tests**

In `neuropath-backend/resources/tests.py`, add a test class `LessonPlanCreateTests`:

```python
import json
from .models import LessonPlan

class LessonPlanCreateTests(TestCase):
    """Regression tests for LessonPlanViewSet.create endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user1, self.teacher1, self.token1 = create_teacher_with_login('lp_owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('lp_other@example.com')

        self.student1 = create_student(self.teacher1, name='LP Student')
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            goalName='Reading Goal',
            target_metric='Read 50 words',
            annual_goal='Improve reading comprehension'
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_lesson_plan_with_blank_content_generates_payload(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Phonics Lesson',
            'topic': 'Phonics and Sound Blends'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        saved_plan = LessonPlan.objects.get(pk=response.data['data']['lessonID'])
        self.assertEqual(saved_plan.iep_goal, self.goal1)
        self.assertEqual(saved_plan.title, 'Phonics Lesson')
        self.assertTrue(len(saved_plan.lessonContent) > 0)
        # Content should be serialized JSON payload generated by LessonPlanManagerService
        parsed = json.loads(saved_plan.lessonContent)
        self.assertEqual(parsed.get('topic'), 'Phonics and Sound Blends')

    def test_create_lesson_plan_with_explicit_content(self):
        self._auth(self.token1)
        custom_content = "Pre-written lesson instructions step by step."
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Manual Lesson',
            'lessonContent': custom_content,
            'status': 'Draft'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        saved_plan = LessonPlan.objects.get(pk=response.data['data']['lessonID'])
        self.assertEqual(saved_plan.lessonContent, custom_content)
        self.assertEqual(saved_plan.status, 'Draft')

    def test_create_lesson_plan_with_foreign_goal_rejected(self):
        self._auth(self.token2)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Foreign Lesson'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_lesson_plan_invalid_data_rejected(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': 999999,
            'title': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python manage.py test resources.tests.LessonPlanCreateTests`
Expected: FAIL on `test_create_lesson_plan_with_blank_content_generates_payload` with HTTP 400 `{'iep_goal': ['This field is required.']}`

- [ ] **Step 3: Ensure top-level `import json` in `resources/views.py`**

In `neuropath-backend/resources/views.py` (top imports), ensure `import json` is present alongside `import io, re, uuid`.

- [ ] **Step 4: Update `LessonPlanViewSet.create` in `resources/views.py`**

In `neuropath-backend/resources/views.py`, update `LessonPlanViewSet.create`:

Replace:
```python
    def create(self, request, *args, **kwargs):
        # Action: "Generate Lesson Plan"
        student_id = request.data.get('studentID')
        title = request.data.get('title', 'AI Generated Lesson')
        topic = request.data.get('topic', 'General Learning')
        
        # Trigger the workflow manager
        generated_content = LessonPlanManagerService.generate_lesson_payload(student_id, topic)
        
        # Package the data for the database
        payload = {
            'studentID': student_id,
            'title': title,
            'content': generated_content,
            'status': 'Generated'
        }
        
        # Validate and Save Record
        serializer = self.get_serializer(data=payload)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Lesson Plan generated and saved successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

With:
```python
    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Generate / Save Lesson Plan]"""
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            teacher = get_teacher_for_user(request.user)
            if not _goal_owned_by_teacher(serializer.validated_data.get('iep_goal'), teacher):
                return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)

            if not serializer.validated_data.get('lessonContent'):
                iep_goal = serializer.validated_data.get('iep_goal')
                student_id = iep_goal.iep.studentID.pk
                topic = request.data.get('topic') or serializer.validated_data.get('title') or 'General Learning'

                generated_content = LessonPlanManagerService.generate_lesson_payload(student_id, topic)
                serializer.validated_data['lessonContent'] = (
                    json.dumps(generated_content)
                    if isinstance(generated_content, (dict, list))
                    else str(generated_content)
                )

            serializer.validated_data.setdefault('status', request.data.get('status', 'Generated'))
            self.perform_create(serializer)

            return Response({
                "message": "Lesson Plan generated and saved successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python manage.py test resources.tests.LessonPlanCreateTests`
Expected: PASS (4 tests OK)

- [ ] **Step 6: Commit**

```bash
git add neuropath-backend/resources/views.py neuropath-backend/resources/tests.py
git commit -m "fix(resources): align LessonPlanViewSet.create with LessonPlanSerializer and iep_goal"
```

---

## Task 5: Full Test Suite Verification and Linting

Verify that all existing tests and new regression tests pass without regressions, and that ruff linting passes across the entire codebase.

**Files:**
- Test all: `neuropath-backend`

- [ ] **Step 1: Run full test suite**

Run: `python manage.py test`
Expected: PASS with 0 failures, 0 errors (73+ tests total across `iep_management`, `resources`, `tracking`, `users`)

- [ ] **Step 2: Run ruff lint check**

Run: `ruff check .`
Expected: `All checks passed!`

- [ ] **Step 3: Commit any final cleanup if necessary**

```bash
git status
```
(Clean working tree)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-issue-68-fix-crash-and-broken-endpoints.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
