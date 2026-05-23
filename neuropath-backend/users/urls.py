from django.urls import path
from .views import StudentProfileListCreateView, ProfileUpdateController

urlpatterns = [
    path('students/', StudentProfileListCreateView.as_view(), name='student-create-list'),
    path('students/<int:pk>/', ProfileUpdateController.as_view(), name='student-detail-update')
]