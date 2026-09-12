import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.http import HttpResponse
from users.models import StudentProfile
from users.utils import get_teacher_for_user
from .permissions import SessionAuthenticationGuard
from .serializers import HistoricalRecordDataSerializer, ProgressAnalyticsSerializer
from .models import StudentProgress


# =====================================================================
# SDD COMPONENT: OutcomeMonitoringRouter
# Description: Central routing dispatcher component handling incoming 
#              application pathways. Delegates execution streams downstream.
# =====================================================================
class OutcomeMonitoringRouter(APIView):
    # Enforce the SDD Security Guard
    permission_classes = [SessionAuthenticationGuard]

    def get(self, request, *args, **kwargs):
        """
        Matches Sequence Diagram: inspectInboundGateway() & delegateExecutionFlow()
        """
        # Determine which sub-module React is trying to access via query params
        route_path = request.query_params.get('routePath', 'gateway_home')
        
        # Check system parameters and return successful gateway verification context payload
        if route_path == 'view_student_records':
            return Response({
                "status": "authorized",
                "moduleKey": "student_records",
                "message": "Gateway cleared. Handing off setup data for View Student Records."
            }, status=status.HTTP_200_OK)
            
        elif route_path == 'progress_dashboard':
            return Response({
                "status": "authorized",
                "moduleKey": "progress_dashboard",
                "message": "Gateway cleared. Handing off setup data for Progress Dashboard."
            }, status=status.HTTP_200_OK)
            
        else:
            # Default Home Gateway response
            return Response({
                "gatewayName": "Outcome Monitoring Subsystem",
                "status": "active",
                "availableModules": ["view_student_records", "progress_dashboard"]
            }, status=status.HTTP_200_OK)
            

        
# =====================================================================
# SDD COMPONENT: ContextualDataIsolationFilter
# Description: Automated security wrapper designed to maintain strict 
#              multi-tenant database safety by isolating active query streams.
# =====================================================================
class ContextualDataIsolationFilter:
    @staticmethod
    def enforce_tenant_isolation(queryset, user=None):
        # Resolve the requesting Django auth User to their Teacher record and
        # scope the queryset to that teacher's own students only.
        teacher = get_teacher_for_user(user)
        if not teacher:
            return queryset.none()
        return queryset.filter(teacher=teacher)

# =====================================================================
# SDD COMPONENT: BinaryReportRenderEngine
# Description: Background processing utility component compiling performance 
#              matrices into a portable binary PDF stream.
# =====================================================================
class BinaryReportRenderEngine:
    @staticmethod
    def generate_report_stream(student_record):
        # Generates a standard PDF byte stream for local client-side download using ReportLab
        import html
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        def esc(val):
            if val is None:
                return ""
            return html.escape(str(val))

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
            'DocBody',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#334155'),
            leading=14,
        )
        style_label_inline = ParagraphStyle(
            'DocLabelInline',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1E293B'),
            leading=14,
            spaceBefore=4,
        )

        story = []

        # Document Header
        story.append(Paragraph("NeuroPath — Official Student Record", style_title))
        story.append(Paragraph("NeuroPath Special Education Outcome Monitoring & Tracking Report", style_subtitle))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=12))

        # Extract profile details dictionary
        pd = student_record.profileDetails if isinstance(student_record.profileDetails, dict) else {}

        # Student Information Grid
        student_name = student_record.name or pd.get('studentName') or 'N/A'
        school_val = pd.get('school') or 'N/A'
        school_year_val = pd.get('schoolYear') or 'N/A'
        birthdate_val = pd.get('birthdate') or 'N/A'
        diagnosis_val = pd.get('disabilityCategory') or student_record.diagnosis or student_record.asdBackground or 'N/A'
        learning_style_val = student_record.learning_style or 'N/A'
        support_needs_val = student_record.support_needs or pd.get('academicNeeds') or 'N/A'
        sensory_val = student_record.sensory_preferences or 'N/A'

        info_data = [
            [
                Paragraph("Student Name:", style_cell_label),
                Paragraph(esc(student_name), style_cell_value),
                Paragraph("Record ID:", style_cell_label),
                Paragraph(esc(str(student_record.pk)), style_cell_value),
            ],
            [
                Paragraph("Age / Grade:", style_cell_label),
                Paragraph(esc(f"{student_record.age} yrs / Grade {student_record.grade}"), style_cell_value),
                Paragraph("Gender:", style_cell_label),
                Paragraph(esc(student_record.gender or 'N/A'), style_cell_value),
            ],
            [
                Paragraph("School:", style_cell_label),
                Paragraph(esc(school_val), style_cell_value),
                Paragraph("School Year:", style_cell_label),
                Paragraph(esc(school_year_val), style_cell_value),
            ],
            [
                Paragraph("Birthdate:", style_cell_label),
                Paragraph(esc(birthdate_val), style_cell_value),
                Paragraph("Diagnosis:", style_cell_label),
                Paragraph(esc(diagnosis_val), style_cell_value),
            ],
            [
                Paragraph("Support Needs:", style_cell_label),
                Paragraph(esc(support_needs_val), style_cell_value),
                Paragraph("Sensory / Style:", style_cell_label),
                Paragraph(esc(f"{learning_style_val} | {sensory_val}"), style_cell_value),
            ],
        ]

        info_table = Table(info_data, colWidths=[32 * mm, 53 * mm, 32 * mm, 53 * mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 6 * mm))

        # Present Levels of Academic Achievement and Functional Performance
        story.append(Paragraph("Present Levels of Academic Achievement & Functional Performance", style_section_heading))

        present_eval = pd.get('presentEvaluation') or student_record.assessmentResult or "No formal assessment results recorded."
        strengths = pd.get('academicStrengths') or "No academic strengths recorded."
        needs = pd.get('academicNeeds') or student_record.support_needs or "No academic needs recorded."
        concerns = pd.get('parentalConcerns') or "No parental concerns recorded."
        curriculum_impact = pd.get('curriculumImpact') or "No curriculum impact recorded."
        diag_details = pd.get('diagnosisDetails') or student_record.asdBackground or ""

        if diag_details:
            story.append(Paragraph("<b>Assessment / Diagnosis Details:</b>", style_label_inline))
            story.append(Paragraph(esc(diag_details), style_body))
            story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("<b>Evaluation & School Assessments:</b>", style_label_inline))
        story.append(Paragraph(esc(present_eval), style_body))
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("<b>Academic, Developmental & Functional Strengths:</b>", style_label_inline))
        story.append(Paragraph(esc(strengths), style_body))
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("<b>Academic, Developmental & Functional Needs:</b>", style_label_inline))
        story.append(Paragraph(esc(needs), style_body))
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("<b>Parental Concerns:</b>", style_label_inline))
        story.append(Paragraph(esc(concerns), style_body))
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph("<b>Impact on General Education Curriculum:</b>", style_label_inline))
        story.append(Paragraph(esc(curriculum_impact), style_body))
        story.append(Spacer(1, 5 * mm))

        # Section B & Section C (IEP Factors & Learner Goals)
        latest_iep = student_record.ieps.order_by('-version').first() if hasattr(student_record, 'ieps') else None
        if latest_iep:
            story.append(Paragraph("Section B: Difficulties, Barriers, and Enabling Supports", style_section_heading))

            diff_list = [d.strip() for d in (latest_iep.difficulties or '').split('\n') if d.strip()]
            barr_list = [b.strip() for b in (latest_iep.learning_barriers or '').split('\n') if b.strip()]
            facil_list = [f.strip() for f in (latest_iep.learning_facilitators or '').split('\n') if f.strip()]
            accom_list = [a.strip() for a in (latest_iep.learning_accommodations or '').split('\n') if a.strip()]
            max_len = max(len(diff_list), len(barr_list), len(facil_list), len(accom_list), 0)

            if max_len > 0:
                sec_b_data = [[
                    Paragraph("Difficulty", style_cell_label),
                    Paragraph("Learning Barriers", style_cell_label),
                    Paragraph("Learning Facilitators", style_cell_label),
                    Paragraph("Accommodations", style_cell_label),
                ]]
                for i in range(max_len):
                    sec_b_data.append([
                        Paragraph(esc(diff_list[i] if i < len(diff_list) else '—'), style_cell_value),
                        Paragraph(esc(barr_list[i] if i < len(barr_list) else '—'), style_cell_value),
                        Paragraph(esc(facil_list[i] if i < len(facil_list) else '—'), style_cell_value),
                        Paragraph(esc(accom_list[i] if i < len(accom_list) else '—'), style_cell_value),
                    ])
                b_table = Table(sec_b_data, colWidths=[40 * mm, 42 * mm, 42 * mm, 46 * mm])
                b_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                story.append(b_table)
            else:
                story.append(Paragraph("No Section B factors recorded.", style_body))

            story.append(Spacer(1, 4 * mm))
            story.append(Paragraph("Section C: Learner's Goals", style_section_heading))
            goals = latest_iep.individual_goals.all() if hasattr(latest_iep, 'individual_goals') else []
            if goals.exists():
                for g in goals:
                    goal_header = f"<b>{esc(g.subject_category or g.goalName or 'Goal')}:</b> {esc(g.annual_goal or g.target_metric or '')}"
                    story.append(Paragraph(goal_header, style_body))
                    rows = g.objective_rows.all() if hasattr(g, 'objective_rows') else []
                    if rows.exists():
                        g_data = [[
                            Paragraph("Objective", style_cell_label),
                            Paragraph("Interventions", style_cell_label),
                            Paragraph("Timeline", style_cell_label),
                            Paragraph("Responsible", style_cell_label),
                            Paragraph("Evaluation", style_cell_label),
                        ]]
                        for r in rows:
                            g_data.append([
                                Paragraph(esc(r.enroute_objectives or '—'), style_cell_value),
                                Paragraph(esc(r.interventions_procedures or '—'), style_cell_value),
                                Paragraph(esc(r.timeline_mins_session or '—'), style_cell_value),
                                Paragraph(esc(r.individuals_responsible or '—'), style_cell_value),
                                Paragraph(esc(r.progress_instructional or '—'), style_cell_value),
                            ])
                        g_table = Table(g_data, colWidths=[36 * mm, 40 * mm, 28 * mm, 32 * mm, 34 * mm])
                        g_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
                            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                            ('TOPPADDING', (0, 0), (-1, -1), 3),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                            ('LEFTPADDING', (0, 0), (-1, -1), 4),
                            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ]))
                        story.append(g_table)
                        story.append(Spacer(1, 3 * mm))
            else:
                story.append(Paragraph("No learner goals recorded for this IEP.", style_body))

        doc.build(story)
        buffer.seek(0)
        return buffer
    
# =====================================================================
# SDD COMPONENT: StudentRecordQueryController
# Description: Dedicated API controller routing data queries. Handles secure
#              GET retrieval requests, parsing identifiers, and JSON serialization.
# =====================================================================
class StudentRecordQueryController(viewsets.ViewSet):
    # Enforces the SDD Session Authentication pipeline wrapper
    permission_classes = [SessionAuthenticationGuard]

    def list(self, request):
        """Matches Sequence Diagram: Fetching the initial list of students"""
        base_queryset = StudentProfile.objects.all()
        
        # Trigger SDD Component: ContextualDataIsolationFilter
        secure_queryset = ContextualDataIsolationFilter.enforce_tenant_isolation(base_queryset, request.user)
        
        if not secure_queryset.exists():
            return Response([], status=status.HTTP_200_OK)
            
        serializer = HistoricalRecordDataSerializer(secure_queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """Matches Class Diagram: getSpecificRecord(studentID)"""
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            student = StudentProfile.objects.get(pk=pk, teacher=teacher)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = HistoricalRecordDataSerializer(student)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Matches Class Diagram: exportRecordPDF(studentID)"""
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            student = StudentProfile.objects.get(pk=pk, teacher=teacher)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Trigger SDD Component: BinaryReportRenderEngine
        pdf_stream = BinaryReportRenderEngine.generate_report_stream(student)
        
        # Package the payload with standard download transmission headers
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="StudentRecord_{student.pk}.pdf"'
        return response
    
    
# =====================================================================
# SDD COMPONENT: ProgressAnalyticsService
# Description: Backend business logic responsible for calculating performance 
#              data, aggregating entries, and computing historical trends.
# =====================================================================
class ProgressAnalyticsService:
    @staticmethod
    def compute_historical_trends(student_id, teacher, subject_name=None):
        # 1. Fetch the raw chronological logs for the target student, scoped
        #    to records for students belonging to the requesting teacher
        queryset = StudentProgress.objects.filter(student__pk=student_id, student__teacher=teacher)

        # 2. If a specific subject is requested (e.g., "Math"), filter it down
        if subject_name:
            queryset = queryset.filter(subjectName__iexact=subject_name)
            
        # 3. Order strictly by oldest-to-newest so the React line chart draws correctly
        return queryset.order_by('dateLogged')
    
# =====================================================================
# SDD COMPONENT: ProgressAnalyticsAPIView
# Description: Dedicated API controller routing evaluation queries. Processes 
#              secure GET data requests and validates query parameters.
# =====================================================================
class ProgressAnalyticsAPIView(APIView):
    # Enforces the SDD Session Authentication pipeline wrapper
    permission_classes = [SessionAuthenticationGuard]

    def get(self, request, *args, **kwargs):
        """Matches Class Diagram: getAnalyticsData(studentID, subject)"""
        
        # 1. Matches Class Diagram: validateQueryParameters()
        student_id = request.query_params.get('studentID')
        subject = request.query_params.get('subject') # This parameter is optional initially
        
        if not student_id:
            return Response(
                {"error": "A valid studentID query parameter is required to load analytics."},
                status=status.HTTP_400_BAD_REQUEST
            )

        teacher = get_teacher_for_user(request.user)
        if not teacher or not StudentProfile.objects.filter(pk=student_id, teacher=teacher).exists():
            return Response(
                {"error": "Student record not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Trigger the SDD Component: ProgressAnalyticsService
        raw_trend_data = ProgressAnalyticsService.compute_historical_trends(student_id, teacher, subject)
        
        # Alternative Flow: No data available to graph
        if not raw_trend_data.exists():
            return Response([], status=status.HTTP_200_OK)
            
        # 3. Trigger the SDD Component: ProgressAnalyticsSerializer
        serializer = ProgressAnalyticsSerializer(raw_trend_data, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Matches SDD: Records a new progress performance log for a student."""
        student_id = request.data.get('studentID')
        subject_name = request.data.get('subjectName')
        performance_score = request.data.get('performanceScore')

        if not student_id or not subject_name or performance_score is None:
            return Response(
                {"error": "studentID, subjectName, and performanceScore are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            score = int(performance_score)
            if not (0 <= score <= 100):
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {"error": "performanceScore must be an integer between 0 and 100."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher = get_teacher_for_user(request.user)
        try:
            student = StudentProfile.objects.get(pk=student_id, teacher=teacher)
        except StudentProfile.DoesNotExist:
            return Response(
                {"error": "Student record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        record = StudentProgress.objects.create(
            student=student,
            subjectName=str(subject_name).strip(),
            performanceScore=score,
        )
        serializer = ProgressAnalyticsSerializer(record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =====================================================================
# SDD COMPONENT: StudentProgressDashboardView
# Description: Aggregates chronological StudentProgress records into
#              per-subject summaries for the Outcome Monitoring Dashboard.
# =====================================================================
class StudentProgressDashboardView(APIView):
    permission_classes = [SessionAuthenticationGuard]

    def get(self, request, *args, **kwargs):
        student_id = request.query_params.get('studentID')
        if not student_id:
            return Response(
                {"error": "A valid studentID query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher = get_teacher_for_user(request.user)
        if not teacher or not StudentProfile.objects.filter(pk=student_id, teacher=teacher).exists():
            return Response(
                {"error": "Student record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        records = (
            StudentProgress.objects
            .filter(student__pk=student_id, student__teacher=teacher)
            .order_by('dateLogged')
        )

        if not records.exists():
            return Response([], status=status.HTTP_200_OK)

        # Group chronologically by subject
        subjects_map = {}
        for rec in records:
            subj = rec.subjectName.strip() if rec.subjectName else "General"
            if subj not in subjects_map:
                subjects_map[subj] = []
            subjects_map[subj].append(rec)

        def compute_level(score):
            if score < 50:
                return "Emerging"
            elif score < 75:
                return "Developing"
            elif score < 90:
                return "Proficient"
            return "Advanced"

        results = []
        for subj_name, entries in subjects_map.items():
            latest = entries[-1]
            latest_score = latest.performanceScore
            scores = [e.performanceScore for e in entries]
            months = [e.dateLogged.strftime("%b") for e in entries]

            results.append({
                "id": latest.progressID,
                "name": subj_name,
                "progress": latest_score,
                "status": "On Track" if latest_score >= 70 else "Needs Support",
                "lastUpdated": latest.dateLogged.strftime("%B %d, %Y"),
                "currentLevel": compute_level(latest_score),
                "chartData": scores,
                "months": months,
            })

        return Response(results, status=status.HTTP_200_OK)
