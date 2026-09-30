from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from .models import StudentProfile, Teacher
from .utils import get_teacher_for_user
from django.contrib.auth.models import User
from .serializers import StudentProfileSerializer, ValidationService, TeacherSerializer
from django.contrib.auth import authenticate
# =====================================================================
# SDD MODULE: TEACHER REGISTRATION
# Component Name: TeacherCreateController
# Description: Intercepts POST requests, orchestrates user payload 
#              validation, and persists credentials into the database.
# =====================================================================
#ListCreateAPIView to temp add teacher
class TeacherCreateController(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = TeacherSerializer

    def get_permissions(self):
        # Registration (POST) must stay open to anonymous users; listing every
        # registered account (GET) must not be exposed to the public.
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Teacher account successfully created.",
                "user": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response({
            "message": "Registration failed. Invalid details provided.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
# =====================================================================
# SDD MODULE 1.1: CREATE STUDENT PROFILE & LIST PROFILES
# Component Name: StudentProfileListCreateView
# Description: Handles incoming HTTP POST/GET requests for profile 
#              creation and roster generation.
# =====================================================================
class StudentProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return only the students that belong to the requesting teacher.

        The requesting teacher is derived from the authenticated request
        user (never from a client-supplied id/query param), so a caller can
        never list another teacher's students. If the authenticated user has
        no matching Teacher row we return an empty queryset so no data leaks.
        """
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return StudentProfile.objects.none()
        return StudentProfile.objects.filter(teacher=teacher)

    def create(self, request, *args, **kwargs):
        # 0. Force the new profile onto the authenticated teacher's own
        #    account — never trust a client-supplied teacher id. The
        #    `teacher` field is read-only on the serializer (see
        #    StudentProfileSerializer.create), so this check exists purely
        #    to reject up front instead of silently falling back.
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({
                "message": "Unable to verify teacher account."
            }, status=status.HTTP_403_FORBIDDEN)

        # 1. Receive data from the React Form
        serializer = self.get_serializer(data=request.data)

        # 2. Process Validation rules via Serializer
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Student profile successfully created and saved.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Validation failed. Please check the entered details.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# SDD MODULE 1.2: UPDATE & DELETE STUDENT PROFILE
# Component Name: ProfileUpdateController
# Description: Intercepts HTTP PUT and DELETE requests, coordinates server-side 
#              validation, and commits data edits or deletions to PostgreSQL.
# =====================================================================
class ProfileUpdateController(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ValidationService  # Links to your update ValidationService
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Scope to the requesting teacher's own students so a caller can
        # never read/write/delete another teacher's student by guessing a pk.
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return StudentProfile.objects.none()
        return StudentProfile.objects.filter(teacher=teacher)

    def update(self, request, *args, **kwargs):
        # 1. ProfileService context: Verify record existence
        try:
            instance = self.get_object() 
        except Exception:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # 2. Process partial input payloads safely
        serializer = self.get_serializer(instance, data=request.data, partial=True)

        if serializer.is_valid():
            # 3. StudentProfileManager context: Secure update execution
            self.perform_update(serializer)
            return Response({
                "message": "Student profile updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Update failed. Invalid input provided.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Exception:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        self.perform_destroy(instance)
        return Response({
            "message": "Student profile successfully deleted."
        }, status=status.HTTP_200_OK)


# =====================================================================
# SDD MODULE 1.3: VIEW STUDENT PROFILE
# Component Name: ProfileViewController
# Description: Intercepts client-side HTTP GET requests to read and 
#              isolate specific student records safely.
# =====================================================================
class ProfileViewController(generics.RetrieveAPIView):
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Scope to the requesting teacher's own students so a caller can
        # never read another teacher's student by guessing a pk.
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return StudentProfile.objects.none()
        return StudentProfile.objects.filter(teacher=teacher)

    def retrieve(self, request, *args, **kwargs):
        # 1. ProfileService context: Retrieve targeted profile record
        try:
            instance = self.get_object() 
        except Exception:
            # Matches Sequence Diagram 'alt' block [validation = FALSE]
            return Response({
                "error": "No Details Available. Student profile not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 2. Return record if found: [validation = TRUE]
        serializer = self.get_serializer(instance)
        return Response({
            "message": "Profile Data Returned successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


# =====================================================================
# SDD MODULE 1.4: ANALYZE AND GENERATE AI INSIGHTS
# System Sub-Pipeline Architecture Block
# =====================================================================

# --- Sub-Component 1: StudentProfileManager ---
class StudentProfileManager:
    @staticmethod
    def get_student_record(student_id):
        try:
            return StudentProfile.objects.get(pk=student_id)
        except StudentProfile.DoesNotExist:
            return None

# --- Sub-Component 2: ValidationService ---
class ValidationService:
    """Legacy validation helper for student insight data sufficiency."""

    @staticmethod
    def validate_data_sufficiency(student):
        assessment_result = (
            getattr(student, 'assessmentResult', None)
            or getattr(student, 'assessmentResults', None)
        )
        if not assessment_result or len(str(assessment_result).strip()) < 5:
            return False
        return True

# --- Sub-Component 3: AIGenerationService ---
class AIGenerationService:
    @staticmethod
    def generate_insight(student):
        # Mock AI generation response pattern matching your design documentation flow
        mock_ai_response = (
            f"Based on the data provided for {student.name}, the AI recommends "
            f"leveraging their preference for '{student.preferences}' to create "
            f"highly structured learning modules. Ensure visual schedules are utilized."
        )
        return mock_ai_response

# --- Sub-Component 4: AIInsightController (Main Controller Node) ---
class AIInsightController(APIView):
    """
    Legacy insight generation endpoint for backward compatibility.
    Canonical flow: POST /api/iep/student/<student_id>/generate-insight/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk, format=None):
        # We just return a 200 OK so the UI loads cleanly before they click generate
        return Response({
            "message": "Ready to generate insights."
        }, status=status.HTTP_200_OK)
        
        
    def post(self, request, pk, format=None):
        # 1. Coordinate data isolation via Manager layer
        student = StudentProfileManager.get_student_record(pk)
        teacher = get_teacher_for_user(request.user)
        if not student or not teacher or student.teacher_id != teacher.teacherID:
            return Response({
                "error": "Profile not found. Cannot generate insights."
            }, status=status.HTTP_404_NOT_FOUND)

        # 2. Route payload through strict server-side validation check
        is_valid = ValidationService.validate_data_sufficiency(student)
        if not is_valid:
            return Response({
                "error": "Validation Failed: Insufficient assessment data to generate a meaningful AI insight."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Request logic resolution from Generation service layer
        insight_text = AIGenerationService.generate_insight(student)

        # 4. Return serialized text response engine content back to React frontend
        return Response({
            "message": "AI Insight generated successfully.",
            "insightData": insight_text
        }, status=status.HTTP_200_OK)
        
# =====================================================================
# SDD MODULE: TEACHER LOGIN
# Component Name: TeacherLoginController
# Description: Authenticates user credentials against the database and 
#              establishes a secure server-side session.
# =====================================================================
@method_decorator(csrf_exempt, name='dispatch')
class TeacherLoginController(APIView):
    authentication_classes = [] 
    permission_classes = [AllowAny] 

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)

        if user is not None:
            # 🎯 Generate or fetch the Token
            token, created = Token.objects.get_or_create(user=user)
            teacher = get_teacher_for_user(user)
            
            return Response({
                "message": "Login successful",
                "token": token.key, # 🎯 Return token to React
                "teacher": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "has_completed_tutorial": teacher.has_completed_tutorial if teacher else False,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        
# =====================================================================
# TEACHER PROFILE UPDATE
# PATCH /api/users/profile/update/
# Accepts: { first_name, last_name, email, password? }
# Identifies the teacher from the authenticated request user — never from a
# client-supplied id — so a caller can only ever update their own account.
# Any `id` in the request body is deliberately ignored: trusting it let an
# unauthenticated caller rewrite another user's name, email and password.
# Also keeps the Teacher mirror-row (name, email) in sync.
# =====================================================================
class TeacherProfileUpdateController(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        # Always operate on the authenticated caller's own account — never a
        # client-supplied id — so one teacher cannot edit another's profile.
        user = request.user

        first_name = request.data.get("first_name", user.first_name).strip()
        last_name  = request.data.get("last_name",  user.last_name).strip()
        email      = request.data.get("email",      user.email).strip().lower()
        password   = request.data.get("password", "")

        errors = {}
        if not first_name:
            errors["first_name"] = "First name is required."
        if not last_name:
            errors["last_name"] = "Last name is required."
        if not email or "@" not in email:
            errors["email"] = "A valid email address is required."
        if password:
            try:
                validate_password(password, user=user)
            except DjangoValidationError as exc:
                errors["password"] = list(exc.messages)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Check email uniqueness (exclude the current user and teacher)
        if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exclude(pk=user.pk).exists() or \
           Teacher.objects.filter(email__iexact=email).exclude(email__iexact=user.email).exists():
            return Response(
                {"errors": {"email": "This email is already in use."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_email = user.email

        with transaction.atomic():
            # Update the Django User row
            user.first_name = first_name
            user.last_name  = last_name
            user.email      = email
            user.username   = email   # username == email convention used at registration
            if password:
                user.set_password(password)
            user.save()

            # Keep the Teacher mirror-row in sync
            Teacher.objects.filter(email__iexact=old_email).update(
                name=f"{first_name} {last_name}".strip(),
                email=email,
            )

        teacher = get_teacher_for_user(user)

        return Response(
            {
                "id":                     user.id,
                "first_name":             user.first_name,
                "last_name":              user.last_name,
                "email":                  user.email,
                "has_completed_tutorial": teacher.has_completed_tutorial if teacher else False,
            },
            status=status.HTTP_200_OK,
        )


# =====================================================================
# TEACHER LOGOUT
# POST /api/users/logout/
# Deletes the caller's DRF auth token so the credential can no longer
# be replayed. Requires Authorization: Token <key>.
# =====================================================================
class TeacherLogoutController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Token.objects.filter(user=request.user).delete()
        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )


# =====================================================================
# TEACHER TUTORIAL COMPLETE
# POST /api/users/tutorial-complete/
# Marks has_completed_tutorial = True for the authenticated teacher.
# =====================================================================
class TeacherTutorialCompleteController(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            teacher, _ = Teacher.objects.get_or_create(
                email=request.user.email.strip().lower(),
                defaults={
                    "name": f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                    "passwordHash": request.user.password,
                    "has_completed_tutorial": True,
                },
            )

        teacher.has_completed_tutorial = True
        teacher.save(update_fields=["has_completed_tutorial"])

        return Response(
            {
                "message": "Tutorial marked as completed.",
                "has_completed_tutorial": True,
            },
            status=status.HTTP_200_OK,
        )


# =====================================================================
# SDD MODULE: RA 10173 PARENTAL CONSENT PDF EXPORT (BUNDLE 2)
# Component Name: ConsentCertificatePdfEngine & ConsentCertificatePdfView
# Description: Generates official DepEd-standard downloadable PDF
#              certificates for RA 10173 Parental Consent agreements.
# =====================================================================
class ConsentCertificatePdfEngine:
    @staticmethod
    def generate_pdf_stream(data: dict):
        """
        Generates an official DepEd RA 10173 Parental Consent Certificate PDF stream.
        Expected keys in data:
            - learner_name
            - guardian_name
            - guardian_relationship
            - school
            - school_year
            - grade
            - consent_date
            - teacher_name
        """
        import io
        import html
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

        def esc(val):
            if val is None:
                return ""
            return html.escape(str(val))

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=14 * mm,
            leftMargin=14 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )

        styles = getSampleStyleSheet()

        style_republic = ParagraphStyle(
            'RepTitle',
            parent=styles['Normal'],
            fontSize=8.5,
            fontName='Helvetica-Bold',
            leading=11,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=1,
        )
        style_deped = ParagraphStyle(
            'DepEdTitle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=1,
        )
        style_bureau = ParagraphStyle(
            'BureauSubtitle',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Helvetica',
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#475569'),
            spaceAfter=4,
        )
        style_doc_title = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1E3A8A'),
            spaceAfter=2,
        )
        style_act_subtitle = ParagraphStyle(
            'ActSubtitle',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Helvetica-Bold',
            leading=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0284C7'),
            spaceAfter=5,
        )
        style_table_label = ParagraphStyle(
            'TableLabel',
            parent=styles['Normal'],
            fontSize=7.5,
            fontName='Helvetica-Bold',
            leading=9.5,
            textColor=colors.HexColor('#1E293B'),
        )
        style_table_value = ParagraphStyle(
            'TableVal',
            parent=styles['Normal'],
            fontSize=7.5,
            fontName='Helvetica',
            leading=9.5,
            textColor=colors.HexColor('#334155'),
        )
        style_sec_heading = ParagraphStyle(
            'SecHeading',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Helvetica-Bold',
            leading=10.5,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=3,
            spaceAfter=1.5,
        )
        style_body = ParagraphStyle(
            'BodyJustified',
            parent=styles['Normal'],
            fontSize=7.2,
            fontName='Helvetica',
            leading=9.5,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2,
        )
        style_attestation_heading = ParagraphStyle(
            'AttestHeading',
            parent=styles['Normal'],
            fontSize=7.5,
            fontName='Helvetica-Bold',
            leading=9.5,
            textColor=colors.HexColor('#1E293B'),
        )
        style_attestation_body = ParagraphStyle(
            'AttestBody',
            parent=styles['Normal'],
            fontSize=7,
            fontName='Helvetica',
            leading=9,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor('#1E293B'),
        )
        style_sig_name = ParagraphStyle(
            'SigName',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            leading=10,
            textColor=colors.HexColor('#0F172A'),
        )
        style_sig_role = ParagraphStyle(
            'SigRole',
            parent=styles['Normal'],
            fontSize=7,
            fontName='Helvetica',
            alignment=TA_CENTER,
            leading=8.5,
            textColor=colors.HexColor('#475569'),
        )
        style_footer_notice = ParagraphStyle(
            'FootNotice',
            parent=styles['Normal'],
            fontSize=6.5,
            fontName='Helvetica-Oblique',
            alignment=TA_CENTER,
            leading=8,
            textColor=colors.HexColor('#94A3B8'),
        )

        story = []
        story.append(Paragraph("REPUBLIC OF THE PHILIPPINES", style_republic))
        story.append(Paragraph("DEPARTMENT OF EDUCATION", style_deped))
        story.append(Paragraph("Bureau of Learning Delivery &mdash; Student Inclusion Division &bull; SPED Program", style_bureau))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1E3A8A'), spaceBefore=2, spaceAfter=4))
        story.append(Paragraph("PARENTAL CONSENT &amp; STATUTORY DATA PRIVACY DISCLOSURE AGREEMENT", style_doc_title))
        story.append(Paragraph("In Strict Compliance with Republic Act No. 10173 (Data Privacy Act of 2012) &amp; NPC Guidelines", style_act_subtitle))
        story.append(Spacer(1, 1.5 * mm))

        learner = esc(data.get('learner_name') or '—')
        guardian = esc(data.get('guardian_name') or '—')
        relation = esc(data.get('guardian_relationship') or 'Parent / Legal Guardian')
        school = esc(data.get('school') or 'Department of Education Special Education Center')
        sy = esc(data.get('school_year') or '—')
        grade = esc(data.get('grade') or '—')
        date_str = esc(data.get('consent_date') or '—')
        teacher = esc(data.get('teacher_name') or 'Licensed SPED Teacher / Case Manager')

        meta_rows = [
            [
                Paragraph("<b>Learner Name:</b>", style_table_label),
                Paragraph(f"<b>{learner}</b>", style_table_value),
                Paragraph("<b>Grade &amp; School Year:</b>", style_table_label),
                Paragraph(f"{grade} / {sy}", style_table_value),
            ],
            [
                Paragraph("<b>Parent / Guardian:</b>", style_table_label),
                Paragraph(f"<b>{guardian}</b> ({relation})", style_table_value),
                Paragraph("<b>School / Center:</b>", style_table_label),
                Paragraph(school, style_table_value),
            ],
            [
                Paragraph("<b>Verification Date:</b>", style_table_label),
                Paragraph(date_str, style_table_value),
                Paragraph("<b>Assigned Case Manager:</b>", style_table_label),
                Paragraph(teacher, style_table_value),
            ]
        ]
        meta_table = Table(meta_rows, colWidths=[38 * mm, 53 * mm, 40 * mm, 51 * mm])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("1. Categories of Sensitive Personal Information Collected", style_sec_heading))
        story.append(Paragraph(
            "In formulating and implementing the learner's Individualized Education Plan (IEP), NeuroPath processes learner demographics, clinical diagnostic categories (ASD), present levels of academic achievement and functional performance (PLAAFP), specialized accommodations, behavioral observations, and longitudinal skill mastery benchmarks.",
            style_body
        ))

        story.append(Paragraph("2. Educational Purpose &amp; Human-in-the-Loop AI Safeguards", style_sec_heading))
        story.append(Paragraph(
            "All gathered data is processed exclusively for authorized educational planning, individualized instruction, and developmental tracking. Generative artificial intelligence operates solely as an assistive drafting tool subject to mandatory review, modification, and authorization by licensed special education educators. Learner records are never commercialized, never shared with third-party advertisers, and strictly excluded from training public commercial models.",
            style_body
        ))

        story.append(Paragraph("3. Data Security, Retention &amp; Confidentiality", style_sec_heading))
        story.append(Paragraph(
            "Learner records are safeguarded using cryptographic protections in transit (TLS 1.3) and at rest. Access is strictly scoped to the authenticated educator of record and designated school personnel, adhering to statutory DepEd record retention schedules.",
            style_body
        ))

        story.append(Paragraph("4. Statutory Rights of the Parent / Legal Guardian (RA 10173 Section 16)", style_sec_heading))
        story.append(Paragraph(
            "Parents and legal guardians retain absolute statutory rights to be informed, inspect and obtain copies of records, rectify inaccurate data, object to or revoke consent for automated AI processing at any time without compromising the learner's entitlement to standard educational accommodations, and file complaints with the National Privacy Commission (NPC).",
            style_body
        ))
        story.append(Spacer(1, 2 * mm))

        attest_content = [
            [Paragraph("<b>LEGAL GUARDIAN ATTESTATION &amp; INFORMED CONSENT DECLARATION:</b>", style_attestation_heading)],
            [Paragraph(
                "I hereby certify that I am the parent or legal guardian of the learner identified above. I confirm that I have been fully informed of the educational purposes, automated AI processing safeguards, and statutory rights provided under Republic Act No. 10173 (Data Privacy Act of 2012). I grant my explicit, informed, and freely given consent for the collection, processing, and management of sensitive educational records strictly for the formulation and administration of the learner's Individualized Education Plan (IEP).",
                style_attestation_body
            )]
        ]
        attest_table = Table(attest_content, colWidths=[182 * mm])
        attest_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#94A3B8')),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(attest_table)
        story.append(Spacer(1, 3 * mm))

        sig_data = [
            [
                Paragraph(f"<b>{guardian}</b>", style_sig_name),
                Paragraph(f"<b>{teacher}</b>", style_sig_name),
            ],
            [
                Paragraph(f"Signature over Printed Name of Parent / Guardian ({relation})", style_sig_role),
                Paragraph("Signature over Printed Name of Case Manager / Evaluator", style_sig_role),
            ],
            [
                Paragraph(f"Date Signed: {date_str}", style_sig_role),
                Paragraph(f"Verification Date: {date_str}", style_sig_role),
            ]
        ]
        sig_table = Table(sig_data, colWidths=[91 * mm, 91 * mm])
        sig_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (0, 0), 1, colors.HexColor('#0F172A')),
            ('LINEABOVE', (1, 0), (1, 0), 1, colors.HexColor('#0F172A')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(sig_table)
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph(
            "Official DepEd SPED IEP Form &bull; Formulated under Republic Act No. 10173 (Data Privacy Act of 2012) &bull; National Privacy Commission (NPC) Compliant",
            style_footer_notice
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer


class ConsentCertificatePdfView(APIView):
    permission_classes = [IsAuthenticated]

    def _generate_response(self, data):
        import re
        from django.http import HttpResponse

        pdf_stream = ConsentCertificatePdfEngine.generate_pdf_stream(data)
        clean_name = re.sub(r'[^a-zA-Z0-9_-]+', '_', data.get('learner_name') or 'Learner').strip('_') or 'Learner'
        filename = f"RA10173_Parental_Consent_Certificate_{clean_name}.pdf"
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def get(self, request, pk=None, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Teacher profile not found."}, status=status.HTTP_403_FORBIDDEN)

        if pk is not None:
            try:
                student = StudentProfile.objects.get(pk=pk, teacher=teacher)
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)

            profile_details = student.profileDetails if isinstance(student.profileDetails, dict) else {}
            data = {
                'learner_name': student.name or profile_details.get('studentName') or profile_details.get('learnerName'),
                'guardian_name': student.guardian_name or profile_details.get('guardianName'),
                'guardian_relationship': student.guardian_relationship or profile_details.get('guardianRelationship') or 'Parent / Legal Guardian',
                'school': profile_details.get('school') or 'Department of Education Special Education Center',
                'school_year': profile_details.get('schoolYear') or '',
                'grade': str(student.grade) if student.grade else str(profile_details.get('grade') or ''),
                'consent_date': str(student.consent_date) if student.consent_date else str(profile_details.get('consentDate') or ''),
                'teacher_name': teacher.name if hasattr(teacher, 'name') and teacher.name else f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
            }
            return self._generate_response(data)

        # GET without pk: fallback using query params if any
        data = {
            'learner_name': request.query_params.get('learnerName', ''),
            'guardian_name': request.query_params.get('guardianName', ''),
            'guardian_relationship': request.query_params.get('guardianRelationship', 'Parent / Legal Guardian'),
            'school': request.query_params.get('school', 'Department of Education Special Education Center'),
            'school_year': request.query_params.get('schoolYear', ''),
            'grade': request.query_params.get('grade', ''),
            'consent_date': request.query_params.get('consentDate', ''),
            'teacher_name': teacher.name if hasattr(teacher, 'name') and teacher.name else f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        }
        return self._generate_response(data)

    def post(self, request, pk=None, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Teacher profile not found."}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data or {}
        data = {
            'learner_name': payload.get('learnerName') or payload.get('name') or '',
            'guardian_name': payload.get('guardianName') or payload.get('guardian_name') or '',
            'guardian_relationship': payload.get('guardianRelationship') or payload.get('guardian_relationship') or 'Parent / Legal Guardian',
            'school': payload.get('school') or 'Department of Education Special Education Center',
            'school_year': payload.get('schoolYear') or payload.get('school_year') or '',
            'grade': payload.get('grade') or '',
            'consent_date': payload.get('consentDate') or payload.get('consent_date') or '',
            'teacher_name': teacher.name if hasattr(teacher, 'name') and teacher.name else f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        }
        return self._generate_response(data)



