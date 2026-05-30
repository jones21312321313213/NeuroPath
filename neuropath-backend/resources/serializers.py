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
        # 🎯 ADDED 'lessonContent' HERE
        fields = ['lessonID', 'iep_goal', 'title', 'lessonContent', 'dateCreated', 'status']

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
    # 🚀 REWIRED: We only need the precise Goal ID now!
    goalID = serializers.IntegerField(required=True)
    subject = serializers.CharField(max_length=100, required=True)
    topic = serializers.CharField(required=True)
    
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
    # 🚀 REWIRED: Traverse the foreign keys to find the student name safely
    studentName = serializers.CharField(source='iep_goal.iep.studentID.name', read_only=True)

    class Meta:
        model = LessonPlan
        # 🎯 ADDED 'lessonContent' HERE
        fields = ['lessonID', 'studentName', 'title', 'status', 'lessonContent', 'dateCreated']
        
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
    # 🚀 REWIRED: Traverse the foreign keys
    studentName = serializers.CharField(source='iep_goal.iep.studentID.name', read_only=True)

    class Meta:
        model = VisualAid
        # 🚀 REWIRED: Removed 'iep' and 'student', added 'iep_goal'
        fields = ['visualAidID', 'iep_goal', 'studentName', 'title', 'imageUrl', 'dateCreated']

    def validate_imageUrl(self, value):
        if not value.startswith('http'):
            raise serializers.ValidationError("The visual aid asset must be a valid URL starting with http or https.")
        return value
    
# =====================================================================
# SDD COMPONENT: StrategyUpdateValidationSerializer
# Description: Executes inbound format validations and payload maps. 
#              Transforms complex query logs into flat JSON objects.
# =====================================================================
class StrategyUpdateValidationSerializer(serializers.ModelSerializer):
    # 🚀 REWIRED: Traverse the path
    studentName = serializers.CharField(source='iep_goal.iep.studentID.name', read_only=True)
    
    class Meta:
        model = TeachingStrategy
        # 🚀 REWIRED: Update fields
        fields = ['strategyID', 'iep_goal', 'studentName', 'title', 'strategyContent', 'dateCreated']

    def validate_strategyContent(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Strategy content must be detailed and actionable.")
        return value
    
class StrategyParameterSerializer(serializers.Serializer):
    # 🚀 REWIRED: Streamlined to just require the goal ID.
    goalID = serializers.IntegerField(required=True)

    def validate(self, data):
        if data['goalID'] <= 0:
            raise serializers.ValidationError("IEP Goal ID must be a valid positive integer.")
        return data
    

class StrategyGenerationService:
    @staticmethod
    def execute_compilation_workflow(student_profile, target_goal):
        anonymized_identifier = f"Student {student_profile.pk}"
        
        # 🚀 REWIRED: Use target_goal instead of iep_record
        ai_prompt = (
            f"Act as a Special Education Specialist. Design an actionable, evidence-based "
            f"teaching strategy for {anonymized_identifier} targeting the following IEP goal ID: {target_goal.pk}."
        )
        
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
    # 🚀 REWIRED: Complete data lineage traversal
    studentName = serializers.CharField(source='iep_goal.iep.studentID.name', read_only=True)
    studentID = serializers.IntegerField(source='iep_goal.iep.studentID.pk', read_only=True)
    goalName = serializers.CharField(source='iep_goal.annual_goal', read_only=True)
    formattedDate = serializers.DateTimeField(source='dateCreated', format="%B %d, %Y", read_only=True)

    class Meta:
        model = TeachingStrategy
        fields = [
            'strategyID', 
            'studentName', 
            'studentID', 
            'goalName', 
            'title', 
            'strategyContent', 
            'formattedDate'
        ]
# =====================================================================
# SDD COMPONENT: TeachingStrategySerializer
# Description: Executes inbound format validations. Screens modifications 
#              passed from React workspace to confirm schema requirements.
# =====================================================================
class TeachingStrategySerializer(serializers.ModelSerializer):
    # 🚀 REWIRED: Traverse the path
    studentName = serializers.CharField(source='iep_goal.iep.studentID.name', read_only=True)
    strategyContent = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = TeachingStrategy
        # 🚀 REWIRED: Update fields
        fields = ['strategyID', 'iep_goal', 'studentName', 'title', 'strategyContent', 'dateCreated']

    def validate_strategyContent(self, value):
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError("Strategy content must be detailed and actionable.")
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