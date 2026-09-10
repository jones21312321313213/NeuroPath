# AI Pipeline Resilience, IEP Factor Integration, and Goal Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide bulletproof AI generation fallback (Ollama -> Groq -> deterministic template), integrate 'Other special factor notes' as a first-class prompt/data driver, and ensure IEP goals are reliably synchronized and retrieved across Instructional Support tabs (Lesson Plans, Teaching Strategies, Visual Aids).

**Architecture:** Create a unified `AIEngineService` implementing a cascade provider pattern (local Ollama -> cloud Groq -> rule-based fallback). Upgrade `GenerateIEPGoalsFromIEPView` to incorporate `special_factor_notes`. Enhance `StandaloneIEPGoalViewSet` to auto-sync goals from `generatedDetails` and support `latest=true`. Align `ManageLessonPlans`, `ManageTeachingStrategies`, and `ManageVisualAids` goal selection interfaces.

**Tech Stack:** Python / Django REST Framework, Ollama, Groq Cloud API, React 18, Vite.

**Spec:** docs/superpowers/specs/2026-09-08-ai-pipeline-iep-synchronization-design.md

## Global Constraints
- Must maintain compatibility with existing PostgreSQL / Supabase and SQLite models (`IEPModel`, `IEPGoal`, `IEPObjectiveRow`, `GeneratedAIInsight`).
- Must not crash with 500 when Ollama or Groq is unreachable; must return graceful pedagogical content with clear status.
- Zero data loss for existing IEP documents or student profiles.

---

### Task 1: Resilient AI Engine (AIEngineService)

**Files:**
- Create: `neuropath-backend/iep_management/ai_engine.py`
- Create: `neuropath-backend/iep_management/tests/test_ai_engine.py`

**Interfaces:**
- Consumes: `settings.GROQ_API_KEY`, `ollama.chat`, `requests`
- Produces: `AIEngineService.generate_text(prompt, system_prompt, max_tokens, json_mode) -> tuple[str, str]`

- [ ] **Step 1: Write the test for AIEngineService**
Create `neuropath-backend/iep_management/tests/test_ai_engine.py`:
```python
from django.test import TestCase
from unittest.mock import patch
from iep_management.ai_engine import AIEngineService

class AIEngineServiceTestCase(TestCase):
    @patch('iep_management.ai_engine.AIEngineService._call_ollama')
    def test_ollama_primary_success(self, mock_ollama):
        mock_ollama.return_value = 'Ollama generated summary'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Ollama generated summary')
        self.assertEqual(provider, 'ollama')

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Connection refused'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_fallback_to_groq_when_ollama_fails(self, mock_groq, mock_ollama):
        mock_groq.return_value = 'Groq generated summary'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Groq generated summary')
        self.assertEqual(provider, 'groq')

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    def test_fallback_to_deterministic_template(self, mock_groq, mock_ollama):
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertTrue(len(content) > 0)
        self.assertEqual(provider, 'template_fallback')
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_ai_engine`
Expected: ModuleNotFoundError: No module named 'iep_management.ai_engine'

- [ ] **Step 3: Implement AIEngineService**
Create `neuropath-backend/iep_management/ai_engine.py`:
```python
import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class AIEngineService:
    OLLAMA_MODEL = 'llama3.2:3b'
    GROQ_MODEL = 'llama-3.1-8b-instant'
    GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

    @classmethod
    def _call_ollama(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        import ollama
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        kwargs = {'model': cls.OLLAMA_MODEL, 'messages': messages}
        if json_mode:
            kwargs['format'] = 'json'

        response = ollama.chat(**kwargs)
        return response['message']['content'].strip()

    @classmethod
    def _call_groq(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid GROQ_API_KEY not configured.')

        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': cls.GROQ_MODEL,
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': 0.3,
        }
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        res = requests.post(cls.GROQ_API_URL, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        data = res.json()
        return data['choices'][0]['message']['content'].strip()

    @classmethod
    def _deterministic_fallback(cls, prompt, json_mode=False):
        if json_mode:
            return json.dumps({
                'lesson_plans': [
                    {
                        'objective_focus': 'Foundational Skill Acquisition and Guided Practice',
                        'introduction': 'Orient the student using visual schedule cards and set clear behavioral expectations.',
                        'core_activity': 'Provide multi-sensory hands-on practice with structured teacher modeling and tactile manipulatives.',
                        'assessment': 'Check for 4 out of 5 correct independent trials with positive reinforcement.',
                        'materials_needed': ['Visual schedule board', 'Token reinforcement chart', 'Manipulative work kit']
                    }
                ]
            })
        return (
            'The learner demonstrates steady progress when provided with structured routines, '
            'visual prompts, and individualized pacing. Continuing with multimodal instructional strategies, '
            'frequent positive reinforcement, and planned sensory breaks will best support mastery across key learning targets.'
        )

    @classmethod
    def generate_text(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        try:
            content = cls._call_ollama(prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode)
            if content:
                return content, 'ollama'
        except Exception as e:
            logger.warning('Ollama call failed: %s. Attempting Groq fallback.', e)

        try:
            content = cls._call_groq(prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode)
            if content:
                return content, 'groq'
        except Exception as e:
            logger.warning('Groq call failed: %s. Falling back to deterministic template.', e)

        return cls._deterministic_fallback(prompt, json_mode=json_mode), 'template_fallback'
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_ai_engine`
Expected: Ran 3 tests in ... OK

- [ ] **Step 5: Commit**
```bash
git add neuropath-backend/iep_management/ai_engine.py neuropath-backend/iep_management/tests/test_ai_engine.py
git commit -m "feat: implement resilient AIEngineService with Ollama Groq and template fallback"
```

---

### Task 2: Wire AIEngineService into Student Insights and Integrate Special Factor Notes into IEP Goals

**Files:**
- Modify: `neuropath-backend/iep_management/services.py:1-38`
- Modify: `neuropath-backend/iep_management/views.py:463-660`
- Create: `neuropath-backend/iep_management/tests/test_insights_and_goals.py`

**Interfaces:**
- Consumes: `AIEngineService.generate_text`, request payload `special_factor_notes`
- Produces: `AIGenerationService.generate_and_save_summary`, `GenerateIEPGoalsFromIEPView` incorporating special factor notes

- [ ] **Step 1: Write test for Student Insights and Special Factor Notes in Goals**
Create `neuropath-backend/iep_management/tests/test_insights_and_goals.py`:
```python
from django.test import TestCase
from unittest.mock import patch
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.services import AIGenerationService
from iep_management.views import GenerateIEPGoalsFromIEPView

class InsightsAndGoalsTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Alice', email='alice@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(
            name='Leo Valdez',
            age=10,
            diagnosis='ASD Level 1',
            teacher=self.teacher,
            support_needs='Sensory breaks',
            assessmentResult='Age appropriate'
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Communication difficulties',
            learning_barriers='Mild barrier',
            accommodations='Visual charts'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_and_save_summary_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('Synthesized student profile summary.', 'template_fallback')
        insight = AIGenerationService.generate_and_save_summary(self.student, self.teacher)
        self.assertIsNotNone(insight.pk)
        self.assertEqual(insight.summary_text, 'Synthesized student profile summary.')

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_annual_goal_includes_special_factor_notes(self, mock_ai):
        mock_ai.return_value = ('Leo will identify and articulate emotions using PECS across 4 of 5 opportunities.', 'template_fallback')
        view = GenerateIEPGoalsFromIEPView()
        goal_text = view._generate_annual_goal(
            student_name=self.student.name,
            difficulty='Communication difficulties',
            assistive_tech='PECS',
            accommodations='Visual schedule',
            facilitators='SNED Teacher',
            goal_area='Communication Skills',
            teacher_prompt='Focus on emotion recognition',
            special_factor_notes='Sensitive to sudden auditory alarms and requires low-stimulus environments'
        )
        self.assertTrue(len(goal_text) > 0)
        called_prompt = mock_ai.call_args[0][0]
        self.assertIn('Sensitive to sudden auditory alarms', called_prompt)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_insights_and_goals`
Expected: Failure in `_generate_annual_goal`

- [ ] **Step 3: Update AIGenerationService and GenerateIEPGoalsFromIEPView**
In `neuropath-backend/iep_management/services.py`:
```python
        try:
            generated_summary, _ = AIEngineService.generate_text(
                prompt=prompt,
                system_prompt='You output only the requested summary paragraph. No conversational filler.',
                max_tokens=350
            )
            new_insight = GeneratedAIInsight.objects.create(
                student=student_instance,
                teacher=teacher_instance, 
                summary_text=generated_summary
            )
            return new_insight
        except Exception as e:
            raise Exception(f"AI Generation failed: {str(e)}")
```
In `neuropath-backend/iep_management/views.py`:
- In `GenerateIEPGoalsFromIEPView.post`:
  Extract `special_factor_notes = data.get('special_factor_notes') or generated_details.get('specialFactorNotes', '')`
  Pass `special_factor_notes=special_factor_notes` into `_generate_annual_goal` and `_generate_objective_rows`.
  Update `_generate_annual_goal`:
  Include `f"Special Factors / Behavioral and Sensory Notes: {special_factor_notes}\n" if special_factor_notes else ""` in prompt, and invoke `AIEngineService.generate_text(prompt, max_tokens=200)` instead of `CustomLlamaService`.

- [ ] **Step 4: Run test to verify it passes**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_insights_and_goals`
Expected: Ran 2 tests in ... OK

- [ ] **Step 5: Commit**
```bash
git add neuropath-backend/iep_management/services.py neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_insights_and_goals.py
git commit -m "feat: connect AIEngineService to student insights and integrate special factor notes into goals"
```

---

### Task 3: Wire AIEngineService into Instructional Support (Lesson Plans and Teaching Strategies)

**Files:**
- Modify: `neuropath-backend/resources/services.py:1-172`
- Create: `neuropath-backend/resources/tests/test_instructional_ai.py`

**Interfaces:**
- Consumes: `AIEngineService.generate_text`, `IEPGoal`, `IEPModel.generatedDetails`
- Produces: `TeachingStrategyGenerationService.generate_and_save_strategy`, `LessonPlanGenerationService.execute_generation`

- [ ] **Step 1: Write test for Lesson Plan and Teaching Strategy AI generation**
Create `neuropath-backend/resources/tests/test_instructional_ai.py`:
```python
from django.test import TestCase
from unittest.mock import patch
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal
from resources.services import TeachingStrategyGenerationService, LessonPlanGenerationService

class InstructionalAIServiceTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Bob', email='bob@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(name='Maya Lin', age=8, teacher=self.teacher)
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Attention and sensory regulation',
            generatedDetails={'specialFactorNotes': 'Benefits from fidget tools and auditory noise-canceling headphones'}
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            subject_category='Behavioral Skills',
            annual_goal='Maya will remain engaged in classroom tasks for 15 minutes.'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_teaching_strategy_generation_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('**Core Strategy Overview:** Structured sensory intervals.', 'template_fallback')
        strategy = TeachingStrategyGenerationService.generate_and_save_strategy(self.goal, self.teacher)
        self.assertIsNotNone(strategy.pk)
        self.assertIn('Structured sensory intervals', strategy.strategyContent)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_lesson_plan_generation_uses_ai_engine(self, mock_ai):
        mock_ai.return_value = ('{"lesson_plans": [{"objective_focus": "Task Completion", "introduction": "Intro", "core_activity": "Core", "assessment": "Check", "materials_needed": ["Timer"]}]}', 'template_fallback')
        data = LessonPlanGenerationService.execute_generation(self.goal.pk, self.teacher)
        self.assertIn('lesson_plans', data)
        self.assertEqual(len(data['lesson_plans']), 1)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python neuropath-backend/manage.py test resources.tests.test_instructional_ai`
Expected: Failure

- [ ] **Step 3: Update TeachingStrategyGenerationService and LessonPlanGenerationService**
In `neuropath-backend/resources/services.py`:
- Import `from iep_management.ai_engine import AIEngineService`
- In `TeachingStrategyGenerationService.generate_and_save_strategy`:
  Extract `special_notes = (iep.generatedDetails or {}).get('specialFactorNotes', '')`
  Include special notes in prompt.
  Replace `ollama.chat()` with `AIEngineService.generate_text(prompt=prompt, temperature=0.25)`.
- In `LessonPlanGenerationService.execute_generation`:
  Replace `ollama.chat(..., format='json')` with `AIEngineService.generate_text(prompt=prompt, json_mode=True)`.
  Parse JSON safely with fallback to `_deterministic_fallback(prompt, json_mode=True)`.

- [ ] **Step 4: Run test to verify it passes**
Run: `python neuropath-backend/manage.py test resources.tests.test_instructional_ai`
Expected: Ran 2 tests in ... OK

- [ ] **Step 5: Commit**
```bash
git add neuropath-backend/resources/services.py neuropath-backend/resources/tests/test_instructional_ai.py
git commit -m "feat: rewire lesson plan and teaching strategy generation through AIEngineService"
```

---

### Task 4: Backend IEP Goal Synchronization and Retrieval Enhancement

**Files:**
- Modify: `neuropath-backend/iep_management/views.py:245-265`
- Create: `neuropath-backend/iep_management/tests/test_goal_sync.py`

**Interfaces:**
- Consumes: `GET /api/iep/goals/?student_id=<id>&latest=true`, `_sync_goals_from_generated_details`
- Produces: Synced and filtered `IEPGoal` queryset for Instructional Support tools

- [ ] **Step 1: Write test for StandaloneIEPGoalViewSet synchronization**
Create `neuropath-backend/iep_management/tests/test_goal_sync.py`:
```python
from django.test import TestCase
from rest_framework.test import APIClient
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal

class GoalSyncTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = Teacher.objects.create(name='Teacher Clara', email='clara@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(name='Sammy Davis', age=9, teacher=self.teacher)
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            generatedDetails={
                'learnerGoals': [
                    {
                        'type': 'Care Skills',
                        'annualGoal': 'Sammy will wash hands independently with visual cue.',
                        'rows': [{'objective': 'Turn on water'}]
                    }
                ]
            }
        )

    def test_query_goals_by_student_with_latest_syncs_and_returns_goals(self):
        from django.contrib.auth.models import User
        auth_user = User.objects.create_user(username='clara', email='clara@test.com', password='pw')
        self.client.force_authenticate(user=auth_user)

        self.assertEqual(IEPGoal.objects.filter(iep=self.iep).count(), 0)

        url = f'/api/iep/goals/?student_id={self.student.pk}&latest=true'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['annual_goal'], 'Sammy will wash hands independently with visual cue.')
        self.assertEqual(IEPGoal.objects.filter(iep=self.iep).count(), 1)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_goal_sync`
Expected: AssertionError: 0 != 1

- [ ] **Step 3: Update StandaloneIEPGoalViewSet in iep_management/views.py**
In `neuropath-backend/iep_management/views.py`:
Update `StandaloneIEPGoalViewSet.get_queryset`:
```python
    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return IEPGoal.objects.none()

        student_id = self.request.query_params.get('student_id')
        iep_id = self.request.query_params.get('iep')
        latest = self.request.query_params.get('latest') == 'true'

        if student_id:
            try:
                student = StudentProfile.objects.get(pk=student_id, teacher=teacher)
            except StudentProfile.DoesNotExist:
                return IEPGoal.objects.none()

            from resources.views import _latest_saved_iep_for_student, _sync_goals_from_generated_details
            latest_iep = _latest_saved_iep_for_student(student)
            if latest_iep:
                _sync_goals_from_generated_details(latest_iep)

            if latest:
                if not latest_iep:
                    return IEPGoal.objects.none()
                return IEPGoal.objects.filter(iep=latest_iep).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')

            return IEPGoal.objects.filter(iep__studentID=student).select_related('iep__studentID').prefetch_related('objective_rows').order_by('goalID')

        if iep_id:
            return IEPGoal.objects.filter(iep__iepID=iep_id, iep__studentID__teacher=teacher).prefetch_related('objective_rows')

        return IEPGoal.objects.filter(iep__studentID__teacher=teacher).select_related('iep__studentID').prefetch_related('objective_rows')
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python neuropath-backend/manage.py test iep_management.tests.test_goal_sync`
Expected: Ran 1 test in ... OK

- [ ] **Step 5: Commit**
```bash
git add neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests/test_goal_sync.py
git commit -m "feat: enable auto-sync and latest=true filtering in StandaloneIEPGoalViewSet"
```

---

### Task 5: Frontend IEP Form - First-Class Special Factor Notes and Custom Goal Add

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`

**Interfaces:**
- Consumes: User inputs for `specialFactorNotes`, `iepAPI.generateGoalsFromIep`
- Produces: API request with `special_factor_notes`, display in View and Edit modes, manual goal addition

- [ ] **Step 1: Ensure specialFactorNotes is passed into generateGoalsFromIep and saved**
In `neuropath-frontend/src/pages/IepGenerationPage.jsx`:
In `handleGenerateFinalIep`:
Pass `special_factor_notes: form.specialFactorNotes` in the payload to `iepAPI.generateGoalsFromIep`.
Ensure `form.specialFactorNotes` is saved inside `generatedDetails` during `iepAPI.save` and `iepAPI.update`.

- [ ] **Step 2: Display Special Factor Notes in View and Edit IEP**
In the read-only preview of `IepGenerationPage.jsx`:
Render an `InfoBlock title="Other Special Factor Notes"` under Considerations of Special Factors when `details?.specialFactorNotes` or `details?.special_factor_notes` exists.
In Edit mode, ensure the `<TextAreaField label="Other special factor notes" ... />` allows updating notes and saves them to `generatedDetails`.

- [ ] **Step 3: Add Manual "+ Add Custom Goal" Option in Section C**
In Step 2 (Section C) of `IepGenerationPage.jsx`:
Add an expandable "+ Add Goal Manually" section allowing teachers to define a goal area, annual goal text, and objective rows directly, which calls `iepAPI.saveGoal` to ensure goals can be created even without AI.

- [ ] **Step 4: Run frontend tests and build check**
Run: `npm run build` in `neuropath-frontend`
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add neuropath-frontend/src/pages/IepGenerationPage.jsx
git commit -m "feat: integrate special factor notes into IEP generation, viewing, and manual goal entry"
```

---

### Task 6: Frontend Instructional Support Tabs Goal Alignment and End-to-End Verification

**Files:**
- Modify: `neuropath-frontend/src/pages/ManageVisualAids.jsx:200-210`
- Modify: `neuropath-frontend/src/pages/ManageLessonPlans.jsx:340-365`
- Modify: `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx:240-255`

**Interfaces:**
- Consumes: `iepAPI.listLatestGoalsByStudent(studentId)`
- Produces: Reliable goal selection and instructional generation across all 3 tools

- [ ] **Step 1: Update ManageVisualAids.jsx to use listLatestGoalsByStudent**
In `neuropath-frontend/src/pages/ManageVisualAids.jsx`:
Replace `iepAPI.listGoalsByStudent(selectedStudent.studentID)` with:
`iepAPI.listLatestGoalsByStudent(selectedStudent.studentID).catch(() => iepAPI.listGoalsByStudent(selectedStudent.studentID))`
Ensure goal rendering extracts:
`goalArea = g.subject_category || g.goalName || 'General'`
`annualGoal = g.annual_goal || g.goalName || 'Saved goal'`

- [ ] **Step 2: Standardize goal selection fallback in Lesson Plans and Teaching Strategies**
Verify `ManageLessonPlans.jsx` and `ManageTeachingStrategies.jsx` correctly render the goals synced from `latest=true`.

- [ ] **Step 3: Run full backend test suite**
Run: `python neuropath-backend/manage.py test`
Expected: OK (all tests passing)

- [ ] **Step 4: Run full frontend test suite / build**
Run: `npm run build` in `neuropath-frontend`
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add neuropath-frontend/src/pages/ManageVisualAids.jsx neuropath-frontend/src/pages/ManageLessonPlans.jsx neuropath-frontend/src/pages/ManageTeachingStrategies.jsx
git commit -m "fix: standardize latest IEP goal retrieval across all classroom tools"
```
