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
    # The ForeignKey below honors the 'Manages' line from your ERD
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacherID')
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    grade = models.IntegerField()
    gender = models.CharField(max_length=50)
    asdBackground = models.TextField()
    preferences = models.TextField()
    assessmentResult = models.TextField()
    profileStatus = models.BooleanField(default=True)

    def __str__(self):
        return self.name