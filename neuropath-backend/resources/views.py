from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status,viewsets
from users.models import Teacher,StudentProfile
from .models import LessonPlan
from .serializers import UserContextSerializer,LessonPlanSerializer,LessonGenerationSerializer,LessonPlanDetailSerializer,LessonPlanUpdateSerializer
#from .permissions import UserAuthPermissions uncomment this back to check user auth and permission


# =====================================================================
# SDD COMPONENT: InstructionalSupportDashboardAPIView
# Description: Primary backend gateway handling GET requests, initializing
#              the workspace environment, and serving profile metadata.
# =====================================================================
class InstructionalSupportDashboardAPIView(APIView):
    # TEMPORARY: Allow anyone to view this page during local development testing
    permission_classes = [] 

    def get(self, request, *args, **kwargs):
        # 1. Check if a real user is logged in via Django sessions/JWT
        if request.user and request.user.is_authenticated:
            lookup_email = request.user.email
        else:
            # DEVELOPMENT BYPASS: Default to your test teacher's email from your Supabase screenshot
            lookup_email = "test@gmail.com" 
            
        try:
            # Query the custom teacher profile database row
            teacher_profile = Teacher.objects.get(email=lookup_email)
            serializer = UserContextSerializer(teacher_profile)
            
            return Response({
                "status": "success",
                "userContext": serializer.data,
                "workspaceConfig": {
                    "activeModules": [
                        "Manage Lesson Plans",
                        "Manage Visual Aids",
                        "Manage Teaching Strategies"
                    ],
                    "layout": "sidebar-expanded"
                }
            }, status=status.HTTP_200_OK)
            
        except Teacher.DoesNotExist:
            return Response(
                {"error": f"Teacher profile metadata for '{lookup_email}' not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

# =====================================================================
# SDD COMPONENT: LessonPlanManagerService
# Description: Orchestrates the generation workflow, formats the final 
#              structure, and commands the model to save the package.
# =====================================================================
class LessonPlanManagerService:
    @staticmethod
    def generate_lesson_payload(student_id, topic):
        # 1. This is where your future AI HTTP Request will go.
        # 2. For now, we return a structured mock JSON dictionary.
        return {
            "topic": topic,
            "objective": f"The student will demonstrate understanding of {topic}.",
            "activities": ["Visual matching exercise", "Interactive physical activity"],
            "assessment": "Short verbal check for understanding."
        }

# =====================================================================
# SDD COMPONENT: LessonPlanViewSet
# Description: API controller routing teacher actions to execute creating, 
#              retrieving, updating, and deleting lesson plans.
# =====================================================================
class LessonPlanViewSet(viewsets.ModelViewSet):
    # ModelViewSet automatically handles list(), retrieve(), update(), and destroy()!
    queryset = LessonPlan.objects.all()
    serializer_class = LessonPlanSerializer
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready for security

    def create(self, request, *args, **kwargs):
        # Action: "Generate Lesson Plan"
        student_id = request.data.get('studentID')
        title = request.data.get('title', 'AI Generated Lesson')
        topic = request.data.get('topic', 'General Learning')
        
        # Trigger the workflow manager
        generated_content = LessonPlanManagerService.generate_lesson_payload(student_id, topic)
        
        # Package the data for the database
        payload = {
            'studentID': student_id,
            'title': title,
            'content': generated_content,
            'status': 'Generated'
        }
        
        # Validate and Save Record
        serializer = self.get_serializer(data=payload)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Lesson Plan generated and saved successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# =====================================================================
# SDD COMPONENT: LessonPlanGeneratorService
# Description: Business logic component responsible for drafting content. 
#              Processes validated inputs through the prompt engine.
# =====================================================================
class LessonPlanGeneratorService:
    @staticmethod
    def generate_draft(validated_data, student_profile):
        subject = validated_data.get('subject')
        topic = validated_data.get('topic')
        goals = validated_data.get('specificGoals', 'Standard comprehension.')
        
        # 1. Compile the Engineering Prompt
        prompt = (
            f"Generate a lesson plan for {student_profile.name}. "
            f"Subject: {subject}. Topic: {topic}. "
            f"Specific Goals: {goals}."
        )
        
        # 2. Simulated AI Response (Swap with real LLM HTTP request later)
        draft_content = {
            "introduction": f"Begin by introducing {topic} in the context of {subject}.",
            "core_activity": "Interactive whiteboard session.",
            "assessment": goals,
            "materials_needed": ["Whiteboard", "Markers", "Visual Aids"]
        }
        
        return {
            "generated_prompt": prompt,
            "draft_content": draft_content
        }

# =====================================================================
# SDD COMPONENT: GenerateLessonPlanAPIView
# Description: Controller component handling the generation workflow. 
#              Routes manual parameters to the generation service.
# =====================================================================
class GenerateLessonPlanAPIView(APIView):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def post(self, request, *args, **kwargs):
        # 1. Validate incoming React payload
        serializer = LessonGenerationSerializer(data=request.data)
        
        if serializer.is_valid():
            student_id = serializer.validated_data['studentID']
            
            try:
                # Matches Sequence Diagram: "Check for saved student data"
                student = StudentProfile.objects.get(pk=student_id)
            except StudentProfile.DoesNotExist:
                return Response(
                    {"error": "Student profile not found. Cannot generate lesson."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # 2. Trigger Business Logic Service
            draft_payload = LessonPlanGeneratorService.generate_draft(
                validated_data=serializer.validated_data,
                student_profile=student
            )
            
            # 3. Return the draft to the UI (React will handle the final "Save")
            return Response({
                "message": "Lesson plan draft generated successfully.",
                "data": draft_payload
            }, status=status.HTTP_200_OK)
            
        # Return validation errors if parameters are missing
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# =====================================================================
# SDD COMPONENT: LessonPlanFilterService
# Description: Specialized query logic component that processes inputs 
#              from the frontend to efficiently filter Supabase records.
# =====================================================================
class LessonPlanFilterService:
    @staticmethod
    def apply_filters(queryset, request_query_params):
        search_query = request_query_params.get('search', None)
        grade_filter = request_query_params.get('grade', None)
        
        # 1. Apply Text Search (Matches title OR student name)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(student__name__icontains=search_query)
            )
            
        # 2. Apply Grade Level Filter
        if grade_filter:
            queryset = queryset.filter(student__grade=grade_filter)
            
        return queryset
    
# =====================================================================
# SDD COMPONENT: LessonPlanReadOnlyViewSet
# Description: Controller component handling HTTP GET requests. Manages 
#              retrieval and secure routing of search queries and filters.
# =====================================================================
class LessonPlanReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    # ReadOnlyModelViewSet automatically provides list() and retrieve() actions ONLY.
    serializer_class = LessonPlanDetailSerializer
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get_queryset(self):
        """
        Matches Sequence Diagram: fetchAllSavedPlans()
        This method intercepts the base database query and routes it 
        through the LessonPlanFilterService before returning it.
        """
        # Step 1: Base Query (Get all plans, ordered by newest first)
        base_queryset = LessonPlan.objects.all().select_related('student').order_by('-dateCreated')
        
        # Step 2: Apply Filters using the SDD Service
        filtered_queryset = LessonPlanFilterService.apply_filters(base_queryset, self.request.query_params)
        
        return filtered_queryset
    
    
# =====================================================================
# SDD COMPONENT: LessonPlanUpdateService
# Description: Business logic component that processes validated update 
#              requests, preserves data integrity, and executes overwrites.
# =====================================================================
class LessonPlanUpdateService:
    @staticmethod
    def execute_update(lesson_plan, validated_data):
        if 'title' in validated_data:
            lesson_plan.title = validated_data['title']
        if 'status' in validated_data:
            lesson_plan.status = validated_data['status']
            
        lesson_plan.save()
        return lesson_plan
    

# =====================================================================
# SDD COMPONENT: LessonPlanEditAPIView
# Description: Controller handling HTTP GET (to populate the frontend form) 
#              and PUT (to receive updated payloads and execute modifications).
# =====================================================================
class LessonPlanEditAPIView(APIView):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: retrieveCurrentPlan(lessonID)"""
        try:
            # Locate the exact record in Supabase
            lesson_plan = LessonPlan.objects.get(pk=pk)
            
            # Re-use our read-only serializer to send the data safely
            serializer = LessonPlanDetailSerializer(lesson_plan)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except LessonPlan.DoesNotExist:
            return Response({"error": "Lesson Plan not found."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: validateAndSubmitEdits(lessonID, updatedPayload)"""
        try:
            lesson_plan = LessonPlan.objects.get(pk=pk)
        except LessonPlan.DoesNotExist:
            return Response({"error": "Lesson Plan not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # 1. Route to Serializer (validate)
        # partial=True allows the frontend to only send what it actually changed
        serializer = LessonPlanUpdateSerializer(lesson_plan, data=request.data, partial=True)
        
        if serializer.is_valid():
            # 2. Route to Business Logic Service (execute)
            LessonPlanUpdateService.execute_update(lesson_plan, serializer.validated_data)
            
            # 3. Return Success
            return Response({
                "message": "Lesson Plan updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)