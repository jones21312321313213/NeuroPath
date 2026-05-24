from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OutcomeMonitoringRouter, StudentRecordQueryController, ProgressAnalyticsAPIView

# Initialize the router for Module 4 ViewSets
router = DefaultRouter()
router.register(r'student-records', StudentRecordQueryController, basename='student-records')

urlpatterns = [
    # Gateway Route (Module 4.0)
    path('gateway/', OutcomeMonitoringRouter.as_view(), name='outcome-monitoring-gateway'),
    
    # Analytics Route (Module 4.2)
    path('analytics/', ProgressAnalyticsAPIView.as_view(), name='progress-analytics'),
    
    # Sub-Module Routes (Module 4.1)
    path('', include(router.urls)),
]