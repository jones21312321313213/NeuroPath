from django.db import models


class Teacher(models.Model):
    teacherID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    passwordHash = models.CharField(max_length=255)
    createdDate = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    studentID = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacherID')

    # Basic student fields used by existing student profiling pages
    name = models.CharField(max_length=255, blank=True, default='')
    age = models.IntegerField(default=0)
    grade = models.IntegerField(default=0)
    gender = models.CharField(max_length=50, blank=True, default='')

    # Existing fields from the original backend. These are now optional so the
    # new 2-step profile form will not fail with "This field may not be blank."
    asdBackground = models.TextField(blank=True, default='')
    preferences = models.TextField(blank=True, default='')
    assessmentResult = models.TextField(blank=True, default='')
    profileStatus = models.BooleanField(default=True)
    diagnosis = models.TextField(blank=True, default='')
    support_needs = models.TextField(blank=True, default='')
    learning_style = models.CharField(max_length=100, blank=True, default='')
    interests = models.TextField(blank=True, default='')
    sensory_preferences = models.TextField(blank=True, default='')

    # New JSON storage for the standard IEP profile Sections A and present levels.
    # The frontend also mirrors this data into `preferences` for compatibility.
    profileDetails = models.JSONField(blank=True, default=dict)

    def __str__(self):
        return self.name or f"Student {self.studentID}"
