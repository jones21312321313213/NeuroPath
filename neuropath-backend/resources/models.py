from django.db import models
from users.models import StudentProfile
from iep_management.models import IEP

class LessonPlan(models.Model):
    lessonID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, db_column='iepID')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    title = models.CharField(max_length=255)
    dateCreated = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=100)

class VisualAid(models.Model):
    visualAidID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, db_column='iepID')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    title = models.CharField(max_length=255)
    imageUrl = models.URLField()
    dateCreated = models.DateTimeField(auto_now_add=True)

class TeachingStrategy(models.Model):
    strategyID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, db_column='iepID')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    title = models.CharField(max_length=255)
    strategyContent = models.TextField()
    dateCreated = models.DateTimeField(auto_now_add=True)