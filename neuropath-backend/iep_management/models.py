from django.db import models
from users.models import StudentProfile
from django.conf import settings

class Assessment(models.Model):
    assessmentID = models.AutoField(primary_key=True)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, db_column='studentID')
    assessmentType = models.CharField(max_length=255)
    result = models.TextField(blank=True, default='')
    dateTaken = models.DateTimeField(auto_now_add=True)



class IEPModel(models.Model):
    iepID = models.AutoField(primary_key=True)
    studentID = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ieps')
    baselineData = models.TextField(blank=True, default='')
    goals = models.TextField(blank=True, default='')
    accommodations = models.TextField(blank=True, default='')
    generatedDetails = models.JSONField(blank=True, default=dict)
    version = models.IntegerField(default=1)
    createdDate = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'IEP v{self.version} for Student: {self.studentID.name}'


# -------------------------------------------------------------------
# SUBSYSTEM 1: THE CORE IEP DOCUMENT (Section B)
# -------------------------------------------------------------------
class IEP(models.Model):
    # Relational link to your Student Profiling system
    student = models.ForeignKey(
        'StudentProfile', # Assuming you have or will create this model
        on_delete=models.CASCADE, 
        related_name='ieps'
    )
    
    # Versioning & Status
    version_number = models.IntegerField(default=1)
    status = models.CharField(max_length=20, default='Draft')
    academic_year = models.CharField(max_length=9)
    
    # DepEd Track Designation
    program_type = models.CharField(
        max_length=20,
        choices=[('Graded', 'Graded (K-12)'), ('Non-Graded', 'Non-Graded (Functional)')],
        default='Graded'
    )

    # --- SECTION B: DIFFICULTIES, BARRIERS, & SUPPORTS ---
    difficulties = models.TextField(help_text="Enter ALL areas of difficulty")
    
    # Barriers
    learning_barriers = models.TextField(help_text="Factors restricting participation")
    barrier_qualifiers = models.CharField(max_length=255, blank=True, null=True)
    
    # Facilitators
    learning_facilitators = models.TextField(help_text="Factors enabling participation")
    facilitator_qualifiers = models.CharField(max_length=255, blank=True, null=True)
    
    # Execution Logistics
    accommodations = models.TextField(help_text="Staff, resources, and infrastructure changes required")

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return f"IEP v{self.version_number} - {self.student} ({self.program_type})"


# -------------------------------------------------------------------
# SUBSYSTEM 2: THE AI-GENERATED GOALS (Section C)
# -------------------------------------------------------------------
class IEP_Goal(models.Model):
    iep = models.ForeignKey(IEP, on_delete=models.CASCADE, related_name='iep_goals')
    
    # Subject grouping (Allows the AI to assign goals to specific domains)
    subject_category = models.CharField(
        max_length=100, 
        help_text="e.g., Mathematics, Functional Literacy, Daily Living Skills"
    )

    # --- SECTION C: AI GENERATED TARGETS ---
    annual_goal = models.TextField(help_text="Long term objective")
    enroute_objectives = models.TextField(help_text="Harvested from K-12 or Functional Curriculum")
    interventions_procedures = models.TextField(help_text="Activities and procedures to achieve goal")
    timeline_mins_session = models.CharField(max_length=255, help_text="e.g., 45 mins / 3x a week")
    individuals_responsible = models.CharField(max_length=255, help_text="e.g., SPED Teacher, OT")
    progress_instructional = models.TextField(help_text="Instructional evaluation metrics")
    
    # --- TEACHER EXECUTION DATA ---
    remarks = models.TextField(
        blank=True, 
        null=True, 
        help_text="Handwritten by teacher based on actual real-world learning"
    )

    def __str__(self):
        return f"[{self.subject_category}] Goal for IEP #{self.iep.id}"
