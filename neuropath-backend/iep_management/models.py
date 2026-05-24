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

# =====================================================================
# SDD COMPONENT: IEPModel
# Description: Django ORM data mapping component defining the schema 
#              for an Individualized Education Program (IEP).
# =====================================================================
class IEPModel(models.Model):
    iepID = models.AutoField(primary_key=True)
    studentID = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ieps')
    baselineData = models.TextField()
    goals = models.TextField()
    accommodations = models.TextField() # Cleaned spelling to match serializer fields
    version = models.IntegerField(default=1)
    createdDate = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"IEP v{self.version} for Student: {self.studentID.name}"

# Updated to securely point to your actual active IEPModel
class IEPGoal(models.Model):
    goalID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEPModel, on_delete=models.CASCADE, db_column='iepID', related_name='individual_goals')
    goalName = models.CharField(max_length=255)
    target_metric = models.CharField(max_length=255)