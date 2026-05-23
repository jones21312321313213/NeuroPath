from django.db import models
from users.models import StudentProfile 

class Assessment(models.Model):
    assessmentID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    assessmentType = models.CharField(max_length=255)
    result = models.TextField()
    dateTaken = models.DateTimeField(auto_now_add=True)

class IEP(models.Model):
    iepID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    baselineData = models.TextField()
    goals = models.TextField()
    accomodations = models.TextField() # Spelling strictly matches ERD
    createdDate = models.DateTimeField(auto_now_add=True)
    version = models.IntegerField(default=1)

class IEPGoal(models.Model):
    goalID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, db_column='iepID')
    goalName = models.CharField(max_length=255)
    target_metric = models.CharField(max_length=255)