from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.utils import get_teacher_for_user
from .models import Notification, ScheduleEventPriority
from .serializers import NotificationSerializer
from .scheduling_service import sync_teacher_notifications


class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'page_size': self.get_page_size(self.request),
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'unread_count': getattr(self, 'unread_count', 0),
            'high_priority_count': getattr(self, 'high_priority_count', 0),
            'results': data,
        })


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Paginated Notification History API (10 items per page).
    Syncs priority-based advance alerts (Low=1d, Medium=2d, High=3d) and
    day-of reminders, preserving full notification history per teacher.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return Notification.objects.none()

        qs = (
            Notification.objects.filter(teacher=teacher)
            .select_related('student', 'schedule_event', 'iep')
            .order_by('-created_at', '-notificationID')
        )

        status_param = (self.request.query_params.get('status') or '').strip().lower()
        if status_param == 'unread':
            qs = qs.filter(is_read=False)
        elif status_param == 'read':
            qs = qs.filter(is_read=True)

        priority_param = (self.request.query_params.get('priority') or '').strip().lower()
        if priority_param in ('low', 'medium', 'high', 'urgent'):
            qs = qs.filter(priority=priority_param)

        return qs

    def list(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if teacher:
            sync_teacher_notifications(teacher)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if self.paginator and teacher:
            base_qs = Notification.objects.filter(teacher=teacher)
            self.paginator.unread_count = base_qs.filter(is_read=False).count()
            self.paginator.high_priority_count = base_qs.filter(
                priority__in=[ScheduleEventPriority.HIGH, ScheduleEventPriority.URGENT],
                is_read=False,
            ).count()

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        teacher = get_teacher_for_user(request.user)
        if not teacher:
            return Response({'updated': 0}, status=status.HTTP_200_OK)
        updated = Notification.objects.filter(teacher=teacher, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({'updated': updated}, status=status.HTTP_200_OK)
