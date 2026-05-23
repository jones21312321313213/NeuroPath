from django.urls import path
from .views import IEPGenerationAPIView

urlpatterns = [
    # Endpoint for Module 2: AI-Based IEP Generation
    path('generate-iep/', IEPGenerationAPIView.as_view(), name='generate_save_iep'),
]