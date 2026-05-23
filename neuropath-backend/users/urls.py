from django.urls import path
from .views import StudentProfileListCreateView

urlpatterns = [
    path('students/', StudentProfileListCreateView.as_view(), name='student-create-list'),
]