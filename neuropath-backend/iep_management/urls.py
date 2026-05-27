from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import (
    IEPGenerationAPIView, 
    IEPListAPIView, 
    IEPDetailAPIView, 
    IEPEditAPIView, 
    IEPDeleteAPIView,
    StandaloneIEPGoalViewSet
)


router = DefaultRouter()
router.register(r'goals', StandaloneIEPGoalViewSet, basename='iep-goals')

urlpatterns = [

    path('generate-iep/', IEPGenerationAPIView.as_view(), name='generate_save_iep'),

    path('student/<int:student_id>/', IEPListAPIView.as_view(), name='list_student_ieps'),
    # Get one specific IEP for the workspace overview
    path('<int:pk>/', IEPDetailAPIView.as_view(), name='detail_iep'),

    path('edit/<int:pk>/', IEPEditAPIView.as_view(), name='edit_iep'),
    
    path('delete/<int:pk>/', IEPDeleteAPIView.as_view(), name='delete_iep'),
    
    
    # --- Standalone IEP Goals Router Array ---
    # This automatically includes paths like:
    # GET  /api/iep/goals/                -> List all goals
    # GET  /api/iep/goals/?student_id=XX  -> Fetch checklists specifically for a student profile!
    # GET  /api/iep/goals/<id>/           -> Read details of a specific micro-goal
    # PUT  /api/iep/goals/<id>/           -> Modify an individual goal row
    # DELETE /api/iep/goals/<id>/         -> Erase an individual goal row
    path('', include(router.urls)),
]