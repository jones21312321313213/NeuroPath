from django.contrib import admin

# Register your models here.
from .models import Teacher, StudentProfile

admin.site.register(Teacher)
admin.site.register(StudentProfile)