from django.urls import path
from .views import( StudentProfileListCreateView, 
                   ProfileUpdateController,
                   ProfileViewController,
                   AIInsightController,
                   TeacherCreateController)

urlpatterns = [
    path('register/', TeacherCreateController.as_view(), name='teacher-register'),
    
    path('teachers/', TeacherCreateController.as_view(), name='teacher-create'),
    
    #students
    path('students/', StudentProfileListCreateView.as_view(), name='student-create-list'),
    path('students/<int:pk>/', ProfileUpdateController.as_view(), name='student-detail-update'),
    path('students/<int:pk>/view/', ProfileViewController.as_view(), name='student-view'),
    path('students/<int:pk>/generate-insight/', AIInsightController.as_view(), name='student-generate-insight'),
]