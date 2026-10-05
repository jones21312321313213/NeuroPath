# Fix IEP Version Race Condition, Duplicate Router Registration, and Invalid PDF Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three backend correctness issues in NeuroPath: prevent duplicate IEP version creation via database constraints and transactional row locking, eliminate duplicate router registrations in resources URLs, and replace corrupt raw-byte PDF output with valid ReportLab document generation.

**Architecture:** 
1. Database-level unique constraint `(studentID, version)` on `IEPModel` coupled with Django `transaction.atomic()` and `select_for_update()` in `IEPGenerationAPIView` to serialize concurrent IEP version creation.
2. Deduplication of `path('', include(router.urls))` in `resources/urls.py`.
3. ReportLab `SimpleDocTemplate` pipeline in `BinaryReportRenderEngine` generating well-structured, valid PDF documents for student record exports.

**Tech Stack:** Django 6.0.5, Django REST Framework 3.17.1, ReportLab 4.4.1, PostgreSQL / SQLite (Test runner).

## Global Constraints

- Never alter legacy component `Assessment` in `iep_management/models.py`.
- Preserve all existing comments, docstrings, and URL endpoint names.
- Ensure all test commands run cleanly with `python neuropath-backend/manage.py test`.
- All generated PDF documents must conform to valid PDF 1.4+ binary specifications with valid `%PDF-` header and `%%EOF` trailer.

---

### Task 1: IEP Version Race Condition & Unique Constraint

**Files:**
- Modify: `neuropath-backend/iep_management/models.py:19-47`
- Create: `neuropath-backend/iep_management/migrations/0005_iepmodel_unique_student_iep_version.py`
- Modify: `neuropath-backend/iep_management/views.py:121-165`
- Modify: `neuropath-backend/iep_management/tests.py:1-4`

**Interfaces:**
- Consumes: `StudentProfile` model from `users.models`, `IEPDataSerializer` from `iep_management.serializers`
- Produces: `IEPModel` with `unique_student_iep_version` constraint, transactional `select_for_update` auto-versioning in `IEPGenerationAPIView.post`

- [ ] **Step 1: Write the failing test**

Edit `neuropath-backend/iep_management/tests.py`:
```python
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import Teacher, StudentProfile
from .models import IEPModel
from .views import IEPGenerationAPIView


class IEPVersionRaceConditionTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username='testteacher', email='teacher@test.com', password='password123')
        self.teacher = Teacher.objects.create(name='Test Teacher', email='teacher@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(
            name='Jane Doe',
            age=10,
            grade=4,
            teacher=self.teacher,
            diagnosis='ASD Level 1'
        )

    def test_unique_constraint_on_student_and_version(self):
        IEPModel.objects.create(studentID=self.student, version=1, goals='Goal 1')
        with self.assertRaises(IntegrityError):
            IEPModel.objects.create(studentID=self.student, version=1, goals='Duplicate version goal')

    def test_auto_increment_version_on_save(self):
        view = IEPGenerationAPIView.as_view()

        # Save first IEP
        request1 = self.factory.post('/api/iep/generate-iep/', {
            'action': 'save',
            'studentID': self.student.pk,
            'goals': 'Goal version 1',
            'accommodations': 'Visual schedule'
        }, format='json')
        force_authenticate(request1, user=self.user)
        response1 = view(request1)
        self.assertEqual(response1.status_code, 201)
        self.assertEqual(response1.data['data']['version'], 1)

        # Save second IEP
        request2 = self.factory.post('/api/iep/generate-iep/', {
            'action': 'save',
            'studentID': self.student.pk,
            'goals': 'Goal version 2',
            'accommodations': 'Sensory breaks'
        }, format='json')
        force_authenticate(request2, user=self.user)
        response2 = view(request2)
        self.assertEqual(response2.status_code, 201)
        self.assertEqual(response2.data['data']['version'], 2)

    def test_different_students_can_have_same_version(self):
        student2 = StudentProfile.objects.create(
            name='John Smith',
            age=9,
            grade=3,
            teacher=self.teacher
        )
        iep1 = IEPModel.objects.create(studentID=self.student, version=1, goals='Jane IEP 1')
        iep2 = IEPModel.objects.create(studentID=student2, version=1, goals='John IEP 1')
        self.assertEqual(iep1.version, 1)
        self.assertEqual(iep2.version, 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test iep_management
```
Expected: FAIL with `AssertionError: IntegrityError not raised` (since unique constraint does not exist yet).

- [ ] **Step 3: Write minimal implementation**

1. In `neuropath-backend/iep_management/models.py`, add constraint to `IEPModel.Meta`:
```python
class IEPModel(models.Model):
    iepID = models.AutoField(primary_key=True)
    studentID = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ieps')
    
    # --- EXISTING CORE FIELDS ---
    baselineData = models.TextField(blank=True, null=True) # 🎯 Changed to allow clean null values
    goals = models.TextField(blank=True, null=True)        # 🎯 Changed to allow clean null values
    accommodations = models.TextField(blank=True, default='')
    generatedDetails = models.JSONField(blank=True, default=dict)
    version = models.IntegerField(default=1)
    createdDate = models.DateTimeField(auto_now_add=True)

    # --- NEW SECTION B: DEPED MACRO-ENVIRONMENT FACTORS ---
    program_type = models.CharField(
        max_length=50, 
        choices=[('Graded', 'Graded (K-12)'), ('Non-Graded', 'Non-Graded (Functional)')], 
        default='Graded'
    )
    difficulties = models.TextField(help_text="Enter ALL areas of difficulty", blank=True, null=True)
    learning_barriers = models.TextField(help_text="Factors restricting participation", blank=True, null=True)
    barrier_qualifiers = models.CharField(max_length=255, blank=True, null=True)
    learning_facilitators = models.TextField(help_text="Factors enabling participation", blank=True, null=True)
    facilitator_qualifiers = models.CharField(max_length=255, blank=True, null=True)
    learning_accommodations = models.TextField(help_text="Accommodations per difficulty row", blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['studentID', 'version'],
                name='unique_student_iep_version'
            )
        ]

    def __str__(self):
        return f'IEP v{self.version} for Student: {self.studentID.name}'
```

2. Create `neuropath-backend/iep_management/migrations/0005_iepmodel_unique_student_iep_version.py`:
```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0004_iepmodel_learning_accommodations'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='iepmodel',
            constraint=models.UniqueConstraint(fields=('studentID', 'version'), name='unique_student_iep_version'),
        ),
    ]
```

3. In `neuropath-backend/iep_management/views.py`, import `transaction` from `django.db` and update `action == 'save'` in `IEPGenerationAPIView`:
```python
from django.db import transaction
```
```python
        if action == 'save':
            payload = request.data.copy()

            # Only allow saving an IEP for a student owned by this teacher account.
            student_id = payload.get('studentID')
            # Prefer the authenticated user's ID; fall back to payload teacherID
            teacher_user_id = request.user.id if request.user.is_authenticated else payload.get('teacherID')
            teacher = self._get_teacher_from_user_id(teacher_user_id)
            try:
                student_query = StudentProfile.objects.filter(pk=student_id)
                if teacher:
                    student_query = student_query.filter(teacher=teacher)
                else:
                    # No resolvable teacher — reject to prevent unscoped saves
                    return Response({'error': 'Unable to verify teacher account.'}, status=status.HTTP_403_FORBIDDEN)
                student_query.get()
            except StudentProfile.DoesNotExist:
                return Response({'error': 'Student not found for this teacher account.'}, status=status.HTTP_404_NOT_FOUND)

            payload.pop('teacherID', None)

            with transaction.atomic():
                # Lock the student record to serialize concurrent version calculations
                StudentProfile.objects.select_for_update().get(pk=student_id)

                # Auto-version per student
                if not payload.get('version'):
                    latest = IEPModel.objects.filter(studentID_id=student_id).order_by('-version').first()
                    payload['version'] = (latest.version + 1) if latest else 1

                serializer = IEPDataSerializer(data=payload)
                if serializer.is_valid():
                    iep_instance = serializer.save()

                    return Response({
                        'message': 'IEP Created Successfully.',
                        'data': IEPListDetailSerializer(iep_instance).data,
                    }, status=status.HTTP_201_CREATED)

                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test iep_management
```
Expected: PASS (all 3 tests pass).

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/iep_management/models.py neuropath-backend/iep_management/migrations/0005_iepmodel_unique_student_iep_version.py neuropath-backend/iep_management/views.py neuropath-backend/iep_management/tests.py
git commit -m "fix(iep): add unique constraint on (studentID, version) and atomic select_for_update locking"
```

---

### Task 2: Deduplicate Router Registration in `resources/urls.py`

**Files:**
- Modify: `neuropath-backend/resources/urls.py:40-52`
- Modify: `neuropath-backend/resources/tests.py:1-4`

**Interfaces:**
- Consumes: `router.urls` from `rest_framework.routers`
- Produces: Clean, single route include for all resources viewsets

- [ ] **Step 1: Write the failing test**

Edit `neuropath-backend/resources/tests.py`:
```python
from django.test import TestCase
from django.urls import resolve
from resources.urls import urlpatterns


class ResourceUrlRoutingTestCase(TestCase):
    def test_no_duplicate_router_include(self):
        router_includes = [
            p for p in urlpatterns
            if hasattr(p, 'url_patterns') and any(
                'lesson-plans' in getattr(pattern, 'pattern', '').regex.pattern
                for pattern in getattr(p, 'url_patterns', [])
                if hasattr(getattr(pattern, 'pattern', None), 'regex')
            )
        ]
        # Must only include router.urls once
        self.assertEqual(len(router_includes), 1)

    def test_resource_url_resolutions(self):
        match_lesson = resolve('/api/resources/generate-lesson/')
        self.assertEqual(match_lesson.view_name, 'generate-lesson-plan')

        match_visual = resolve('/api/resources/generate-visual-aid/')
        self.assertEqual(match_visual.view_name, 'generate-visual-aid')

        match_strategy = resolve('/api/resources/generate-strategy/')
        self.assertEqual(match_strategy.view_name, 'generate-teaching-strategy')
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test resources
```
Expected: FAIL with `AssertionError: 2 != 1` in `test_no_duplicate_router_include`.

- [ ] **Step 3: Write minimal implementation**

In `neuropath-backend/resources/urls.py`, remove the duplicate `path('', include(router.urls)),` (line 50). Lines 40-55 should read:
```python
    # ViewSet Endpoints (Module 3.1 and 3.1.2)
    path('', include(router.urls)),
    
    # Edit Lesson Workflow Endpoint (Module 3.1.3)
    path('edit-lesson/<int:pk>/', LessonPlanEditAPIView.as_view(), name='edit-lesson-plan'),
    
    # Delete Lesson Workflow Endpoint (Module 3.1.4)
    path('delete-lesson/<int:pk>/', LessonPlanDeleteAPIView.as_view(), name='delete-lesson-plan'),
    
    # Generate Visual Aid Workflow (Module 3.2.1)
    path('generate-visual-aid/', GenerateVisualAidAPIView.as_view(), name='generate-visual-aid'),
    
    # Export Visual Aid Workflow (Module 3.2.1)
    path('export-visual-aid/<int:pk>/', ExportVisualAidAPIView.as_view(), name='export-visual-aid'),
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test resources
```
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/resources/urls.py neuropath-backend/resources/tests.py
git commit -m "fix(resources): remove duplicate router.urls inclusion in resources urls"
```

---

### Task 3: ReportLab Binary PDF Report Generation in `tracking/views.py`

**Files:**
- Modify: `neuropath-backend/tracking/views.py:69-88`
- Modify: `neuropath-backend/tracking/tests.py:1-4`

**Interfaces:**
- Consumes: `StudentProfile` model from `users.models`, `reportlab` library
- Produces: `BinaryReportRenderEngine.generate_report_stream(student_record) -> io.BytesIO` returning valid PDF binary buffer

- [ ] **Step 1: Write the failing test**

Edit `neuropath-backend/tracking/tests.py`:
```python
from django.test import TestCase
from rest_framework.test import APIClient
from users.models import Teacher, StudentProfile
from tracking.views import BinaryReportRenderEngine


class BinaryReportRenderEngineTestCase(TestCase):
    def setUp(self):
        self.teacher = Teacher.objects.create(
            name='Test Teacher',
            email='teacher@test.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            name='Alice Johnson',
            age=8,
            grade=2,
            gender='Female',
            teacher=self.teacher,
            diagnosis='Autism Spectrum Disorder',
            support_needs='Visual cues, structured routine',
            learning_style='Visual / Kinesthetic',
            assessmentResult='Baseline evaluation complete.'
        )
        self.client = APIClient()

    def test_generate_report_stream_valid_pdf_structure(self):
        pdf_stream = BinaryReportRenderEngine.generate_report_stream(self.student)
        content = pdf_stream.getvalue()

        # PDF must start with valid header
        self.assertTrue(content.startswith(b'%PDF-'))
        # PDF must contain valid trailer / EOF marker
        self.assertTrue(b'%%EOF' in content)
        # PDF must be non-trivial ReportLab binary output (> 1000 bytes)
        self.assertGreater(len(content), 1000)

    def test_export_record_pdf_endpoint(self):
        response = self.client.get(f'/api/tracking/student-records/{self.student.pk}/export/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn(f'StudentRecord_{self.student.pk}.pdf', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertTrue(b'%%EOF' in response.content)
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test tracking
```
Expected: FAIL with `AssertionError: False is not true` on `b'%%EOF' in content` (because the old implementation only writes plain text).

- [ ] **Step 3: Write minimal implementation**

In `neuropath-backend/tracking/views.py`, replace `BinaryReportRenderEngine` with:
```python
# =====================================================================
# SDD COMPONENT: BinaryReportRenderEngine
# Description: Background processing utility component compiling performance 
#              matrices into a portable binary PDF stream using ReportLab.
# =====================================================================
class BinaryReportRenderEngine:
    @staticmethod
    def generate_report_stream(student_record):
        # Generates a standard PDF byte stream for local client-side download using ReportLab
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        styles = getSampleStyleSheet()

        style_title = ParagraphStyle(
            'DocTitle',
            parent=styles['Title'],
            fontSize=18,
            leading=24,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=4,
        )
        style_subtitle = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            fontName='Helvetica',
            textColor=colors.HexColor('#64748B'),
            spaceAfter=12,
        )
        style_section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontSize=12,
            fontName='Helvetica-Bold',
            leading=16,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=10,
            spaceAfter=6,
        )
        style_cell_label = ParagraphStyle(
            'CellLabel',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#334155'),
            leading=13,
        )
        style_cell_value = ParagraphStyle(
            'CellValue',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#1E293B'),
            leading=13,
        )
        style_body = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#334155'),
            leading=14,
        )

        story = []

        # Title & Subtitle
        story.append(Paragraph("Official Student Record", style_title))
        story.append(Paragraph("NeuroPath Special Education Outcome Monitoring & Tracking Report", style_subtitle))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=12))

        # Student Information Grid
        info_data = [
            [
                Paragraph("Student Name:", style_cell_label),
                Paragraph(student_record.name or 'N/A', style_cell_value),
                Paragraph("Record ID:", style_cell_label),
                Paragraph(str(student_record.pk), style_cell_value),
            ],
            [
                Paragraph("Age / Grade:", style_cell_label),
                Paragraph(f"{student_record.age} yrs / Grade {student_record.grade}", style_cell_value),
                Paragraph("Gender:", style_cell_label),
                Paragraph(student_record.gender or 'N/A', style_cell_value),
            ],
            [
                Paragraph("Diagnosis:", style_cell_label),
                Paragraph(student_record.diagnosis or student_record.asdBackground or 'N/A', style_cell_value),
                Paragraph("Learning Style:", style_cell_label),
                Paragraph(student_record.learning_style or 'N/A', style_cell_value),
            ],
            [
                Paragraph("Support Needs:", style_cell_label),
                Paragraph(student_record.support_needs or 'N/A', style_cell_value),
                Paragraph("Sensory Prefs:", style_cell_label),
                Paragraph(student_record.sensory_preferences or 'N/A', style_cell_value),
            ],
        ]

        info_table = Table(info_data, colWidths=[32 * mm, 53 * mm, 32 * mm, 53 * mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 10 * mm))

        # Assessment & Baseline Summary
        story.append(Paragraph("Assessment & Baseline Information", style_section_heading))
        assessment_text = student_record.assessmentResult or "No formal assessment results recorded."
        story.append(Paragraph(assessment_text, style_body))
        story.append(Spacer(1, 6 * mm))

        # Performance Matrices & Objective Criteria Logs
        story.append(Paragraph("Performance Matrices & Objective Criteria Logs", style_section_heading))
        perf_summary = (
            "This document certifies the active tracking records and outcome evaluation metrics for the student. "
            "All instructional interventions and IEP objective progressions are recorded in the central NeuroPath tracking subsystem."
        )
        story.append(Paragraph(perf_summary, style_body))

        doc.build(story)
        buffer.seek(0)
        return buffer
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test tracking
```
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/tracking/views.py neuropath-backend/tracking/tests.py
git commit -m "fix(tracking): generate valid ReportLab PDF streams for student record exports"
```

---

### Task 4: Full Test Suite Verification and Final Audit

**Files:**
- Test all backend apps: `iep_management`, `resources`, `tracking`, `users`

- [ ] **Step 1: Run complete backend test suite**

Run:
```powershell
$env:DB_PASSWORD="dummy"; python .\neuropath-backend\manage.py test iep_management resources tracking users
```
Expected: PASS with all tests across all modules passing.

- [ ] **Step 2: Verify git status and clean diff**

Run:
```bash
git status
```
Expected: Clean working tree on branch `issue-69-fix`.
