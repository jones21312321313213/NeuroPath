from django.db import models
from .fields import EncryptedCharField, EncryptedTextField


class Teacher(models.Model):
    teacherID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    passwordHash = models.CharField(max_length=255)
    createdDate = models.DateTimeField(auto_now_add=True)
    has_completed_tutorial = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    studentID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacherID')

    # Basic student fields used by existing student profiling pages (name is encrypted at rest)
    name = EncryptedCharField(max_length=512, blank=True, default='')
    age = models.IntegerField(default=0)
    grade = models.IntegerField(default=0)
    gender = models.CharField(max_length=50, blank=True, default='')

    # RA 10173 (Data Privacy Act of 2012) Minor Consent Fields
    parental_consent_obtained = models.BooleanField(
        default=False,
        help_text="Explicit parental or legal guardian consent obtained under RA 10173"
    )
    consent_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when parental/guardian consent was verified"
    )
    guardian_name = EncryptedCharField(
        max_length=512,
        blank=True,
        default='',
        help_text="Full legal name of consenting parent or legal guardian"
    )
    guardian_relationship = models.CharField(
        max_length=100,
        blank=True,
        default='Parent',
        help_text="Relationship of consenting guardian to minor (e.g. Mother, Father, Legal Guardian)"
    )

    # Sensitive medical and assessment fields encrypted at rest (AES-256)
    asdBackground = EncryptedTextField(blank=True, default='')
    preferences = models.TextField(blank=True, default='')
    assessmentResult = EncryptedTextField(blank=True, default='')
    profileStatus = models.BooleanField(default=True)
    diagnosis = EncryptedTextField(blank=True, default='')
    support_needs = models.TextField(blank=True, default='')
    learning_style = models.CharField(max_length=100, blank=True, default='')
    interests = models.TextField(blank=True, default='')
    sensory_preferences = models.TextField(blank=True, default='')

    # New JSON storage for the standard IEP profile Sections A and present levels.
    # The frontend also mirrors this data into `preferences` for compatibility.
    profileDetails = models.JSONField(blank=True, default=dict)

    # Activity and update timestamps (ENH24)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name or f"Student {self.studentID}"
