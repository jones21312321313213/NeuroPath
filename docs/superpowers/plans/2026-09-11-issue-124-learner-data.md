# Learner Data Privacy (RA 10173) Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Philippine Republic Act 10173 (Data Privacy Act of 2012) compliance for minors with Autism Spectrum Disorder (ASD) by implementing verifiable parental consent tracking, role-based access restrictions, and strict PII anonymization across all AI generation pipelines (Groq, Ollama, and Pollinations AI).
**Architecture:** Introduce RA 10173 consent fields to `StudentProfile` in PostgreSQL, construct a centralized `PrivacySanitizerService` to scrub PII and replace names with generic educational tokens, enforce consent gating and teacher ownership across all AI endpoints, and integrate consent controls into React student profiling and IEP generation pages.
**Tech Stack:** Django 6 / Django REST Framework, PostgreSQL, Python, React 19, Vitest, Testing Library, Tailwind CSS.
---

## Global Constraints
- Target minors are elementary learners with Autism Spectrum Disorder (ASD) in Region VII, Philippines.
- Under RA 10173, processing sensitive personal information of minors requires explicit, verifiable parental/guardian consent.
- Automated AI processing (Groq LLM, Ollama, Pollinations AI) must be strictly gated behind verified parental consent.
- No Personally Identifiable Information (real names, guardian names, birthdates, contact info) may ever be transmitted in prompts or GET/POST query paths to external AI providers.
- Backward compatibility: Existing student profiles without consent must default to `parental_consent_obtained=False` without failing existing non-AI read operations.

---

### Task 1: Database Schema & Model Validation for RA 10173 Consent

**Files:**
- Modify: `neuropath-backend/users/models.py`
- Modify: `neuropath-backend/users/serializers.py`
- Create: `neuropath-backend/users/migrations/0002_studentprofile_ra10173_consent.py`
- Create: `neuropath-backend/iep_management/tests/test_privacy_compliance.py`

- [x] **Step 1: Write model & serializer tests for RA 10173 consent fields**
Create `neuropath-backend/iep_management/tests/test_privacy_compliance.py`:
```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from users.models import Teacher, StudentProfile
from users.serializers import StudentProfileSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()

class StudentConsentModelTestCase(TestCase):
    def setUp(self):
        self.teacher_user = User.objects.create_user(username='teacher_mary', email='mary@school.edu', password='password123')
        self.teacher = Teacher.objects.create(name='Mary Teacher', email='mary@school.edu', passwordHash='hash')

    def test_consent_fields_default_to_pending(self):
        student = StudentProfile.objects.create(
            name='Juan Dela Cruz',
            age=8,
            grade=2,
            teacher=self.teacher
        )
        self.assertFalse(student.parental_consent_obtained)
        self.assertIsNone(student.consent_date)
        self.assertEqual(student.guardian_name, '')
        self.assertEqual(student.guardian_relationship, 'Parent')

    def test_consent_validation_requires_guardian_and_date_when_obtained(self):
        serializer = StudentProfileSerializer(data={
            'name': 'Maria Santos',
            'age': 9,
            'grade': 3,
            'gender': 'Female',
            'parental_consent_obtained': True,
            'guardian_name': '',
            'consent_date': None
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('guardian_name', serializer.errors)
        self.assertIn('consent_date', serializer.errors)

    def test_valid_consent_data_persists(self):
        serializer = StudentProfileSerializer(data={
            'name': 'Maria Santos',
            'age': 9,
            'grade': 3,
            'gender': 'Female',
            'parental_consent_obtained': True,
            'guardian_name': 'Elena Santos',
            'guardian_relationship': 'Mother',
            'consent_date': '2026-09-11'
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
```

- [x] **Step 2: Add fields to `StudentProfile` in `users/models.py`**
Modify `neuropath-backend/users/models.py`:
```python
class StudentProfile(models.Model):
    studentID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacherID')

    # Basic student fields
    name = models.CharField(max_length=255, blank=True, default='')
    age = models.IntegerField(default=0)
    grade = models.IntegerField(default=0)
    gender = models.CharField(max_length=50, blank=True, default='')

    # RA 10173 (Data Privacy Act of 2012) Minor Consent Fields
    parental_consent_obtained = models.BooleanField(
        default=False,
        help_text="Explicit parental or legal guardian consent obtained under RA 10173"
    )
    consent_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when parental/guardian consent was verified"
    )
    guardian_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Full legal name of consenting parent or legal guardian"
    )
    guardian_relationship = models.CharField(
        max_length=100,
        blank=True,
        default='Parent',
        help_text="Relationship of consenting guardian to minor (e.g. Mother, Father, Legal Guardian)"
    )

    # Existing profile fields...
    asdBackground = models.TextField(blank=True, default='')
    preferences = models.TextField(blank=True, default='')
    assessmentResult = models.TextField(blank=True, default='')
    profileStatus = models.BooleanField(default=True)
    diagnosis = models.TextField(blank=True, default='')
    support_needs = models.TextField(blank=True, default='')
    learning_style = models.CharField(max_length=100, blank=True, default='')
    interests = models.TextField(blank=True, default='')
    sensory_preferences = models.TextField(blank=True, default='')
    profileDetails = models.JSONField(blank=True, default=dict)

    def __str__(self):
        return self.name or f"Student {self.studentID}"
```

- [x] **Step 3: Update `users/serializers.py` with consent validation**
Modify `StudentProfileSerializer.validate`:
```python
    def validate(self, data):
        # Existing profileDetails validation...
        profile_details = data.get('profileDetails') or {}
        if profile_details:
            # existing checks...
            pass

        # RA 10173 Consent Validation
        consent_obtained = data.get('parental_consent_obtained')
        if consent_obtained:
            guardian_name = (data.get('guardian_name') or '').strip()
            consent_date = data.get('consent_date')
            errors = {}
            if not guardian_name:
                errors['guardian_name'] = 'Parent or legal guardian name is required when consent is marked as obtained.'
            if not consent_date:
                errors['consent_date'] = 'Consent verification date is required when consent is marked as obtained.'
            if errors:
                raise serializers.ValidationError(errors)

        return data
```

- [x] **Step 4: Generate and apply database migration**
Run:
```bash
./venv/bin/python manage.py makemigrations users
./venv/bin/python manage.py migrate
```

- [x] **Step 5: Run tests to verify Task 1**
Run:
```bash
./venv/bin/python manage.py test iep_management.tests.test_privacy_compliance.StudentConsentModelTestCase --keepdb
```

---

### Task 2: Backend Privacy Sanitizer Utility & Unit Tests

**Files:**
- Create: `neuropath-backend/iep_management/privacy_utils.py`
- Modify: `neuropath-backend/iep_management/tests/test_privacy_compliance.py`

- [x] **Step 1: Write unit tests for privacy sanitization**
Add to `neuropath-backend/iep_management/tests/test_privacy_compliance.py`:
```python
from iep_management.privacy_utils import (
    anonymize_student_context,
    scrub_pii_from_text,
    verify_ra10173_consent,
    ConsentRequiredException,
)

class PrivacyUtilsTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(name='Teacher Bob', email='bob@school.edu', passwordHash='hash')
        self.student_consented = StudentProfile.objects.create(
            name='Angel Locsin',
            age=7,
            grade=1,
            gender='Female',
            teacher=self.teacher,
            parental_consent_obtained=True,
            guardian_name='Angelo Locsin',
            consent_date='2026-09-01'
        )
        self.student_unconsented = StudentProfile.objects.create(
            name='Jose Rizal',
            age=10,
            grade=4,
            gender='Male',
            teacher=self.teacher,
            parental_consent_obtained=False
        )

    def test_anonymize_student_context_strips_name(self):
        anon_name = anonymize_student_context(self.student_consented)
        self.assertNotIn('Angel', anon_name)
        self.assertNotIn('Locsin', anon_name)
        self.assertIn('Learner', anon_name)
        self.assertIn('Grade 1', anon_name)

    def test_scrub_pii_from_free_text(self):
        text = "Angel Locsin has difficulty in reading. Her guardian Angelo Locsin noted distress."
        scrubbed = scrub_pii_from_text(text, pii_terms=['Angel Locsin', 'Angel', 'Locsin', 'Angelo Locsin'])
        self.assertNotIn('Angel', scrubbed)
        self.assertNotIn('Locsin', scrubbed)
        self.assertIn('The learner', scrubbed)

    def test_verify_ra10173_consent_raises_for_unconsented_student(self):
        with self.assertRaises(ConsentRequiredException):
            verify_ra10173_consent(self.student_unconsented)

    def test_verify_ra10173_consent_passes_for_consented_student(self):
        try:
            verify_ra10173_consent(self.student_consented)
        except ConsentRequiredException:
            self.fail("verify_ra10173_consent raised ConsentRequiredException unexpectedly!")
```

- [x] **Step 2: Implement `iep_management/privacy_utils.py`**
Create `neuropath-backend/iep_management/privacy_utils.py`:
```python
import re
from typing import Iterable, Optional

class ConsentRequiredException(Exception):
    """Raised when an action requiring RA 10173 minor consent is attempted without valid consent."""
    pass

def anonymize_student_context(student_instance) -> str:
    """
    Returns a generic educational descriptor for the student, strictly excluding
    real names, birthdates, and direct PII.
    """
    if not student_instance:
        return "Learner"
    grade = getattr(student_instance, 'grade', 0)
    gender = getattr(student_instance, 'gender', '')
    
    descriptor_parts = ["Learner"]
    if grade and grade > 0:
        descriptor_parts.append(f"(Grade {grade})")
    elif grade == 0:
        descriptor_parts.append("(Kindergarten)")
    
    return " ".join(descriptor_parts)

def scrub_pii_from_text(text: str, pii_terms: Optional[Iterable[str]] = None, replacement: str = "The learner") -> str:
    """
    Scans free-text content (e.g., barriers, teacher prompt, notes) and replaces
    occurrences of specific student/guardian names with non-identifying tokens.
    """
    if not text:
        return ""
    
    scrubbed = str(text)
    if not pii_terms:
        return scrubbed

    sorted_terms = sorted([t.strip() for t in pii_terms if t and len(t.strip()) > 1], key=len, reverse=True)
    
    for term in sorted_terms:
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        scrubbed = pattern.sub(replacement, scrubbed)
        
    return scrubbed

def verify_ra10173_consent(student_instance):
    """
    Validates that explicit parental/guardian consent has been recorded under
    Republic Act 10173 before external AI processing is initiated.
    """
    if not student_instance:
        raise ConsentRequiredException("Student record is missing.")
        
    consent_obtained = getattr(student_instance, 'parental_consent_obtained', False)
    if not consent_obtained:
        student_id = getattr(student_instance, 'pk', getattr(student_instance, 'studentID', 'Unknown'))
        raise ConsentRequiredException(
            f"RA 10173 Parental/Guardian Consent has not been recorded for student ID {student_id}. "
            "Automated AI processing and external data transmission are prohibited until consent is verified."
        )
    return True
```

- [x] **Step 3: Run tests to verify Task 2**
Run:
```bash
./venv/bin/python manage.py test iep_management.tests.test_privacy_compliance.PrivacyUtilsTestCase --keepdb
```

---

### Task 3: AI Pipeline Anonymization & Consent Gating (Insights, Goals, Visual Aids, Lesson Plans)

**Files:**
- Modify: `neuropath-backend/iep_management/services.py`
- Modify: `neuropath-backend/iep_management/views.py`
- Modify: `neuropath-backend/resources/services.py`
- Modify: `neuropath-backend/resources/views.py`
- Modify: `neuropath-backend/iep_management/tests/test_privacy_compliance.py`

- [x] **Step 1: Write integration tests for AI pipelines**
Add to `neuropath-backend/iep_management/tests/test_privacy_compliance.py`:
```python
from unittest.mock import patch
from rest_framework.test import APIClient
from iep_management.models import IEPModel, IEPGoal

class AIPipelinePrivacyTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='alice', email='alice@school.edu', password='pw')
        self.teacher = Teacher.objects.create(name='Alice Teacher', email='alice@school.edu', passwordHash='pw')
        self.client.force_authenticate(user=self.user)

        self.student_consented = StudentProfile.objects.create(
            name='Marco Polo',
            age=8,
            grade=2,
            teacher=self.teacher,
            parental_consent_obtained=True,
            guardian_name='Niccolo Polo',
            consent_date='2026-09-01'
        )
        self.student_unconsented = StudentProfile.objects.create(
            name='Ferdinand Magellan',
            age=9,
            grade=3,
            teacher=self.teacher,
            parental_consent_obtained=False
        )
        self.iep_consented = IEPModel.objects.create(
            studentID=self.student_consented,
            version=1,
            difficulties='Difficulty in communicating'
        )
        self.iep_unconsented = IEPModel.objects.create(
            studentID=self.student_unconsented,
            version=1,
            difficulties='Difficulty in communicating'
        )

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_ai_insight_blocked_without_consent(self, mock_ai):
        response = self.client.post(f'/api/iep/generate-insight/{self.student_unconsented.studentID}/')
        self.assertEqual(response.status_code, 403)
        self.assertIn('RA 10173', response.data.get('error', ''))
        mock_ai.assert_not_called()

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_ai_insight_sanitizes_pii(self, mock_ai):
        mock_ai.return_value = ('Safe synthesized summary.', 'template_fallback')
        response = self.client.post(f'/api/iep/generate-insight/{self.student_consented.studentID}/')
        self.assertEqual(response.status_code, 201)
        mock_ai.assert_called_once()
        called_prompt = mock_ai.call_args[1].get('prompt') or mock_ai.call_args[0][0]
        self.assertNotIn('Marco', called_prompt)
        self.assertNotIn('Polo', called_prompt)
        self.assertIn('Learner (Grade 2)', called_prompt)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_goals_from_iep_blocked_without_consent(self, mock_ai):
        payload = {
            'iep_id': self.iep_unconsented.iepID,
            'generatedDetails': {'special_factors_considerations': [{'difficulty': 'Speech'}]}
        }
        response = self.client.post('/api/iep/generate-goals-from-iep/', payload, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertIn('RA 10173', response.data.get('error', ''))
        mock_ai.assert_not_called()

    @patch('resources.views.VisualAidGeneratorService.fetch_image_from_pollinations')
    def test_generate_visual_aid_prompt_excludes_student_name(self, mock_fetch):
        mock_fetch.return_value = (b'bytes', 'image/jpeg', 'https://image.pollinations.ai/prompt/test')
        goal = IEPGoal.objects.create(iep=self.iep_consented, annual_goal='Learn colors', goalName='Colors')
        response = self.client.post('/api/resources/generate-visual-aid/', {
            'iep_goal_id': goal.pk,
            'category': 'Visual'
        })
        self.assertEqual(response.status_code, 200)
        mock_fetch.assert_called_once()
        prompt_arg = mock_fetch.call_args[0][0]
        self.assertNotIn('Marco', prompt_arg)
        self.assertNotIn('Polo', prompt_arg)
        self.assertIn('elementary learner', prompt_arg)
```

- [x] **Step 2: Update `iep_management/services.py`**
In `AIGenerationService.generate_and_save_summary`:
```python
from .privacy_utils import anonymize_student_context, scrub_pii_from_text, verify_ra10173_consent

class AIGenerationService:
    @staticmethod
    def generate_and_save_summary(student_instance, teacher_instance):
        verify_ra10173_consent(student_instance)

        student_desc = anonymize_student_context(student_instance)
        pii_tokens = [getattr(student_instance, 'name', ''), getattr(student_instance, 'guardian_name', '')]
        
        scrubbed_support = scrub_pii_from_text(getattr(student_instance, 'support_needs', 'N/A'), pii_tokens)
        scrubbed_assessment = scrub_pii_from_text(getattr(student_instance, 'assessmentResult', 'No recent assessment data.'), pii_tokens)
        
        prompt = f"""
        You are an expert Special Education Specialist. Write a concise, professional summary for a student's profile.
        Do NOT list strengths and challenges separately. Synthesize the information into a single, cohesive summary paragraph.

        Student Profile Data:
        - Learner: {student_desc}
        - Diagnosis/Disability: {getattr(student_instance, 'diagnosis', 'N/A')}
        - Assessment Result: {scrubbed_assessment}
        - Support Needs: {scrubbed_support}
        - Learning Style: {getattr(student_instance, 'learning_style', 'N/A')}
        """
```

- [x] **Step 3: Update `iep_management/views.py`**
1. In `generate_ai_insight(request, student_id)`:
   * Verify ownership: `teacher = get_teacher_for_user(request.user)`. If `student.teacher != teacher`, return 404.
   * Catch `ConsentRequiredException` and return `Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)`.
2. In `GenerateIEPGoalsFromIEPView`:
   * Retrieve `iep = get_object_or_404(IEPModel, pk=iep_id)`.
   * Verify ownership: `if iep.studentID.teacher != teacher: return 404`.
   * Enforce consent: `verify_ra10173_consent(iep.studentID)`.
   * Use `anonymize_student_context(iep.studentID)` instead of raw `student_name`.
   * Scrub PII from `special_factor_notes` and `teacher_prompt`.
3. In `GenerateIEPGoalAPIView`:
   * Replace `student_context` student name with generic descriptor `"Learner"`.

- [x] **Step 4: Update `resources/services.py` and `resources/views.py`**
1. In `TeachingStrategyGenerationService.generate_and_save_strategy`:
   * Call `verify_ra10173_consent(student)`.
   * Replace `- Name: {getattr(student, 'name', 'The student')}` with `- Learner: {anonymize_student_context(student)}`.
2. In `LessonPlanGenerationService.execute_generation`:
   * Call `verify_ra10173_consent(student)`.
   * Replace `- Name: {getattr(student, 'name', 'The student')}` with `- Learner: {anonymize_student_context(student)}`.
3. In `VisualAidGeneratorService.build_prompt` (`resources/views.py`):
   * Remove `student_name` from prompt. Change `"Educational visual aid for a student named {student_name}"` to `"Educational visual aid for an elementary learner"`.
4. In `GenerateVisualAidAPIView` & `GenerateLessonPlanAPIView`:
   * Verify `verify_ra10173_consent(target_goal.iep.studentID)`. Return 403 on `ConsentRequiredException`.

- [x] **Step 5: Run backend tests to verify Task 3**
Run:
```bash
./venv/bin/python manage.py test iep_management.tests.test_privacy_compliance --keepdb
./venv/bin/python manage.py test iep_management.tests.test_insights_and_goals --keepdb
./venv/bin/python manage.py test resources.tests.test_instructional_ai --keepdb
```

---

### Task 4: Frontend RA 10173 Consent Integration & UI Gating

**Files:**
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.jsx`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx`

- [x] **Step 1: Add frontend tests for consent capture & AI gating**
Modify `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx` to test:
* Form contains RA 10173 consent checkbox and inputs.
* Submitting payload includes `parental_consent_obtained`, `guardian_name`, `guardian_relationship`, `consent_date`.

Modify `neuropath-frontend/src/pages/StudentProfiling/StudentInsightsTab.test.jsx`:
* When `student.parental_consent_obtained` is `false`, button "Analyze & Generate AI Insight" is disabled and warning callout about RA 10173 is visible.

- [x] **Step 2: Add RA 10173 Consent UI to `CreateStudentProfile.jsx` & `UpdateStudentProfile.jsx`**
* Add fields to `initialFormState`:
  ```javascript
  parentalConsentObtained: false,
  consentDate: new Date().toISOString().split("T")[0],
  guardianName: "",
  guardianRelationship: "Parent",
  ```
* Render a styled card in Step 1:
  **"Republic Act 10173 (Data Privacy Act of 2012) Compliance"**
  * Checkbox: "Parental/Guardian Consent has been verified and obtained for this learner."
  * Conditional inputs when checked:
    * Guardian Full Name (required)
    * Guardian Relationship (e.g., Parent, Mother, Father, Legal Guardian)
    * Consent Verification Date (required)
* Include fields in outgoing API `payload`.

- [x] **Step 3: Update `ViewSelectedStudentProfile.jsx` with Consent Status Badge**
* Render Badge:
  * If `student.parental_consent_obtained`: Green badge `✅ RA 10173 Consent Verified (Guardian: {student.guardian_name})`
  * If not: Amber badge `⚠️ RA 10173 Consent Pending — AI Processing Restricted`

- [x] **Step 4: Update `StudentInsightsTab.jsx` & `IepGenerationPage.jsx`**
* In `StudentInsightsTab.jsx`:
  * If `!student?.parental_consent_obtained`:
    * Render `Callout` variant `"warning"`: `"RA 10173 Consent Required: Parental/guardian consent has not been recorded for this student. Automated AI insight generation is disabled until consent is verified in the student profile."`
    * Disable the "Analyze & Generate AI Insight" button.
* In `IepGenerationPage.jsx`:
  * If `selectedStudent` has `parental_consent_obtained === false`:
    * Render warning callout at top of Section C: `"RA 10173 Parental Consent Pending: Generating AI goals requires verified parental consent. Please update the student profile with parental consent or manually author goals below."`
    * Disable the AI generation trigger button while keeping manual goal creation active.

- [x] **Step 5: Run frontend test suite**
Run:
```bash
cd neuropath-frontend
npm test -- --run src/pages/CreateStudentProfile.test.jsx
npm test -- --run src/pages/StudentProfiling/StudentInsightsTab.test.jsx
npm test -- --run
```

---

### Task 5: End-to-End Verification & Commit

- [x] **Step 1: Execute complete backend test suite**
```bash
cd neuropath-backend
./venv/bin/python manage.py test iep_management.tests.test_privacy_compliance --keepdb
./venv/bin/python manage.py test iep_management.tests.test_insights_and_goals --keepdb
./venv/bin/python manage.py test iep_management.tests.test_ai_engine --keepdb
./venv/bin/python manage.py test resources.tests.test_instructional_ai --keepdb
```

- [x] **Step 2: Execute complete frontend test suite & build check**
```bash
cd neuropath-frontend
npm test -- --run
npm run build
```

- [x] **Step 3: Commit with standard format**
```bash
git add neuropath-backend neuropath-frontend docs/superpowers/plans/2026-09-11-issue-124-learner-data.md
git commit -m "feat: implement learner data privacy for minors (RA 10173 compliance) (#124)"
```
