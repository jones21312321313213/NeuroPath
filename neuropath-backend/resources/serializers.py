from rest_framework import serializers
from users.models import Teacher
from .models import LessonPlan,VisualAid,TeachingStrategy

# =====================================================================
# SDD COMPONENT: UserContextSerializer
# Description: Fetches the logged-in user's account metadata and serializes
#              details into a clean JSON payload for the dashboard header.
# =====================================================================
class UserContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = ['teacherID', 'name', 'email']
        
        
# =====================================================================
# SDD COMPONENT: LessonPlanSerializer
# Description: Data validation and transformation component. Parses 
#              incoming data and serializes Supabase records to JSON.
# =====================================================================
class LessonPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlan
        # Update 'studentID' to 'student' to align with your original model!
        fields = ['lessonID', 'iep', 'student', 'title', 'dateCreated', 'status']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Lesson plan title cannot be left blank.")
        return value
    
# =====================================================================
# SDD COMPONENT: LessonGenerationSerializer
# Description: Data validation component that strictly parses incoming 
#              generation requests to ensure parameters are safe.
# =====================================================================
class LessonGenerationSerializer(serializers.Serializer):
    studentID = serializers.IntegerField(required=True)
    subject = serializers.CharField(max_length=100, required=True)
    topic = serializers.CharField(max_length=255, required=True)
    
    # Optional parameters based on teacher input
    gradeLevel = serializers.CharField(max_length=50, required=False, allow_blank=True)
    specificGoals = serializers.CharField(required=False, allow_blank=True)

    def validate_topic(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Topic description must be more specific.")
        return value
    
    
# =====================================================================
# SDD COMPONENT: LessonPlanDetailSerializer
# Description: Data transformation component that securely converts 
#              complex database records into clean, read-only JSON.
# =====================================================================
class LessonPlanDetailSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = LessonPlan
        # Removed 'content' and 'gradeLevel' since they aren't on your original model
        fields = ['lessonID', 'studentName', 'title', 'status', 'dateCreated']
# =====================================================================
# SDD COMPONENT: LessonPlanUpdateSerializer
# Description: Strict data validation component parsing incoming PUT 
#              requests to ensure modified text blocks are formatted securely.
# =====================================================================
class LessonPlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlan
        # Only include fields that physically exist in your original model
        fields = ['title', 'status']
        
# =====================================================================
# SDD COMPONENT: VisualAidSerializer
# Description: Data transformation and verification component. Enforces 
#              structural schema type-safety and parses entities to JSON.
# =====================================================================
class VisualAidSerializer(serializers.ModelSerializer):
    # Pull the student's name directly into the payload for the React UI
    studentName = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = VisualAid
        fields = ['visualAidID', 'iep', 'student', 'studentName', 'title', 'imageUrl', 'dateCreated']

    def validate_imageUrl(self, value):
        # Enforce type-safety to ensure we only save web-accessible image links
        if not value.startswith('http'):
            raise serializers.ValidationError("The visual aid asset must be a valid URL starting with http or https.")
        return value
    
# =====================================================================
# SDD COMPONENT: StrategyUpdateValidationSerializer
# Description: Executes inbound format validations and payload maps. 
#              Transforms complex query logs into flat JSON objects.
# =====================================================================
class StrategyUpdateValidationSerializer(serializers.ModelSerializer):
    # Flatten the student name for easy React rendering
    studentName = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = TeachingStrategy
        fields = ['strategyID', 'iep', 'student', 'studentName', 'title', 'strategyContent', 'dateCreated']

    def validate_strategyContent(self, value):
        # Ensure the teacher (or AI) actually provides actionable content
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Strategy content must be detailed and actionable.")
        return value
    
class StrategyParameterSerializer(serializers.Serializer):
    studentID = serializers.IntegerField(required=True)
    iepGoalID = serializers.IntegerField(required=True)

    def validate(self, data):
        if data['studentID'] <= 0 or data['iepGoalID'] <= 0:
            raise serializers.ValidationError("Student ID and IEP Goal ID must be valid positive integers.")
        return data
    

class StrategyGenerationService:
    @staticmethod
    def execute_compilation_workflow(student_profile, iep_record):
        # 1. SDD Privacy Requirement: Anonymize the profile record
        # We strip the full name and only use a generic identifier for the AI
        anonymized_identifier = f"Student {student_profile.pk}"
        
        # 2. Apply specialized pedagogical system prompts
        ai_prompt = (
            f"Act as a Special Education Specialist. Design an actionable, evidence-based "
            f"teaching strategy for {anonymized_identifier} targeting the following IEP goal ID: {iep_record.pk}."
        )
        
        # 3. Simulate the orchestration layer returning standard instructional text vectors
        mock_generated_text = (
            f"Recommended Strategy for Target Goal:\n"
            f"1. Pre-teach vocabulary before the main lesson.\n"
            f"2. Use visual schedules to map out the activity.\n"
            f"3. Provide frequent, specific praise for approximations of the target behavior."
        )
        
        return {
            "applied_prompt": ai_prompt,
            "strategyContent": mock_generated_text
        }
        

# =====================================================================
# SDD COMPONENT: StrategyRetrievalSerializer
# Description: Data transformation component mapping raw database structures 
#              into clean, standardized JSON objects for front-end rendering.
# =====================================================================
class StrategyRetrievalSerializer(serializers.ModelSerializer):
    # Flatten the student data
    studentName = serializers.CharField(source='student.name', read_only=True)
    
    # Format chronological timestamps into a clean, human-readable string
    formattedDate = serializers.DateTimeField(source='dateCreated', format="%B %d, %Y", read_only=True)

    class Meta:
        model = TeachingStrategy
        # Removed 'status' so it perfectly matches your active database model!
        fields = [
            'strategyID', 
            'studentName', 
            'title', 
            'strategyContent', 
            'formattedDate'
        ]
        
# =====================================================================
# SDD COMPONENT: StrategyUpdateValidationSerializer
# Description: Executes inbound format validations. Screens modifications 
#              passed from React workspace to confirm schema requirements.
# =====================================================================
class StrategyUpdateValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingStrategy
        # Only expose the fields that the teacher is actually allowed to edit!
        fields = ['title', 'strategyContent']

    def validate_strategyContent(self, value):
        # Enforce character bounds and logic checks required by the SDD
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Modified strategy content must be detailed and actionable.")
        return value
    
# =====================================================================
# SDD COMPONENT: StrategyDeleteValidationSerializer
# Description: Parses incoming client payloads, confirming relational 
#              student context parameters are validly structured.
# =====================================================================
class StrategyDeleteValidationSerializer(serializers.Serializer):
    studentID = serializers.IntegerField(required=False)
    
    def validate_studentID(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target Student ID must be a valid positive integer.")
        return value