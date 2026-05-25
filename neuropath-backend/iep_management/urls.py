from django.urls import path
from .views import (
    IEPGenerationAPIView, 
    IEPListAPIView, 
    IEPDetailAPIView, 
    IEPEditAPIView, 
    IEPDeleteAPIView
)

urlpatterns = [

    path('generate-iep/', IEPGenerationAPIView.as_view(), name='generate_save_iep'),

    path('student/<int:student_id>/', IEPListAPIView.as_view(), name='list_student_ieps'),
    # Get one specific IEP for the workspace overview
    path('<int:pk>/', IEPDetailAPIView.as_view(), name='detail_iep'),

    path('edit/<int:pk>/', IEPEditAPIView.as_view(), name='edit_iep'),
    
    path('delete/<int:pk>/', IEPDeleteAPIView.as_view(), name='delete_iep'),
]