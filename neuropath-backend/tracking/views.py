import io
import datetime
from django.utils import timezone
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
#              matrices into a portable binary PDF stream (6-page landscape DepEd format).
# =====================================================================
class BinaryReportRenderEngine:
    @staticmethod
    def generate_report_stream(student_record, section_b_version=None, section_c_version=None, section_b_id=None, section_c_id=None, teacher_name=None, teacher_signature=None):
        import html
        import io
        import base64
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage, HRFlowable
        )
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
        from PIL import Image as PILImage

        def esc(val):
            if val is None:
                return ""
            return html.escape(str(val))

        buffer = io.BytesIO()
        # Landscape A4: 297mm x 210mm. Margins 12mm -> Printable 273mm x 186mm
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=12 * mm,
            rightMargin=12 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )

        W = 273 * mm
        styles = getSampleStyleSheet()

        NAVY = colors.HexColor('#1F4E79')
        LIGHT_BG = colors.HexColor('#F8FAFC')
        ALT_BG = colors.HexColor('#F1F5F9')
        GRID_CLR = colors.HexColor('#94A3B8')

        title_style = ParagraphStyle(
            'DepEdTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            alignment=TA_CENTER,
            textColor=NAVY,
            spaceAfter=2,
        )
        subtitle_style = ParagraphStyle(
            'DepEdSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#475569'),
            spaceAfter=4,
        )
        banner_style = ParagraphStyle(
            'BannerStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.white,
        )
        section_title_style = ParagraphStyle(
            'SectionTitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=NAVY,
            spaceBefore=2,
            spaceAfter=4,
        )
        table_hdr = ParagraphStyle(
            'TableHdr',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.0,
            leading=10.5,
            alignment=TA_CENTER,
            textColor=colors.white,
        )
        table_cell = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10.0,
            textColor=colors.HexColor('#0F172A'),
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=10.0,
            textColor=colors.HexColor('#1E293B'),
        )
        table_cell_center = ParagraphStyle(
            'TableCellCenter',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10.0,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
        )
        table_cell_small = ParagraphStyle(
            'TableCellSmall',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=6.8,
            leading=9.0,
            textColor=colors.HexColor('#334155'),
        )
        sig_line_style = ParagraphStyle(
            'SigLineStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
        )
        sig_title_style = ParagraphStyle(
            'SigTitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#475569'),
        )

        pd = student_record.profileDetails if isinstance(student_record.profileDetails, dict) else {}
        raw_name = student_record.name or ''
        if raw_name.startswith('gAAAAA'):
            raw_name = ''
        student_name = raw_name or pd.get('studentName') or pd.get('learnerName') or 'Learner Name'
        school_val = pd.get('school') or 'DepEd Division SPED Center'
        school_year_val = pd.get('schoolYear') or '2026-2027'
        birthdate_val = pd.get('birthdate') or 'N/A'
        raw_diag = student_record.diagnosis or ''
        if raw_diag.startswith('gAAAAA'):
            raw_diag = ''
        raw_asd = student_record.asdBackground or ''
        if raw_asd.startswith('gAAAAA'):
            raw_asd = ''
        diagnosis_val = pd.get('disabilityCategory') or raw_diag or raw_asd or 'Autism Spectrum Disorder (ASD)'
        lrn_val = getattr(student_record, 'lrn', None) or pd.get('lrn') or f"LRN-{student_record.pk:06d}"
        raw_guard = getattr(student_record, 'guardian_name', None) or ''
        if raw_guard.startswith('gAAAAA'):
            raw_guard = ''
        parent_val = raw_guard or pd.get('guardianName') or pd.get('parentName') or 'Parent / Guardian'
        relationship_val = getattr(student_record, 'guardian_relationship', None) or pd.get('relationship') or 'Parent / Guardian'
        contact_val = pd.get('parentContact') or pd.get('contactNumber') or 'On File (RA 10173 Protected)'
        resolved_teacher = (teacher_name or "").strip()
        if not resolved_teacher or resolved_teacher == 'Special Education (SPED) Teacher':
            if hasattr(student_record, 'teacher') and student_record.teacher:
                resolved_teacher = student_record.teacher.name or student_record.teacher.email
        resolved_teacher = resolved_teacher or 'Special Education (SPED) Teacher'

        # Resolve IEPs for Section B and Section C
        ieps_qs = student_record.ieps.all() if hasattr(student_record, 'ieps') else None
        latest_iep = ieps_qs.order_by('-version').first() if ieps_qs and ieps_qs.exists() else None

        def _parse_int_safe(val):
            if val is None or val == "":
                return None
            try:
                return int(val)
            except (ValueError, TypeError):
                return None

        sec_b_ver = _parse_int_safe(section_b_version)
        sec_c_ver = _parse_int_safe(section_c_version)
        sec_b_pk = _parse_int_safe(section_b_id)
        sec_c_pk = _parse_int_safe(section_c_id)

        section_b_iep = None
        if ieps_qs and ieps_qs.exists():
            if sec_b_pk is not None:
                section_b_iep = ieps_qs.filter(iepID=sec_b_pk).first()
            elif sec_b_ver is not None:
                section_b_iep = ieps_qs.filter(version=sec_b_ver).first()
            if not section_b_iep and sec_b_pk is None and sec_b_ver is None:
                section_b_iep = latest_iep

        section_c_iep = None
        if ieps_qs and ieps_qs.exists():
            if sec_c_pk is not None:
                section_c_iep = ieps_qs.filter(iepID=sec_c_pk).first()
            elif sec_c_ver is not None:
                section_c_iep = ieps_qs.filter(version=sec_c_ver).first()
            if not section_c_iep and sec_c_pk is None and sec_c_ver is None:
                section_c_iep = latest_iep

        story = []

        # =========================================================================
        # PAGE 1: STUDENT PROFILE DOSSIER (LANDSCAPE)
        # =========================================================================
        story.append(Paragraph("REPUBLIC OF THE PHILIPPINES • DEPARTMENT OF EDUCATION", subtitle_style))
        story.append(Paragraph("NeuroPath — Official Student Record", title_style))
        story.append(Paragraph(f"School Year {esc(school_year_val)} • Learner Comprehensive Profile &amp; Educational Dossier", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceBefore=2, spaceAfter=8))

        p1_d1 = [
            [Paragraph("LEARNER IDENTIFICATION &amp; DEMOGRAPHICS", banner_style), ""],
            [Paragraph("Learner Full Name:", table_cell_bold), Paragraph(esc(student_name), table_cell)],
            [Paragraph("Learner Reference No. (LRN):", table_cell_bold), Paragraph(esc(str(lrn_val)), table_cell)],
            [Paragraph("Age / Grade Level:", table_cell_bold), Paragraph(esc(f"{student_record.age} years old • Grade {student_record.grade}"), table_cell)],
            [Paragraph("Gender / Date of Birth:", table_cell_bold), Paragraph(esc(f"{student_record.gender or 'N/A'} • {birthdate_val}"), table_cell)],
            [Paragraph("Primary Diagnosis / Classification:", table_cell_bold), Paragraph(esc(diagnosis_val), table_cell)],
            [Paragraph("ASD Developmental Baseline:", table_cell_bold), Paragraph(esc(student_record.asdBackground or pd.get('diagnosisDetails') or 'Level 1 ASD requiring supportive structure'), table_cell)],
        ]
        t1_left = Table(p1_d1, colWidths=[45 * mm, 85 * mm])
        t1_left.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), NAVY),
            ('BOX', (0, 0), (-1, -1), 0.75, GRID_CLR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0, 1), (0, -1), ALT_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))

        p1_d2 = [
            [Paragraph("EDUCATIONAL PLACEMENT &amp; GUARDIAN INFORMATION", banner_style), ""],
            [Paragraph("Enrolled School:", table_cell_bold), Paragraph(esc(school_val), table_cell)],
            [Paragraph("Assigned SPED Teacher:", table_cell_bold), Paragraph(esc(resolved_teacher), table_cell)],
            [Paragraph("Parent / Guardian Name:", table_cell_bold), Paragraph(esc(parent_val), table_cell)],
            [Paragraph("Relationship to Learner:", table_cell_bold), Paragraph(esc(relationship_val), table_cell)],
            [Paragraph("Contact Number / Details:", table_cell_bold), Paragraph(esc(contact_val), table_cell)],
            [Paragraph("Learning Style &amp; Modality:", table_cell_bold), Paragraph(esc(student_record.learning_style or 'Visual / Kinesthetic structured task cues'), table_cell)],
        ]
        t1_right = Table(p1_d2, colWidths=[45 * mm, 85 * mm])
        t1_right.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), NAVY),
            ('BOX', (0, 0), (-1, -1), 0.75, GRID_CLR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0, 1), (0, -1), ALT_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ]))

        top_row = Table([[t1_left, Paragraph("", table_cell), t1_right]], colWidths=[130 * mm, 13 * mm, 130 * mm])
        top_row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(top_row)
        story.append(Spacer(1, 6 * mm))

        p1_summary = [
            [Paragraph("EDUCATIONAL SUPPORT ENVIRONMENT &amp; STATUTORY COMPLIANCE", banner_style), ""],
            [Paragraph("Support Needs &amp; Sensitivities:", table_cell_bold), Paragraph(esc(student_record.support_needs or pd.get('academicNeeds') or 'Sensory calming breaks, visual schedule aids, predictable transitions'), table_cell)],
            [Paragraph("Sensory Preferences:", table_cell_bold), Paragraph(esc(student_record.sensory_preferences or 'Low-noise workstations, fidget access, high-contrast visual materials'), table_cell)],
            [Paragraph("Philippine RA 10173 Status:", table_cell_bold), Paragraph("Verified Parental Consent &amp; Disclosure on file; PII protected with Fernet AES-128-CBC encryption at rest.", table_cell)],
        ]
        t1_bottom = Table(p1_summary, colWidths=[55 * mm, 218 * mm])
        t1_bottom.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), NAVY),
            ('BOX', (0, 0), (-1, -1), 0.75, GRID_CLR),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0, 1), (0, -1), ALT_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t1_bottom)

        # =========================================================================
        # PAGE 2: I. PLAAFP (from PLAAFP.png)
        # =========================================================================
        story.append(PageBreak())
        story.append(Paragraph("I. Present Levels of Academic Achievement and Functional Performance (PLAAFP)", section_title_style))

        present_eval = pd.get('presentEvaluation') or student_record.assessmentResult or "Fails to finish task/activity most of the time. Difficulty in concentrating and paying attention. Does certain repetitive behaviors when frustrated."
        strengths = pd.get('academicStrengths') or "Spells words using alphabet blocks, pairs big and small letters, arranges sequential items from A-Z. Improved eye contact and familiar command responses."
        needs = pd.get('academicNeeds') or student_record.support_needs or "Needs structured routines, visual task supports, shortened activities, sensory breaks, and positive reinforcement to improve attention and task completion."
        concerns = pd.get('parentalConcerns') or "Parents desire enhanced functional communication, independent self-care skills (feeding/toilet), and improved peer interactions during group learning."
        curriculum_impact = pd.get('curriculumImpact') or "Difficulty concentrating, inattentive without visual prompt, fails to complete structured tasks independently, impacting standard curriculum participation."

        def make_plaafp_block(title, content_text, min_lines=3):
            rows = [[Paragraph(f"<b>{title}</b>", banner_style)]]
            lines = [l.strip() for l in content_text.split('\n') if l.strip()]
            if not lines:
                lines = [content_text]
            for l in lines:
                rows.append([Paragraph(esc(l), table_cell)])
            while len(rows) - 1 < min_lines:
                rows.append([Paragraph("&nbsp;", table_cell)])
            tbl = Table(rows, colWidths=[W])
            tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), NAVY),
                ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            return tbl

        story.append(make_plaafp_block("Results of initial or most recent evaluation and results of school assessments:", present_eval, min_lines=3))
        story.append(Spacer(1, 3 * mm))
        story.append(make_plaafp_block("Description of academic, developmental, and/or functional strengths:", strengths, min_lines=3))
        story.append(Spacer(1, 3 * mm))
        story.append(make_plaafp_block("Description of academic, developmental, and/or functional needs:", needs, min_lines=3))
        story.append(Spacer(1, 3 * mm))
        story.append(make_plaafp_block("Parental concerns regarding their child's education:", concerns, min_lines=2))
        story.append(Spacer(1, 3 * mm))
        story.append(make_plaafp_block("Impact of the disability on involvement and progress in the general education curriculum (for preschool, how the disability affects participation in appropriate activities):", curriculum_impact, min_lines=2))

        # =========================================================================
        # PAGE 3: SECTION B (from SECTION_B.png)
        # =========================================================================
        story.append(PageBreak())
        sec_b_title_text = "Section B: Difficulties, Barriers, and Enabling Supports"
        if section_b_iep and section_b_iep.version:
            sec_b_title_text += f" (Version {section_b_iep.version})"
        story.append(Paragraph(sec_b_title_text, section_title_style))

        if not section_b_iep and sec_b_ver:
            story.append(Paragraph(f"No Section B factors recorded for version {sec_b_ver}.", table_cell))
        else:
            story.append(Paragraph("CONSIDERATIONS OF SPECIAL FACTORS", section_title_style))
            story.append(Paragraph("<b>INSTRUCTION:</b> Indicate all difficulties and assistive technology/devices needed.", subtitle_style))
            
            sec_b_diffs = []
            sec_b_at = []
            sec_b_barriers = []
            sec_b_facils = []
            sec_b_accoms = []

            if section_b_iep:
                sec_b_diffs = [d.strip() for d in (section_b_iep.difficulties or '').split('\n') if d.strip()]
                sec_b_barriers = [b.strip() for b in (section_b_iep.learning_barriers or '').split('\n') if b.strip()]
                sec_b_facils = [f.strip() for f in (section_b_iep.learning_facilitators or '').split('\n') if f.strip()]
                sec_b_accoms = [a.strip() for a in (section_b_iep.learning_accommodations or '').split('\n') if a.strip()]
                if isinstance(section_b_iep.generatedDetails, dict):
                    barrier_rows = section_b_iep.generatedDetails.get('barrierRows', [])
                    if barrier_rows and not sec_b_diffs:
                        sec_b_diffs = [r.get('difficulty', '') for r in barrier_rows]
                        sec_b_barriers = [r.get('barrierQualifier', '') for r in barrier_rows]
                        sec_b_facils = [r.get('facilitator', '') for r in barrier_rows]
                        sec_b_accoms = [r.get('accommodation', '') for r in barrier_rows]
                    sec_b_at = section_b_iep.generatedDetails.get('assistiveTech', [])

            if not sec_b_diffs and not section_b_iep:
                sec_b_diffs = ["Difficulty in Communicating", "Difficulty in displaying Interpersonal Behavior"]
            if not sec_b_at and not section_b_iep:
                sec_b_at = ["Picture Exchange Communication System (PECS)\nCommunication boards\nAAC device", "Visual schedule apps\nDigital task boards\nRoutine reminder devices"]
            if not sec_b_barriers and not section_b_iep:
                sec_b_barriers = ["Severe barrier 5 and beyond", "Moderate barrier 3-4 manifestations"]
            if not sec_b_facils and not section_b_iep:
                sec_b_facils = ["Speech therapist / parents / SNED Teachers", "SNED teacher and Occupational therapist"]
            if not sec_b_accoms and not section_b_iep:
                sec_b_accoms = ["Use visual gestures, tablet communication board, etc.", "Engage in cooperative play activities with at least 1 peer for 5 minutes."]

            consid_data = [[
                Paragraph("DIFFICULTY/IES", table_hdr),
                Paragraph("ASSISTIVE TECHNOLOGY/DEVICE/S NEEDED", table_hdr),
            ]]
            num_consid = max(len(sec_b_diffs), len(sec_b_at))
            for i in range(num_consid):
                d_val = sec_b_diffs[i] if i < len(sec_b_diffs) else "—"
                at_val = sec_b_at[i] if i < len(sec_b_at) else "—"
                consid_data.append([
                    Paragraph(esc(d_val), table_cell_bold),
                    Paragraph(esc(at_val).replace('\n', '<br/>'), table_cell),
                ])
            while len(consid_data) < 5:
                consid_data.append([Paragraph("&nbsp;", table_cell), Paragraph("&nbsp;", table_cell)])

            consid_table = Table(consid_data, colWidths=[80 * mm, 193 * mm])
            consid_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), NAVY),
                ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(consid_table)
            story.append(Spacer(1, 4 * mm))

            story.append(Paragraph(sec_b_title_text, section_title_style))
            sec_b_data = [[
                Paragraph("DIFFICULTY<br/>(enter all areas of difficulty)", table_hdr),
                Paragraph("LEARNING BARRIERS<br/>(describe each factor restricting participation)", table_hdr),
                Paragraph("LEARNING FACILITATORS<br/>(describe each factor enabling participation)", table_hdr),
                Paragraph("ACCOMMODATIONS<br/>(list items, staff/resources, infrastructure)", table_hdr),
            ]]
            num_b_rows = max(len(sec_b_diffs), len(sec_b_barriers), len(sec_b_facils), len(sec_b_accoms))
            for i in range(num_b_rows):
                sec_b_data.append([
                    Paragraph(esc(sec_b_diffs[i] if i < len(sec_b_diffs) else "—"), table_cell_bold),
                    Paragraph(esc(sec_b_barriers[i] if i < len(sec_b_barriers) else "—"), table_cell),
                    Paragraph(esc(sec_b_facils[i] if i < len(sec_b_facils) else "—"), table_cell),
                    Paragraph(esc(sec_b_accoms[i] if i < len(sec_b_accoms) else "—"), table_cell),
                ])
            while len(sec_b_data) < 5:
                sec_b_data.append([Paragraph("&nbsp;", table_cell)] * 4)

            sec_b_table = Table(sec_b_data, colWidths=[58 * mm, 71 * mm, 71 * mm, 73 * mm])
            sec_b_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), NAVY),
                ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(sec_b_table)

        # =========================================================================
        # PAGE 4: SECTION C (from SECTION_C.png)
        # =========================================================================
        story.append(PageBreak())
        sec_c_title_text = "Section C: Learner's Goals"
        if section_c_iep and section_c_iep.version:
            sec_c_title_text += f" (Version {section_c_iep.version})"
        story.append(Paragraph(sec_c_title_text, section_title_style))

        if not section_c_iep and sec_c_ver:
            story.append(Paragraph(f"No learner goals recorded for version {sec_c_ver}.", table_cell))
        else:
            story.append(Paragraph("Selection of Barriers and Qualifiers for Learning Barriers and Facilitators", section_title_style))
            story.append(Paragraph("Based on the teacher's observation, utilize the standardized DepEd assessment matrix below:", subtitle_style))

            qual_data = [
                [
                    Paragraph("DIFFICULTIES<br/>(select all relevant categories)", table_hdr),
                    Paragraph("Qualifier for Learning Barriers", table_hdr),
                    Paragraph("Qualifier for Learning Facilitators", table_hdr),
                ],
                [
                    Paragraph(
                        "• Difficulty in Displaying Interpersonal Behavior<br/>"
                        "• Difficulty in Basic Learning &amp; Applying Knowledge<br/>"
                        "• Difficulty in Communicating<br/>"
                        "• Difficulty in Mobility<br/>"
                        "• Difficulty in Hearing<br/>"
                        "• Difficulty in Seeing<br/>"
                        "• Difficulty in Remembering or Concentrating<br/>"
                        "• Difficulty in Performing Adaptive Skills",
                        table_cell_small
                    ),
                    Paragraph(
                        "<b>1. No barrier:</b> no manifestation<br/>"
                        "<b>2. Mild barrier:</b> 1-2 manifestations<br/>"
                        "<b>3. Moderate barrier:</b> 3-4 manifestations<br/>"
                        "<b>4. Severe barrier:</b> 5 and beyond<br/>"
                        "<i>(Characteristics manifestation)</i>",
                        table_cell_small
                    ),
                    Paragraph(
                        "<b>No barrier:</b> no manifestation (Parents)<br/>"
                        "<b>Mild barrier:</b> 1-2 manifestations (SPED / OT)<br/>"
                        "<b>Moderate barrier:</b> 3-4 manifestations (SPED, Reg. Teacher, Parents)<br/>"
                        "<b>Severe barrier:</b> 5 and beyond (Multi-Disciplinary Team)<br/>"
                        "<i>Note: Needed Facilitator depends upon the Doctor's recommendation.</i>",
                        table_cell_small
                    ),
                ]
            ]
            qual_table = Table(qual_data, colWidths=[90 * mm, 88 * mm, 95 * mm])
            qual_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), NAVY),
                ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(qual_table)
            story.append(Spacer(1, 4 * mm))

            story.append(Paragraph(sec_c_title_text, section_title_style))

            goal_1_name = "CARE SKILLS"
            goal_1_annual = f"At the end of the year {student_name} can demonstrate understanding of the basic concepts in daily self-care routines including handwashing, toileting, dressing, and managing personal belongings with visual supports and minimal adult assistance."
            
            g1_rows_data = []
            all_goals = []
            if section_c_iep:
                from resources.views import _sync_goals_from_generated_details
                _sync_goals_from_generated_details(section_c_iep)
                all_goals = list(section_c_iep.individual_goals.all()) if hasattr(section_c_iep, 'individual_goals') else []
                if all_goals:
                    g_first = all_goals[0]
                    goal_1_name = g_first.subject_category or g_first.goalName or "CARE SKILLS"
                    if g_first.annual_goal:
                        goal_1_annual = g_first.annual_goal
                    for r in g_first.objective_rows.all():
                        g1_rows_data.append([
                            Paragraph(esc(r.enroute_objectives or '—'), table_cell),
                            Paragraph(esc(r.interventions_procedures or '—').replace('\n', '<br/>'), table_cell),
                            Paragraph(esc(r.timeline_mins_session or '—'), table_cell_center),
                            Paragraph(esc(r.individuals_responsible or 'SPED Teacher, Parents'), table_cell_center),
                            Paragraph(esc(r.progress_instructional or 'Satisfactory progress observed'), table_cell),
                            Paragraph(esc(r.remarks or 'Handwritten based on actual learning'), table_cell),
                        ])

            if not g1_rows_data and not section_c_iep:
                g1_rows_data = [
                    [
                        Paragraph("1. Show understanding of the basic concepts of daily self-care hygiene including handwashing, toileting, dressing, and managing personal belongings.<br/><b>(TP-CS-eT-NG-1)</b>", table_cell),
                        Paragraph("<b>(Mother Tongue) Verbal</b><br/>• Demonstrate hand washing independently using proper steps (turn on water, apply soap, scrub, rinse, dry)<br/>• Distinguish things needed in handwashing and toileting", table_cell),
                        Paragraph("Whole year round<br/><br/>15 to 20 minutes every day (based on learner's ability)", table_cell_center),
                        Paragraph("SNED Teacher<br/><br/>Parents<br/><br/>Guardian", table_cell_center),
                        Paragraph("Able to perform hand washing properly.<br/><br/>Can identify / recognize things used in hand washing and in toileting.", table_cell),
                        Paragraph("Handwritten based on actual learning", table_cell),
                    ]
                ]

            sec_c_banner_row = [
                [Paragraph(f"NON-GRADED LEVEL — {esc(goal_1_name)}", banner_style), "", "", "", "", ""],
                [Paragraph(f"<b>Annual Goal / Long Term:</b> {esc(goal_1_annual)}", table_cell_bold), "", "", "", "", ""],
                [
                    Paragraph("ENROUTE OBJECTIVES<br/>(Harvest from K-12 Curriculum)", table_hdr),
                    Paragraph("INTERVENTIONS / ACTIVITIES / PROCEDURE<br/>(Harvest from K-12 Curriculum)", table_hdr),
                    Paragraph("TIMELINE / MINS / SESSION", table_hdr),
                    Paragraph("INDIVIDUALS RESPONSIBLE", table_hdr),
                    Paragraph("PROGRESS / INSTRUCTIONAL EVALUATION", table_hdr),
                    Paragraph("REMARKS<br/>(Handwritten based on actual learning)", table_hdr),
                ]
            ]
            for r in g1_rows_data:
                sec_c_banner_row.append(r)
            while len(sec_c_banner_row) < 5:
                sec_c_banner_row.append([Paragraph("&nbsp;", table_cell)] * 6)

            table_p4 = Table(sec_c_banner_row, colWidths=[48 * mm, 66 * mm, 38 * mm, 35 * mm, 46 * mm, 40 * mm])
            table_p4.setStyle(TableStyle([
                ('SPAN', (0, 0), (5, 0)),
                ('BACKGROUND', (0, 0), (5, 0), NAVY),
                ('SPAN', (0, 1), (5, 1)),
                ('BACKGROUND', (0, 1), (5, 1), ALT_BG),
                ('BACKGROUND', (0, 2), (5, 2), NAVY),
                ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(table_p4)

        # =========================================================================
        # PAGE 5: AI GENERATED IEP (from FORMAT_FOR_THE_AI_GENERATION.png)
        # =========================================================================
        story.append(PageBreak())
        
        goal_2_name = "MATHEMATICS & NUMERACY"
        goal_2_annual = f"At the end of the year {student_name} can be able to count the numbers 0-10, identify numerals, and perform one-to-one object correspondence."
        g2_rows_data = []

        all_goals_p5 = list(section_c_iep.individual_goals.all()) if (section_c_iep and hasattr(section_c_iep, 'individual_goals')) else []
        if len(all_goals_p5) > 1:
            g_sec = all_goals_p5[1]
            goal_2_name = g_sec.subject_category or g_sec.goalName or "MATHEMATICS"
            if g_sec.annual_goal:
                goal_2_annual = g_sec.annual_goal
            for r in g_sec.objective_rows.all():
                g2_rows_data.append([
                    Paragraph(esc(r.enroute_objectives or '—'), table_cell),
                    Paragraph(esc(r.interventions_procedures or '—').replace('\n', '<br/>'), table_cell),
                    Paragraph(esc(r.timeline_mins_session or '—'), table_cell_center),
                    Paragraph(esc(r.individuals_responsible or 'SPED Teacher, Parents'), table_cell_center),
                    Paragraph(esc(r.progress_instructional or 'Satisfactory evaluation recorded'), table_cell),
                    Paragraph(esc(r.remarks or 'Handwritten based on actual learning'), table_cell),
                ])
        elif len(all_goals_p5) == 1:
            g_sec = all_goals_p5[0]
            goal_2_name = g_sec.subject_category or g_sec.goalName or "TARGET GOAL SPECIFICATION"
            if g_sec.annual_goal:
                goal_2_annual = g_sec.annual_goal
            for r in g_sec.objective_rows.all():
                g2_rows_data.append([
                    Paragraph(esc(r.enroute_objectives or '—'), table_cell),
                    Paragraph(esc(r.interventions_procedures or '—').replace('\n', '<br/>'), table_cell),
                    Paragraph(esc(r.timeline_mins_session or '—'), table_cell_center),
                    Paragraph(esc(r.individuals_responsible or 'SPED Teacher, Parents'), table_cell_center),
                    Paragraph(esc(r.progress_instructional or 'Satisfactory evaluation recorded'), table_cell),
                    Paragraph(esc(r.remarks or 'Handwritten based on actual learning'), table_cell),
                ])

        if not g2_rows_data and not section_c_iep:
            g2_rows_data = [
                [
                    Paragraph("Recognizing numbers from 0-10<br/><br/><b>(TP-MFP-nv-NG-1)</b>", table_cell),
                    Paragraph("<b>(Mother Tongue)</b><br/>Familiarize the number figures from 1-10.<br/><i>(based on learner's ability)</i>", table_cell),
                    Paragraph("1 week<br/><br/>15-20 minutes every day<br/><i>(based on learner's ability)</i>", table_cell_center),
                    Paragraph("SPED Teacher<br/><br/>Parents / Guardians", table_cell_center),
                    Paragraph("Identify numbers from 0-10 with tactile counters.", table_cell),
                    Paragraph("Handwritten based on actual learning", table_cell),
                ],
                [
                    Paragraph("Counting Objects with one-to-one correspondence up to quantity of 10<br/><br/><b>(TP-MFP-nv-NG-2)</b>", table_cell),
                    Paragraph("<b>(Mother Tongue)</b><br/>Visual count using real objects / counters 0-10<br/><i>(based on learner's ability)</i>", table_cell),
                    Paragraph("2 weeks<br/><br/>15-20 minutes every day<br/><i>(based on learner's ability)</i>", table_cell_center),
                    Paragraph("SPED Teacher<br/><br/>Parents / Guardians", table_cell_center),
                    Paragraph("Able to count visually objects from 0-10 accurately.", table_cell),
                    Paragraph("Handwritten based on actual learning", table_cell),
                ],
                [
                    Paragraph("Read/trace and write numerals up to 10 in symbols and in words.<br/><br/><b>(TP-MFP-nv-NG-4)</b>", table_cell),
                    Paragraph("<b>(Mother Tongue)</b><br/>Name, write, and trace<br/><i>(based on learner's ability)</i>", table_cell),
                    Paragraph("3 weeks<br/><br/>15-20 minutes every day<br/><i>(based on learner's ability)</i>", table_cell_center),
                    Paragraph("SPED Teacher<br/><br/>Parents / Guardians", table_cell_center),
                    Paragraph("Able to write numbers from 1-10 in figure and in words.", table_cell),
                    Paragraph("Handwritten based on actual learning", table_cell),
                ]
            ]

        table_p5_rows = [
            [Paragraph(f"AI-GENERATED IEP SPECIFICATION — {esc(goal_2_name)}", banner_style), "", "", "", "", ""],
            [Paragraph(f"<b>Annual Goal / Long Term:</b> {esc(goal_2_annual)}", table_cell_bold), "", "", "", "", ""],
            [
                Paragraph("ENROUTE OBJECTIVES<br/>(Harvest from K-12 Curriculum)", table_hdr),
                Paragraph("INTERVENTIONS / ACTIVITIES / PROCEDURE<br/>(Harvest from K-12 Curriculum)", table_hdr),
                Paragraph("TIMELINE / MINS / SESSION", table_hdr),
                Paragraph("INDIVIDUALS RESPONSIBLE", table_hdr),
                Paragraph("PROGRESS / INSTRUCTIONAL EVALUATION", table_hdr),
                Paragraph("REMARKS<br/>(Handwritten based on actual learning)", table_hdr),
            ]
        ]
        for r in g2_rows_data:
            table_p5_rows.append(r)
        while len(table_p5_rows) < 6:
            table_p5_rows.append([Paragraph("&nbsp;", table_cell)] * 6)

        table_p5 = Table(table_p5_rows, colWidths=[48 * mm, 66 * mm, 38 * mm, 35 * mm, 46 * mm, 40 * mm])
        table_p5.setStyle(TableStyle([
            ('SPAN', (0, 0), (5, 0)),
            ('BACKGROUND', (0, 0), (5, 0), NAVY),
            ('SPAN', (0, 1), (5, 1)),
            ('BACKGROUND', (0, 1), (5, 1), ALT_BG),
            ('BACKGROUND', (0, 2), (5, 2), NAVY),
            ('BOX', (0, 0), (-1, -1), 0.75, NAVY),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(table_p5)

        # =========================================================================
        # PAGE 6: TEACHER & STUDENT SIGNATURE PAGE (CENTERED)
        # =========================================================================
        story.append(PageBreak())

        # Vertical centering on landscape A4 (printable height 186mm)
        story.append(Spacer(1, 65 * mm))

        t_sig_flowable = Spacer(1, 24 * mm)
        if teacher_signature:
            try:
                raw_b64 = teacher_signature
                if ',' in raw_b64:
                    raw_b64 = raw_b64.split(',', 1)[1]
                img_bytes = base64.b64decode(raw_b64)
                img_io = io.BytesIO(img_bytes)
                pil_img = PILImage.open(img_io)
                img_io.seek(0)
                t_sig_flowable = RLImage(img_io, width=50 * mm, height=22 * mm)
            except Exception:
                t_sig_flowable = Spacer(1, 24 * mm)

        student_space_flowable = Spacer(1, 24 * mm)

        sig_line_style = ParagraphStyle(
            'SigLineStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
        )
        sig_name_style = ParagraphStyle(
            'SigNameStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#0F172A'),
        )
        sig_label_style = ParagraphStyle(
            'SigLabelStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#475569'),
        )

        sig_line = "____________________________________________"

        sig_table_data = [
            [t_sig_flowable, student_space_flowable],
            [
                Paragraph(sig_line, sig_line_style),
                Paragraph(sig_line, sig_line_style),
            ],
            [
                Paragraph(f"<b>{esc(resolved_teacher.upper())}</b>", sig_name_style),
                Paragraph(f"<b>{esc(student_name.upper())}</b>", sig_name_style),
            ],
            [
                Paragraph("Teacher", sig_label_style),
                Paragraph("Student", sig_label_style),
            ],
        ]

        sig_table = Table(sig_table_data, colWidths=[110 * mm, 110 * mm])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, 0), 'BOTTOM'),
            ('VALIGN', (0, 1), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))

        outer_sig = Table([[Paragraph("", table_cell), sig_table, Paragraph("", table_cell)]], colWidths=[26.5 * mm, 220 * mm, 26.5 * mm])
        outer_sig.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(outer_sig)

        doc.build(story)
        buffer.seek(0)
        return buffer

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

    @action(detail=True, methods=['get', 'post'])
    def export(self, request, pk=None):
        """Matches Class Diagram: exportRecordPDF(studentID)"""
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            student = StudentProfile.objects.get(pk=pk, teacher=teacher)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student record not found."}, status=status.HTTP_404_NOT_FOUND)
            
        is_post_dict = isinstance(request.data, dict)
        section_b_version = request.query_params.get('section_b_version') or (request.data.get('section_b_version') if is_post_dict else None)
        section_c_version = request.query_params.get('section_c_version') or (request.data.get('section_c_version') if is_post_dict else None)
        section_b_id = request.query_params.get('section_b_id') or (request.data.get('section_b_id') if is_post_dict else None)
        section_c_id = request.query_params.get('section_c_id') or (request.data.get('section_c_id') if is_post_dict else None)
        teacher_signature = (request.data.get('teacher_signature') if is_post_dict else None) or request.query_params.get('teacher_signature')
        teacher_name = (request.data.get('teacher_name') if is_post_dict else None) or request.query_params.get('teacher_name')
        if not teacher_name:
            if teacher and teacher.name:
                teacher_name = teacher.name
            elif request.user:
                full_name = f"{getattr(request.user, 'first_name', '')} {getattr(request.user, 'last_name', '')}".strip()
                teacher_name = full_name or getattr(request.user, 'username', '') or "Special Education Teacher"

        # Trigger SDD Component: BinaryReportRenderEngine
        pdf_stream = BinaryReportRenderEngine.generate_report_stream(
            student,
            section_b_version=section_b_version,
            section_c_version=section_c_version,
            section_b_id=section_b_id,
            section_c_id=section_c_id,
            teacher_name=teacher_name,
            teacher_signature=teacher_signature,
        )
        
        # Package the payload with standard download transmission headers
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="StudentRecord_{student.pk}.pdf"'
        return response
    
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
        student_id = request.query_params.get('studentID') or request.query_params.get('student_id')
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
        student_id = request.data.get('studentID') or request.data.get('student_id')
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
        student_id = request.query_params.get('studentID') or request.query_params.get('student_id')
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


def _resolve_student_display_name(student):
    if not student:
        return "Student"
    raw = getattr(student, 'name', '') or ''
    if raw.startswith("gAAAAA"):
        raw = ''
    pd = getattr(student, 'profileDetails', None)
    pd_dict = pd if isinstance(pd, dict) else {}
    return raw or pd_dict.get("studentName") or pd_dict.get("learnerName") or f"Student {getattr(student, 'pk', '')}"

# =====================================================================
# SDD COMPONENT: RecentActivityAPIView (ENH30)
# Description: Aggregates recent classroom events across IEP generation,
#              student profiles, and progress monitoring into a unified feed.
# =====================================================================
class RecentActivityAPIView(APIView):
    permission_classes = [SessionAuthenticationGuard]

    def get(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response([], status=status.HTTP_200_OK)

        activities = []

        # Slices up to query_limit for each category so that after combining and
        # chronological sorting, the top `limit` activities across all categories are returned.
        limit_param = request.query_params.get('limit')
        try:
            limit = int(limit_param) if limit_param is not None else 15
            limit = max(1, min(limit, 50))
        except (ValueError, TypeError):
            limit = 15

        query_limit = max(limit, 20)

        # 1. Recent IEPs for teacher's students
        from iep_management.models import IEPModel
        recent_ieps = (
            IEPModel.objects.filter(studentID__teacher=teacher)
            .select_related('studentID')
            .order_by('-createdDate')[:query_limit]
        )
        for iep in recent_ieps:
            student_name = _resolve_student_display_name(iep.studentID)
            status_desc = "Archived" if iep.is_archived else "Active"
            activities.append({
                "id": f"iep-{iep.iepID}",
                "type": "iep",
                "title": f"IEP v{iep.version} for {student_name}",
                "description": f"Individualized Education Plan ({status_desc})",
                "timestamp": iep.createdDate.isoformat() if iep.createdDate else None,
                "student_id": iep.studentID_id,
                "student_name": student_name,
                "target_path": "/dashboard/iep",
                "_sort_key": iep.createdDate,
            })

        # 2. Recent Student Profiles
        recent_students = (
            StudentProfile.objects.filter(teacher=teacher)
            .order_by('-updated_at')[:query_limit]
        )
        for student in recent_students:
            timestamp = student.updated_at or student.created_at
            desc_parts = []
            if student.grade is not None:
                desc_parts.append(f"Grade {student.grade}")
            raw_diag = student.diagnosis or ""
            if raw_diag.startswith("gAAAAA"):
                pd = student.profileDetails if isinstance(student.profileDetails, dict) else {}
                raw_diag = pd.get("disabilityCategory") or ""
            if raw_diag:
                desc_parts.append(raw_diag)
            description = " • ".join(desc_parts) if desc_parts else "Student Profile configured"
            s_name = _resolve_student_display_name(student)

            activities.append({
                "id": f"student-{student.studentID}",
                "type": "student",
                "title": f"Profile updated: {s_name}",
                "description": description,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "student_id": student.studentID,
                "student_name": s_name,
                "target_path": f"/dashboard/students/{student.studentID}",
                "_sort_key": timestamp,
            })

        # 3. Recent Progress Logs
        recent_progress = (
            StudentProgress.objects.filter(student__teacher=teacher)
            .select_related('student')
            .order_by('-dateLogged')[:query_limit]
        )
        for prog in recent_progress:
            student_name = _resolve_student_display_name(prog.student)
            activities.append({
                "id": f"progress-{prog.progressID}",
                "type": "progress",
                "title": f"Progress logged for {student_name}",
                "description": f"{prog.subjectName}: {prog.performanceScore}%",
                "timestamp": prog.dateLogged.isoformat() if prog.dateLogged else None,
                "student_id": prog.student_id,
                "student_name": student_name,
                "target_path": "/dashboard/progress-monitoring",
                "_sort_key": prog.dateLogged,
            })

        def get_sort_key(item):
            val = item.get("_sort_key")
            if not val:
                return timezone.make_aware(datetime.datetime(1970, 1, 1))
            if timezone.is_naive(val):
                return timezone.make_aware(val)
            return val

        activities.sort(key=get_sort_key, reverse=True)

        response_data = []
        for item in activities[:limit]:
            clean_item = {k: v for k, v in item.items() if k != "_sort_key"}
            response_data.append(clean_item)

        return Response(response_data, status=status.HTTP_200_OK)

