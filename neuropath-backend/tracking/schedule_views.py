from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError

from users.utils import get_teacher_for_user
from users.models import StudentProfile
from .models import ScheduleEvent, ScheduleEventStatus
from .serializers import ScheduleEventSerializer


class ScheduleEventViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for IEP Schedule & Progress Monitoring Calendar events.
    Strictly isolated to the authenticated teacher.
    """
    serializer_class = ScheduleEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return ScheduleEvent.objects.none()

        qs = ScheduleEvent.objects.filter(teacher=teacher).select_related('student', 'iep')

        # Filter by student
        student_id = self.request.query_params.get('studentID') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        # Filter by event_type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)

        # Filter by month and year
        month = self.request.query_params.get('month')
        if month:
            try:
                qs = qs.filter(due_date__month=int(month))
            except (ValueError, TypeError):
                pass

        year = self.request.query_params.get('year')
        if year:
            try:
                qs = qs.filter(due_date__year=int(year))
            except (ValueError, TypeError):
                pass

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(due_date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(due_date__lte=end_date)

        return qs.order_by('due_date', 'due_time', '-priority')

    def perform_create(self, serializer):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            raise PermissionDenied("Unable to verify teacher account.")

        student = serializer.validated_data.get('student')
        if student and student.teacher_id != teacher.teacherID:
            raise ValidationError({"student": "Student profile does not belong to your account."})

        serializer.save(teacher=teacher)

    def perform_update(self, serializer):
        instance = serializer.instance
        new_status = serializer.validated_data.get('status', instance.status)

        if new_status == ScheduleEventStatus.COMPLETED and instance.status != ScheduleEventStatus.COMPLETED:
            serializer.save(completed_at=timezone.now())
        elif new_status != ScheduleEventStatus.COMPLETED and instance.status == ScheduleEventStatus.COMPLETED:
            serializer.save(completed_at=None)
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Lightweight, fast endpoint for the Overview Deadline Reminder Widget.
        Returns:
          - Overdue pending events (due_date < today)
          - Approaching events in the next horizon days (default 14 days)
        """
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response([], status=status.HTTP_200_OK)

        today = timezone.now().date()
        days_param = request.query_params.get('days', '14')
        try:
            horizon_days = max(1, min(int(days_param), 90))
        except (ValueError, TypeError):
            horizon_days = 14

        horizon_date = today + timedelta(days=horizon_days)

        # Events that are either overdue OR due within the horizon date and pending
        qs = (
            ScheduleEvent.objects.filter(
                teacher=teacher,
                status=ScheduleEventStatus.PENDING,
                due_date__lte=horizon_date,
            )
            .select_related('student', 'iep')
            .order_by('due_date', 'due_time', '-priority')
        )

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        One-click status resolution: sets status='completed' and sets completed_at timestamp.
        """
        event = self.get_object()
        event.status = ScheduleEventStatus.COMPLETED
        event.completed_at = timezone.now()
        event.save(update_fields=['status', 'completed_at', 'updated_at'])
        serializer = self.get_serializer(event)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """
        One-click status rollback: sets status='pending' and clears completed_at timestamp.
        """
        event = self.get_object()
        event.status = ScheduleEventStatus.PENDING
        event.completed_at = None
        event.save(update_fields=['status', 'completed_at', 'updated_at'])
        serializer = self.get_serializer(event)
        return Response(serializer.data, status=status.HTTP_200_OK)
