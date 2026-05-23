from rest_framework import serializers
from users.models import Teacher
from .models import LessonPlan,VisualAid

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