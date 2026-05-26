from django.db import models
from users.models import StudentProfile


class Assessment(models.Model):
    assessmentID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    assessmentType = models.CharField(max_length=255)
    result = models.TextField(blank=True, default='')
    dateTaken = models.DateTimeField(auto_now_add=True)


class IEP(models.Model):
    iepID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    baselineData = models.TextField(blank=True, default='')
    goals = models.TextField(blank=True, default='')
    accomodations = models.TextField(blank=True, default='')  # Spelling strictly matches original ERD
    createdDate = models.DateTimeField(auto_now_add=True)
    version = models.IntegerField(default=1)


class IEPModel(models.Model):
    iepID = models.AutoField(primary_key=True)
    studentID = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ieps')
    baselineData = models.TextField(blank=True, default='')
    goals = models.TextField(blank=True, default='')
    accommodations = models.TextField(blank=True, default='')
    generatedDetails = models.JSONField(blank=True, default=dict)
    version = models.IntegerField(default=1)
    createdDate = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'IEP v{self.version} for Student: {self.studentID.name}'


class IEPGoal(models.Model):
    goalID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEPModel, on_delete=models.CASCADE, db_column='iepID', related_name='individual_goals')
    goalName = models.CharField(max_length=255)
    target_metric = models.CharField(max_length=255)
