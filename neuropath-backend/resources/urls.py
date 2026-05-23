from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (InstructionalSupportDashboardAPIView, LessonPlanViewSet, GenerateLessonPlanAPIView, LessonPlanReadOnlyViewSet,
LessonPlanEditAPIView,LessonPlanDeleteAPIView,VisualAidViewSet,GenerateVisualAidAPIView,ExportVisualAidAPIView)

# Initialize the router for the ViewSets
router = DefaultRouter()

# Existing 3.1 Route (Full CRUD)
router.register(r'lesson-plans', LessonPlanViewSet, basename='lessonplan')

# NEW 3.1.2 Route (Read-Only & Search)
router.register(r'view-lessons', LessonPlanReadOnlyViewSet, basename='viewlessons')

router.register(r'visual-aids', VisualAidViewSet, basename='visualaid')

urlpatterns = [
    # Dashboard Gateway (Module 3.0)
    path('instructional-support/', InstructionalSupportDashboardAPIView.as_view(), name='instructional-dashboard'),
    
    # Generation Workflow Endpoint (Module 3.1.1)
    path('generate-lesson/', GenerateLessonPlanAPIView.as_view(), name='generate-lesson-plan'),
    
    # ViewSet Endpoints (Module 3.1 and 3.1.2)
    path('', include(router.urls)),
    
    # Edit Lesson Workflow Endpoint (Module 3.1.3)
    path('edit-lesson/<int:pk>/', LessonPlanEditAPIView.as_view(), name='edit-lesson-plan'),
    
    # Delete Lesson Workflow Endpoint (Module 3.1.4)
    path('delete-lesson/<int:pk>/', LessonPlanDeleteAPIView.as_view(), name='delete-lesson-plan'),
    
    # ViewSet Endpoints
    path('', include(router.urls)),
    
    # Generate Visual Aid Workflow (Module 3.2.1)
    path('generate-visual-aid/', GenerateVisualAidAPIView.as_view(), name='generate-visual-aid'),
    
    # Export Visual Aid Workflow (Module 3.2.1)
    path('export-visual-aid/<int:pk>/', ExportVisualAidAPIView.as_view(), name='export-visual-aid'),
]