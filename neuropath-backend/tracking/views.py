import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets,status
from rest_framework.decorators import action
from django.http import HttpResponse
from users.models import StudentProfile
from users.utils import get_teacher_for_user
from .permissions import SessionAuthenticationGuard
from .serializers import HistoricalRecordDataSerializer,ProgressAnalyticsSerializer
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
        # Generates a standard PDF byte stream for local client-side download
        buffer = io.BytesIO()
        buffer.write(b"%PDF-1.4\n")
        
        # Inject standard layout maps and metadata text blocks
        buffer.write(f"Official Student Record: {student_record.name}\n".encode('utf-8'))
        buffer.write(f"Record ID: {student_record.pk}\n".encode('utf-8'))
        buffer.write(b"--------------------------------------------------\n\n")
        buffer.write(b"Performance Matrices & Objective Criteria Logs...\n")
        
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