import uuid
from django.db import models
from django.conf import settings
from pgvector.django import VectorField, HnswIndex
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
    baselineData = models.TextField(blank=True, null=True) # 🎯 Changed to allow clean null values
    goals = models.TextField(blank=True, null=True)        # 🎯 Changed to allow clean null values
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
    learning_accommodations = models.TextField(help_text="Accommodations per difficulty row", blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['studentID', 'version'],
                name='unique_student_iep_version'
            )
        ]

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
    
    
class GeneratedAIInsight(models.Model):
    # Links to the student
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='ai_insights')
    
    # NEW: Links to the teacher who clicked "Generate"
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='generated_insights')
    
    summary_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at'] 

    def __str__(self):
        return f"Insight for {self.student.name} generated by {self.teacher.username}"


# -------------------------------------------------------------------
# SUBSYSTEM 3: RAG KNOWLEDGE BASE & VECTOR STORE
# -------------------------------------------------------------------
class SpedKnowledgeChunk(models.Model):
    class DomainChoices(models.TextChoices):
        COMMUNICATION = 'Communication', 'Communication & Language'
        SOCIALIZATION = 'Socialization', 'Socialization & Interpersonal'
        SENSORY_MOTOR = 'Sensory_Motor', 'Sensory & Motor Integration'
        ADAPTIVE = 'Adaptive_Daily_Living', 'Adaptive & Daily Living Skills'
        BEHAVIORAL = 'Behavioral', 'Behavioral & Emotional Self-Regulation'
        COGNITIVE = 'Cognitive', 'Cognitive & Functional Academics'

    class CategoryChoices(models.TextChoices):
        DEPED_COMPETENCY = 'DepEd_Competency', 'DepEd Competency'
        ASD_INTERVENTION = 'ASD_Intervention', 'ASD Intervention'
        RGORI_RUBRIC = 'RGORI_Rubric', 'R-GORI Rubric'
        ACCOMMODATION = 'Accommodation_Strategy', 'Accommodation Strategy'

    class TargetAgeChoices(models.TextChoices):
        EARLY_CHILDHOOD = 'Early_Childhood', 'Early Childhood (Kindergarten)'
        ELEM_PRIMARY = 'Elementary_Primary', 'Elementary Primary (Grades 1-3)'
        ELEM_INTERMEDIATE = 'Elementary_Intermediate', 'Elementary Intermediate (Grades 4-6)'
        ALL_ELEM = 'All_Elementary', 'All Elementary'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField(help_text="Curated text unit containing pedagogical guidance.")
    domain = models.CharField(max_length=64, choices=DomainChoices.choices)
    category = models.CharField(max_length=64, choices=CategoryChoices.choices)
    subcategory = models.CharField(max_length=64, help_text="Specific framework, e.g., PECS, TEACCH, SensoryDiet, PBIS")
    target_age_group = models.CharField(max_length=32, choices=TargetAgeChoices.choices, default=TargetAgeChoices.ALL_ELEM)
    token_count = models.PositiveIntegerField()
    embedding = VectorField(dimensions=1536, help_text="OpenAI text-embedding-3-small vector representation")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'iep_management_spedknowledgechunk'
        indexes = [
            HnswIndex(
                name='idx_sped_chunk_hnsw',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops']
            ),
            models.Index(fields=['domain', 'category', 'subcategory'], name='idx_sped_chunk_meta'),
        ]

    def __str__(self):
        return f"[{self.domain} | {self.subcategory}] {self.content[:60]}..."