from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InstructionalSupportDashboardAPIView, LessonPlanViewSet, GenerateLessonPlanAPIView, LessonPlanReadOnlyViewSet,LessonPlanEditAPIView

# Initialize the router for the ViewSets
router = DefaultRouter()

# Existing 3.1 Route (Full CRUD)
router.register(r'lesson-plans', LessonPlanViewSet, basename='lessonplan')

# NEW 3.1.2 Route (Read-Only & Search)
router.register(r'view-lessons', LessonPlanReadOnlyViewSet, basename='viewlessons')

urlpatterns = [
    # Dashboard Gateway (Module 3.0)
    path('instructional-support/', InstructionalSupportDashboardAPIView.as_view(), name='instructional-dashboard'),
    
    # Generation Workflow Endpoint (Module 3.1.1)
    path('generate-lesson/', GenerateLessonPlanAPIView.as_view(), name='generate-lesson-plan'),
    
    # ViewSet Endpoints (Module 3.1 and 3.1.2)
    path('', include(router.urls)),
    
    # Edit Lesson Workflow Endpoint (Module 3.1.3)
    path('edit-lesson/<int:pk>/', LessonPlanEditAPIView.as_view(), name='edit-lesson-plan'),
]