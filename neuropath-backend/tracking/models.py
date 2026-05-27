from django.db import models
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel as IEP

class ProgressReport(models.Model):
    reportID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, db_column='iepID')
    overallStatus = models.CharField(max_length=255)

class SecurityLog(models.Model):
    logID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.RESTRICT, db_column='teacherID')
    actionTaken = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=100)

class StudentProcessingLog(models.Model):
    progressID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.RESTRICT, db_column='teacherID')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    subjectName = models.CharField(max_length=255)
    performanceScore = models.CharField(max_length=100)
    dateRecorded = models.DateTimeField(auto_now_add=True)

class AIGenerationLog(models.Model):
    logID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacherID')
    prompt_text = models.TextField()
    ai_response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    
# =====================================================================
# UML CLASS DIAGRAM: StudentProgressModel
# Description: Defines the tracking matrix coordinates and historical 
#              performance logs for outcome monitoring.
# =====================================================================
class StudentProgress(models.Model):
    progressID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    subjectName = models.CharField(max_length=255)
    performanceScore = models.IntegerField()
    dateLogged = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.name} - {self.subjectName}: {self.performanceScore}%"