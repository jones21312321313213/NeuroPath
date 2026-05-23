from django.contrib import admin

# Register your models here.
from .models import LessonPlan, VisualAid,TeachingStrategy

admin.site.register(LessonPlan)
admin.site.register(VisualAid)
admin.site.register(TeachingStrategy)

