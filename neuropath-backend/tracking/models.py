from django.db import models
from django.utils import timezone
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel

class ProgressReport(models.Model):
    reportID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    iep = models.ForeignKey(IEPModel, on_delete=models.CASCADE, db_column='iepID')
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
    behavioralObservations = models.TextField(blank=True, default='')
    dateLogged = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.student.name} - {self.subjectName}: {self.performanceScore}%"


# =====================================================================
# SUBSYSTEM 5: IEP SCHEDULE & MILESTONE DEADLINE TRACKER
# Description: Supports DepEd Order No. 44, s. 2021 time-bound milestone
#              tracking, automated IEP milestone schedules, and reminders.
# =====================================================================
class ScheduleEventType(models.TextChoices):
    MONTH_1_MILESTONE = 'month_1_milestone', 'Month 1 Milestone Assessment'
    MONTH_2_MILESTONE = 'month_2_milestone', 'Month 2 Milestone Assessment'
    QUARTERLY_REVIEW = 'quarterly_review', 'Quarterly Review & Regression Check'
    ANNUAL_RENEWAL = 'annual_renewal', 'Annual IEP Renewal'
    PROGRESS_RECORDING = 'progress_recording', 'Progress Score Recording'
    CUSTOM_MEETING = 'custom_meeting', 'Parent / Multi-Disciplinary Conference'


class ScheduleEventPriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class ScheduleEventStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    OVERDUE = 'overdue', 'Overdue'
    DISMISSED = 'dismissed', 'Dismissed'


class ScheduleEvent(models.Model):
    eventID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='scheduled_events', db_column='teacherID')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='scheduled_events', db_column='studentID', null=True, blank=True)
    iep = models.ForeignKey(IEPModel, on_delete=models.CASCADE, related_name='scheduled_events', db_column='iepID', null=True, blank=True)

    title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=50, choices=ScheduleEventType.choices, default=ScheduleEventType.CUSTOM_MEETING)
    due_date = models.DateField()
    due_time = models.TimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=ScheduleEventStatus.choices, default=ScheduleEventStatus.PENDING)
    priority = models.CharField(max_length=20, choices=ScheduleEventPriority.choices, default=ScheduleEventPriority.MEDIUM)

    notes = models.TextField(blank=True, default='')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'due_time', '-priority']
        indexes = [
            models.Index(fields=['teacher', 'due_date']),
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['student', 'due_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.due_date} ({self.status})"
