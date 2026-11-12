from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .schedule_views import ScheduleEventViewSet

router = DefaultRouter()
router.register(r'', ScheduleEventViewSet, basename='schedule-event')

urlpatterns = [
    path('', include(router.urls)),
]
