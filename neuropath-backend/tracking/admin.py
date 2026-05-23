from django.contrib import admin

# Register your models here.
from .models import ProgressReport, SecurityLog,StudentProcessingLog,AIGenerationLog

admin.site.register(ProgressReport)
admin.site.register(SecurityLog)
admin.site.register(StudentProcessingLog)
admin.site.register(AIGenerationLog)