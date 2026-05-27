from django.db import models
from users.models import StudentProfile

# -------------------------------------------------------------------
# LEGACY COMPONENT: Do not alter to protect views.py
# -------------------------------------------------------------------
class Assessment(models.Model):
    assessmentID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    assessmentType = models.CharField(max_length=255)
    result = models.TextField(blank=True, default='')
    dateTaken = models.DateTimeField(auto_now_add=True)


# -------------------------------------------------------------------
# SUBSYSTEM 1: CORE IEP DOCUMENT (Section B)
# -------------------------------------------------------------------
class IEPModel(models.Model):
    iepID = models.AutoField(primary_key=True)
    studentID = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ieps')
    
    # --- EXISTING CORE FIELDS ---
    baselineData = models.TextField(blank=True, default='')
    goals = models.TextField(blank=True, default='')
    accommodations = models.TextField(blank=True, default='')
    generatedDetails = models.JSONField(blank=True, default=dict)
    version = models.IntegerField(default=1)
    createdDate = models.DateTimeField(auto_now_add=True)

    # --- NEW SECTION B: DEPED MACRO-ENVIRONMENT FACTORS ---
    program_type = models.CharField(
        max_length=50, 
        choices=[('Graded', 'Graded (K-12)'), ('Non-Graded', 'Non-Graded (Functional)')], 
        default='Graded'
    )
    difficulties = models.TextField(help_text="Enter ALL areas of difficulty", blank=True, null=True)
    learning_barriers = models.TextField(help_text="Factors restricting participation", blank=True, null=True)
    barrier_qualifiers = models.CharField(max_length=255, blank=True, null=True)
    learning_facilitators = models.TextField(help_text="Factors enabling participation", blank=True, null=True)
    facilitator_qualifiers = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f'IEP v{self.version} for Student: {self.studentID.name}'


# -------------------------------------------------------------------
# SUBSYSTEM 2: AI-GENERATED GOALS ( Section C)
# -------------------------------------------------------------------
class IEPGoal(models.Model):
    goalID = models.AutoField(primary_key=True)
    iep = models.ForeignKey(IEPModel, on_delete=models.CASCADE, db_column='iepID', related_name='individual_goals')
    
    # --- EXISTING CORE FIELDS ---
    goalName = models.CharField(max_length=255) 
    target_metric = models.CharField(max_length=255)

    # --- NEW SECTION C: MACRO-TARGET HEADER ---
    subject_category = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        help_text="e.g., CARE SKILLS, Mathematics" 
    )
    annual_goal = models.TextField(help_text="Annual Goal/Long Term", blank=True, null=True) 

    def __str__(self):
        return f"[{self.subject_category or 'General'}] Goal for IEP #{self.iep.iepID}" 

class IEPObjectiveRow(models.Model):
    rowID = models.AutoField(primary_key=True)
    # 🔗 Connects this specific row directly to its parent table header!
    parent_goal = models.ForeignKey(IEPGoal, on_delete=models.CASCADE, related_name='objective_rows')
    
    # --- PHYSICAL GRID COLUMNS ---
    enroute_objectives = models.TextField(help_text="Harvest from K-12 Curriculum", blank=True, null=True) 
    interventions_procedures = models.TextField(help_text="Interventions/Activities/Procedure", blank=True, null=True) 
    timeline_mins_session = models.CharField(max_length=255, help_text="e.g., 15 to 20 minutes every day", blank=True, null=True) 
    individuals_responsible = models.CharField(max_length=255, help_text="e.g., SNED Teacher, Parents", blank=True, null=True) 
    progress_instructional = models.TextField(help_text="Progress/Instructional Evaluation", blank=True, null=True)
    remarks = models.TextField(help_text="Handwritten based on actual learning", blank=True, null=True)

    def __str__(self):
        return f"Row for Goal ID #{self.parent_goal.pk}"