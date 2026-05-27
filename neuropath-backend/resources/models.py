from django.db import models
from users.models import StudentProfile
from iep_management.models import IEPModel as IEP
from iep_management.models import IEPGoal  # 🚀 Cross-app import to target specific goals

class LessonPlan(models.Model):
    lessonID = models.AutoField(primary_key=True)
    # 🔗 Changed to link directly to the specific target goal!
    iep_goal = models.ForeignKey(IEPGoal, on_delete=models.CASCADE, related_name='lesson_plans')
    title = models.CharField(max_length=255)
    lessonContent = models.TextField(blank=True, null=True) # Holds the generated text plan
    status = models.CharField(max_length=100, default='Draft')
    dateCreated = models.DateTimeField(auto_now_add=True)

class VisualAid(models.Model):
    visualAidID = models.AutoField(primary_key=True)
    # 🔗 Changed to link directly to the specific target goal!
    iep_goal = models.ForeignKey(IEPGoal, on_delete=models.CASCADE, related_name='visual_aids')
    title = models.CharField(max_length=255)
    imageUrl = models.URLField(max_length=500)  # Perfect for your Supabase/Pollinations CDN links!
    prompt_used = models.TextField(blank=True, null=True) # Optional: save what the teacher input
    dateCreated = models.DateTimeField(auto_now_add=True)

class TeachingStrategy(models.Model):
    strategyID = models.AutoField(primary_key=True)
    # 🔗 Changed to link directly to the specific target goal!
    iep_goal = models.ForeignKey(IEPGoal, on_delete=models.CASCADE, related_name='teaching_strategies')
    title = models.CharField(max_length=255)
    strategyContent = models.TextField()
    dateCreated = models.DateTimeField(auto_now_add=True)