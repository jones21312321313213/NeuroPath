from django.db.models import Q
import io
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status,viewsets
from rest_framework.permissions import IsAuthenticated 
from django.http import HttpResponse
from users.models import Teacher,StudentProfile
from iep_management.models import IEPModel, IEPGoal
from .models import LessonPlan,VisualAid,TeachingStrategy
from .services import TeachingStrategyGenerationService
#from .permissions import UserAuthPermissions uncomment this back to check user auth and permission
from .serializers import (
    UserContextSerializer,
    LessonPlanSerializer,
    LessonGenerationSerializer,
    LessonPlanDetailSerializer,
    LessonPlanUpdateSerializer,
    VisualAidSerializer,
    StrategyParameterSerializer,
    TeachingStrategySerializer,           # <--- ADD THIS NEW ONE
    StrategyUpdateValidationSerializer,   # <--- KEEP THIS
    StrategyRetrievalSerializer,
    StrategyDeleteValidationSerializer,
)



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
        
        # 1. Compile the Engineering Prompt with Cloud Delimiters and New Context
        prompt = (
            f"☁️system☁️Act as an expert Special Education Curriculum Designer.☁️/system☁️\n"
            f"☁️user☁️\n"
            f"Generate a customized lesson plan for {student_profile.name}.\n"
            f"- Subject: {subject} | Topic: {topic}\n"
            f"- Specific Goals: {goals}\n"
            f"- Learning Style: {student_profile.learning_style}\n"
            f"- High-Interest Areas: {student_profile.interests}\n"
            f"- Required Accommodations: {student_profile.support_needs}\n"
            f"☁️/user☁️"
        )
        
        # 2. Simulated AI Response (Swap with real LLM HTTP request later)
        draft_content = {
            "introduction": f"Begin by introducing {topic} using visual/tactile references to {student_profile.interests}.",
            "core_activity": f"Interactive session optimized for a {student_profile.learning_style} learner.",
            "assessment": goals,
            "materials_needed": ["Custom Visual Aids", "Sensory-friendly tools"]
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

    def get(self, request, *args, **kwargs):
        """
        Returns the directory of students and their IEP Goal Areas for the
        Generate Lesson Plan tab. Mirrors TeachingStrategyGenerationController.
        Response: { "directory": [{ studentID, studentName, availableGoals: [{ goalID, label, goalArea }] }] }
        """
        from django.contrib.auth.models import User as DjangoUser
        from users.models import Teacher

        teacher_id = request.query_params.get("teacher_id")
        if teacher_id:
            try:
                django_user = DjangoUser.objects.get(pk=int(teacher_id))
                teacher = Teacher.objects.get(email=django_user.email)
                students = StudentProfile.objects.filter(teacher=teacher)
            except (DjangoUser.DoesNotExist, Teacher.DoesNotExist, ValueError, TypeError):
                students = StudentProfile.objects.none()
        else:
            students = StudentProfile.objects.none()

        if not students.exists():
            return Response(
                {"directory": [], "message": "No active student profiles found. Please add a student first."},
                status=status.HTTP_200_OK
            )

        directory_payload = []
        for student in students:
            # Fetch all IEP Goals for this student and expose the Goal Area (subject_category)
            student_goals = IEPGoal.objects.filter(iep__studentID=student)
            goal_list = [
                {
                    "goalID": goal.pk,
                    "goalArea": goal.subject_category or "General",
                    "label": goal.subject_category or "General",
                }
                for goal in student_goals
            ]
            directory_payload.append({
                "studentID": student.pk,
                "studentName": student.name,
                "availableGoals": goal_list,
            })

        return Response({"directory": directory_payload}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # 1. Validate incoming React payload
        serializer = LessonGenerationSerializer(data=request.data)
        
        if serializer.is_valid():
            goal_id = serializer.validated_data['goalID']

            try:
                # Resolve goal → student
                target_goal = IEPGoal.objects.select_related('iep__studentID').get(pk=goal_id)
                student = target_goal.iep.studentID
            except IEPGoal.DoesNotExist:
                return Response(
                    {"error": "Targeted IEP Goal could not be located."},
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
        
        # 🚀 REWIRED: Traverse through iep_goal -> iep -> studentID -> name
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(iep_goal__iep__studentID__name__icontains=search_query) 
            )
            
        if grade_filter:
            queryset = queryset.filter(iep_goal__iep__studentID__grade=grade_filter)
            
        return queryset
    
# =====================================================================
# SDD COMPONENT: LessonPlanReadOnlyViewSet
# Description: Controller component handling HTTP GET requests. Manages 
#              retrieval and secure routing of search queries and filters.
# =====================================================================
class LessonPlanReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LessonPlanDetailSerializer

    def get_queryset(self):
        # 🚀 REWIRED: select_related must follow the new chain to optimize database speed
        base_queryset = LessonPlan.objects.all().select_related('iep_goal__iep__studentID').order_by('-dateCreated')
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
    
# =====================================================================
# SDD COMPONENT: LessonPlanDeletionService
# Description: Business logic component responsible for safely executing 
#              the deletion workflow and ensuring database integrity.
# =====================================================================
class LessonPlanDeletionService:
    @staticmethod
    def execute_deletion(lesson_plan):
        # In the future, if you add files or images attached to a lesson plan, 
        # you would write the code to delete those cloud files right here 
        # before dropping the database row.
        
        lesson_plan.delete()
        return True
    

# =====================================================================
# SDD COMPONENT: LessonPlanDeleteAPIView
# Description: Controller handling HTTP DELETE requests. Captures the 
#              unique ID and routes the command to the business logic.
# =====================================================================
class LessonPlanDeleteAPIView(APIView):
    # Enforces the UserAuthPermissions security component
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def delete(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: executeDeletion(lessonID)"""
        try:
            lesson_plan = LessonPlan.objects.get(pk=pk)
        except LessonPlan.DoesNotExist:
            return Response(
                {"error": "Lesson Plan not found or already deleted."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # 1. SDD Security Check: verifyAuthorization(userID, lessonID)
        # Note: Once authentication is fully turned on, you would ensure:
        # if lesson_plan.student.teacher != request.user:
        #     return Response({"error": "Unauthorized"}, status=403)

        # 2. Trigger Business Logic Service
        LessonPlanDeletionService.execute_deletion(lesson_plan)
        
        # 3. Matches Sequence Diagram: "Acknowledge execution pipeline success status"
        # Standard REST practice for a successful deletion is to return a 204 No Content.
        return Response(status=status.HTTP_204_NO_CONTENT)
    
# =====================================================================
# SDD COMPONENT: VisualAidViewSet (Upgraded for 3.2.2)
# Description: Exposes secure HTTP GET endpoints, managing incoming parameters 
#              to look up collective rosters or specific file paths.
# =====================================================================
class VisualAidViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete']
    queryset = VisualAid.objects.all().order_by('-dateCreated')
    serializer_class = VisualAidSerializer
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def list(self, request, *args, **kwargs):
        """Matches Sequence Diagram: requestSavedVisualAids() -> return Array urls"""
        queryset = self.get_queryset()
        
        # Matches Sequence Diagram: Handle empty state
        if not queryset.exists():
            return Response([], status=status.HTTP_200_OK)
            
        serializer = self.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Route every image URL through the MediaStreamingService
        for item in response_data:
            item['imageUrl'] = MediaStreamingService.resolve_secure_stream_url(item['imageUrl'])
            
        return Response(response_data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Matches Sequence Diagram: handleSelectVisualAid(aidId) -> return storageUrl String"""
        try:
            instance = self.get_object()
        except VisualAid.DoesNotExist:
            return Response({"error": "Visual aid asset not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = self.get_serializer(instance)
        response_data = serializer.data
        
        # Route the specific image URL through the MediaStreamingService
        response_data['imageUrl'] = MediaStreamingService.resolve_secure_stream_url(instance.imageUrl)
        
        return Response(response_data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Tab Option Selected = "Generate Visual Aid"]"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            self.perform_create(serializer)
            # Matches Sequence Diagram: "Return parsed JSON asset descriptors"
            return Response({
                "message": "Visual Aid generated and saved successfully.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """
        Matches Sequence Diagram: [confirmDelete == true] -> handleConfirmDeletion(aidId)
        Executes permission checks, drops the database row, and triggers cloud cleanup.
        """
        try:
            instance = self.get_object()
        except VisualAid.DoesNotExist:
            return Response(
                {"error": "Visual Aid record does not exist or has already been removed."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Capture the file path URL before we erase the record from the database
        target_image_url = instance.imageUrl

        # 2. Drop the row from the Supabase PostgreSQL table (Classic Django ORM Link)
        self.perform_destroy(instance)

        # 3. Trigger SDD Component: StorageCleanupWorker to maintain cloud hygiene
        StorageCleanupWorker.purge_orphan_file(target_image_url)

        # 4. Return successful execution state (204 No Content is standard for clean API deletes)
        return Response(
            {"message": "Visual Aid database entry and storage file successfully deleted."},
            status=status.HTTP_204_NO_CONTENT
        )
        
        
# =====================================================================
# SDD COMPONENT: SupabaseStorageManager
# Description: Establishes secure cloud connections, managing binary data 
#              streams and bucket directory paths for the visual assets.
# =====================================================================
class SupabaseStorageManager:
    @staticmethod
    def upload_temp_image(binary_data, filename_hint):
        # In a production environment, this integrates with the supabase-py client 
        # to push the binary image into your storage bucket.
        # For now, we simulate a successful cloud upload returning a public URL.
        return f"https://your-supabase-project.supabase.co/storage/v1/object/public/visual-aids/preview_{filename_hint}.png"
    
    

# =====================================================================
# SDD COMPONENT: PDFExportEngine
# Description: Compiles the processed visual cards, configures layout, 
#              and outputs a clean, printable PDF stream.
# =====================================================================
class PDFExportEngine:
    @staticmethod
    def compile_pdf(visual_aid_record):
        # In production, libraries like ReportLab place the image onto a PDF canvas.
        # Here we create a simulated PDF byte stream to satisfy the download trigger.
        buffer = io.BytesIO()
        buffer.write(b"%PDF-1.4\n")
        buffer.write(f"Title: {visual_aid_record.title}\n".encode('utf-8'))
        buffer.write(f"Asset URL: {visual_aid_record.imageUrl}\n".encode('utf-8'))
        buffer.seek(0)
        return buffer


# =====================================================================
# SDD COMPONENT: VisualAidGeneratorService
# Description: Orchestrates the visual synthesis pipeline.
#              Extracts IEP goal text and sensory data into a standard asset.
# =====================================================================
class VisualAidGeneratorService:
    @staticmethod
    def process_synthesis_pipeline(goal_text, student_profile):
        # 1. Format the target IEP goal using the new sensory guardrails
        ai_prompt = (
            f"Create a distraction-free visual schedule icon illustrating: '{goal_text}'. "
            f"Incorporate the student's interest in '{student_profile.interests}' if appropriate, "
            f"while strictly adhering to their sensory preferences: '{student_profile.sensory_preferences}'. "
            f"Maintain low-visual clutter."
        )
        
        # 2. Simulate receiving the generated binary image data from the AI
        mock_binary_data = b"simulated_image_byte_stream"
        
        # 3. Route through the Storage Manager to get a web URL
        cloud_url = SupabaseStorageManager.upload_temp_image(mock_binary_data, "asset_123")
        
        return {
            "appliedPrompt": ai_prompt,
            "temporaryStorageUrl": cloud_url
        }

# =====================================================================
# SDD CONTROLLER: GenerateVisualAidAPIView
# Description: Intercepts the target goal text, runs the generator 
#              service, and returns the preview URL to the frontend.
# =====================================================================
class GenerateVisualAidAPIView(APIView):
    def post(self, request, *args, **kwargs):
        # 🚀 REWIRED: Just ask for the specific goal ID!
        goal_id = request.data.get('goalID')
        
        if not goal_id:
            return Response(
                {"error": "A target Goal ID is required to generate an asset."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # 🚀 REWIRED: Grab the goal, and use it to instantly find the student
            target_goal = IEPGoal.objects.select_related('iep__studentID').get(pk=goal_id)
            student = target_goal.iep.studentID
        except IEPGoal.DoesNotExist:
            return Response({"error": "Target goal not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Execute Generation Pipeline
        asset_payload = VisualAidGeneratorService.process_synthesis_pipeline(target_goal.annual_goal, student)
        
        return Response({
            "message": "Visual Aid generated successfully.",
            "data": asset_payload
        }, status=status.HTTP_200_OK)
        
# =====================================================================
# SDD CONTROLLER: ExportVisualAidAPIView
# Description: Fetches the saved visual aid record and triggers the 
#              PDF Export Engine to return a downloadable file response.
# =====================================================================
class ExportVisualAidAPIView(APIView):
    def get(self, request, pk, *args, **kwargs):
        try:
            visual_aid = VisualAid.objects.get(pk=pk)
        except VisualAid.DoesNotExist:
            return Response({"error": "Saved Visual Aid not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Generate the PDF file stream
        pdf_stream = PDFExportEngine.compile_pdf(visual_aid)
        
        # Configure the HTTP response to trigger a file download in the browser
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="VisualAid_{visual_aid.visualAidID}.pdf"'
        
        return response
    
    
# =====================================================================
# SDD COMPONENT: MediaStreamingService
# Description: Utility module handling cloud file retrieval workflows. 
#              Resolves raw binary paths into secure URL streams.
# =====================================================================
class MediaStreamingService:
    @staticmethod
    def resolve_secure_stream_url(raw_storage_url):
        if not raw_storage_url:
            return None
            
        # In a fully integrated production environment, you would use the 
        # supabase-py client here to request a signed, time-limited URL.
        # For now, we simulate the security handshake by appending a mock stream token.
        secure_stream_url = f"{raw_storage_url}?stream_auth=verified_token_123"
        return secure_stream_url
    
    
# =====================================================================
# SDD COMPONENT: StorageCleanupWorker
# Description: Post-delete handler that communicates with Supabase 
#              storage buckets to permanently purge orphan binary files.
# =====================================================================
class StorageCleanupWorker:
    @staticmethod
    def purge_orphan_file(image_url):
        if not image_url:
            return False
            
        # In your production setup with the real supabase client, you'd extract 
        # the file path from the URL and run:
        # supabase.storage.from_('visual-aids').remove(['path/to/file.png'])
        
        # Simulating cloud storage file extraction and successful removal log
        print(f"[StorageCleanupWorker] Successfully purged orphan asset from Supabase: {image_url}")
        return True
    
    
# =====================================================================
# SDD COMPONENT: StrategyGenerationManagerService
# Description: Orchestrates automated strategy generation sequences.
#              Processes criteria and formats data matrices for storage.
# =====================================================================
class StrategyGenerationManagerService:
    @staticmethod
    def generate_strategy_content(title, student_profile):
        # 1. Format the target prompt for the AI Core Engine
        ai_prompt = (
            f"☁️system☁️Act as a Special Education Behavioral Specialist.☁️/system☁️\n"
            f"☁️user☁️\n"
            f"Generate an actionable teaching strategy focusing on: {title}.\n"
            f"Student Profile Context:\n"
            f"- Diagnosis: {student_profile.diagnosis}\n"
            f"- Support Needs: {student_profile.support_needs}\n"
            f"- Sensory Profile: {student_profile.sensory_preferences}\n"
            f"- Interests/Reinforcers: {student_profile.interests}\n"
            f"☁️/user☁️"
        )
        
        # 2. Simulate the AI processing the pedagogical criteria
        mock_generated_text = (
            f"Strategy Overview for {title}:\n"
            f"- Break down the target task into smaller, manageable micro-steps tailored to a {student_profile.learning_style} learner.\n"
            f"- Utilize {student_profile.interests} as a primary motivational token system.\n"
            f"- Ensure environment accommodates the following sensory needs: {student_profile.sensory_preferences}."
        )
        
        return mock_generated_text

# =====================================================================
# SDD COMPONENT: TeachingStrategyViewSet
# Description: Centralized API controller handling inbound pathways.
# =====================================================================
class TeachingStrategyViewSet(viewsets.ModelViewSet):
    queryset = TeachingStrategy.objects.all().order_by('-dateCreated')
    serializer_class = TeachingStrategySerializer
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Strategy Route Option = "Generate Teaching Strategy" Tab]"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            if not serializer.validated_data.get('strategyContent'):
                student_profile = serializer.validated_data['student']
                title = serializer.validated_data['title']
                
                # NEW: Pass the entire student_profile object, not just the name string!
                generated_content = StrategyGenerationManagerService.generate_strategy_content(
                    title=title, 
                    student_profile=student_profile 
                )
                
                serializer.validated_data['strategyContent'] = generated_content
            
            self.perform_create(serializer)
            
            return Response({
                "message": "Teaching Strategy successfully generated and securely saved.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# =====================================================================
# SDD COMPONENT: TeachingStrategyGenerationController
# Description: Primary back-end routing hub processing incoming GET 
#              directory requests and POST execution requests.
# =====================================================================
class TeachingStrategyGenerationController(APIView):
    # 🎯 1. THE BOUNCER: This forces the user to be logged in. 
    # If there is no valid session/token, it instantly blocks them with a 401 Unauthorized error.
    # permission_classes = [IsAuthenticated] 

    def get(self, request, *args, **kwargs):
        from django.contrib.auth.models import User as DjangoUser

        teacher_id = request.query_params.get("teacher_id")
        if teacher_id:
            try:
                django_user = DjangoUser.objects.get(pk=int(teacher_id))
                teacher = Teacher.objects.get(email=django_user.email)
                students = StudentProfile.objects.filter(teacher=teacher)
            except (DjangoUser.DoesNotExist, Teacher.DoesNotExist, ValueError, TypeError):
                students = StudentProfile.objects.none()
        else:
            students = StudentProfile.objects.none()

        if not students.exists():
            return Response(
                {"message": "No active student profiles available. Please add a student first."},
                status=status.HTTP_200_OK
            )

        directory_payload = []
        for student in students:
            student_goals = IEPGoal.objects.filter(iep__studentID=student)
            goal_list = [{"goalID": goal.pk, "label": f"{goal.subject_category}: {goal.annual_goal[:40]}..."} for goal in student_goals]
            directory_payload.append({
                "studentID": student.pk,
                "studentName": student.name,
                "availableGoals": goal_list
            })

        return Response({"directory": directory_payload}, status=status.HTTP_200_OK)
        
    def post(self, request, *args, **kwargs):
        # 1. Validate the incoming payload uses the correct Goal ID
        serializer = StrategyParameterSerializer(data=request.data)
        
        if serializer.is_valid():
            goal_id = serializer.validated_data['goalID']
            
            try:
                # 🚀 GOOGLE-LEVEL OPTIMIZATION: 
                # select_related (for foreign keys) + prefetch_related (for many-to-many/reverse foreign keys)
                # This grabs the Goal, the IEP, the Student, AND the Rows in a single DB hit!
                target_goal = IEPGoal.objects.select_related(
                    'iep__studentID'
                ).prefetch_related('objective_rows').get(pk=goal_id)
                
            except IEPGoal.DoesNotExist:
                return Response(
                    {"error": "Targeted IEP Goal could not be located."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            try:
                # 2. Trigger the AI Generation & Database Save via our new Service
                # request.user contains the teacher automatically due to your auth middleware
                saved_strategy = TeachingStrategyGenerationService.generate_and_save_strategy(
                    goal_instance=target_goal,
                    teacher_instance=request.user
                )
                
                # 3. Route the new database record through your existing UI serializer
                # This ensures the React frontend gets the exact schema it expects
                res_serializer = StrategyRetrievalSerializer(saved_strategy)
                
                return Response({
                    "message": "Teaching strategy successfully generated and saved.",
                    "data": res_serializer.data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {"error": f"AI Generation Pipeline Failed: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        # Failsafe for bad frontend payloads
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
    
# =====================================================================
# SDD COMPONENT: StrategyQueryFilterService
# Description: Isolates table rows, evaluates data health, and strips 
#              out nested rows if structural prerequisite items fail.
# =====================================================================
class StrategyQueryFilterService:
    @staticmethod
    def get_filtered_strategies(queryset, student_id):
        if not student_id:
            return queryset.none()  
            
        # 🚀 REWIRED: Route through iep_goal
        return queryset.filter(iep_goal__iep__studentID__pk=student_id).order_by('-dateCreated')

# =====================================================================
# SDD COMPONENT: StrategyBinaryExportEngine
# Description: Background processing class that handles dynamic print operations,
#              parsing text strings into an outgoing binary PDF stream using ReportLab.
# =====================================================================
class StrategyBinaryExportEngine:
    @staticmethod
    def generate_pdf_stream(strategy_record):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        # ── Styles ──────────────────────────────────────────────────────
        base = getSampleStyleSheet()

        style_title = ParagraphStyle(
            'DocTitle',
            parent=base['Title'],
            fontSize=18,
            leading=24,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            spaceAfter=6,
        )
        style_label = ParagraphStyle(
            'MetaLabel',
            parent=base['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            leading=14,
        )
        style_value = ParagraphStyle(
            'MetaValue',
            parent=base['Normal'],
            fontSize=10,
            fontName='Helvetica',
            leading=14,
        )
        style_section_heading = ParagraphStyle(
            'SectionHeading',
            parent=base['Normal'],
            fontSize=11,
            fontName='Helvetica-Bold',
            leading=16,
            spaceBefore=10,
            spaceAfter=4,
        )
        style_body = ParagraphStyle(
            'BodyText',
            parent=base['Normal'],
            fontSize=10,
            fontName='Helvetica',
            leading=15,
            leftIndent=0,
        )
        style_content_box = ParagraphStyle(
            'ContentBox',
            parent=base['Normal'],
            fontSize=10,
            fontName='Helvetica',
            leading=15,
            textColor=colors.white,
        )

        # ── Helpers ─────────────────────────────────────────────────────
        def parse_content_to_flowables(raw_text):
            """
            Converts the AI markdown output into styled ReportLab flowables.
            **Title:** → bold section heading (plain text, no black box)
            * **Subtitle:** → bold sub-heading inside a black content box
            + bullet line → plain line inside the same black content box
            """
            flowables = []
            lines = raw_text.strip().splitlines()

            current_box_lines = []  # buffer lines that go into a black box

            def flush_box():
                """Render buffered lines as a single black-background table cell."""
                if not current_box_lines:
                    return
                content_html = '<br/>'.join(current_box_lines)
                p = Paragraph(content_html, style_content_box)
                tbl = Table([[p]], colWidths=[doc.width])
                tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.black),
                    ('TOPPADDING',    (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                    ('LEFTPADDING',   (0, 0), (-1, -1), 12),
                    ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                flowables.append(tbl)
                flowables.append(Spacer(1, 6))
                current_box_lines.clear()

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    flush_box()
                    continue

                # Top-level section heading: **Some Title:**
                top_heading_match = re.match(r'^\*\*(.+?)\*\*\s*$', stripped)
                if top_heading_match:
                    flush_box()
                    heading_text = top_heading_match.group(1).rstrip(':')
                    flowables.append(Paragraph(heading_text, style_section_heading))
                    continue

                # Sub-heading inside box: * **Subtitle:**  or  * **Subtitle:** more text
                sub_heading_match = re.match(r'^\*\s+\*\*(.+?)\*\*(.*)$', stripped)
                if sub_heading_match:
                    flush_box()
                    sub_title = sub_heading_match.group(1).rstrip(':')
                    extra = sub_heading_match.group(2).strip()
                    if extra:
                        line_html = f'<b>{sub_title}:</b> {extra}'
                    else:
                        line_html = f'<b>{sub_title}</b>'
                    current_box_lines.append(line_html)
                    continue

                # Detail bullet: + some detail text
                detail_match = re.match(r'^\+\s+(.+)$', stripped)
                if detail_match:
                    current_box_lines.append(detail_match.group(1))
                    continue

                # Fallback: plain paragraph (flush any open box first)
                flush_box()
                flowables.append(Paragraph(stripped, style_body))

            flush_box()
            return flowables

        # ── Build document elements ──────────────────────────────────────
        elements = []

        # Title
        elements.append(Paragraph(strategy_record.title, style_title))
        elements.append(Spacer(1, 4 * mm))

        # Student / Date meta row
        student_name = "N/A"
        try:
            student_name = strategy_record.iep_goal.iep.studentID.name
        except Exception:
            pass

        date_str = strategy_record.dateCreated.strftime("%B %d, %Y") if strategy_record.dateCreated else "N/A"

        meta_table = Table(
            [[
                Paragraph('<b>Student</b>', style_label),
                Paragraph('<b>Date Created</b>', style_label),
            ], [
                Paragraph(student_name, style_value),
                Paragraph(date_str, style_value),
            ]],
            colWidths=[doc.width / 2, doc.width / 2],
        )
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 6 * mm))

        # Section heading
        elements.append(Paragraph('<b>Strategy Content</b>', style_section_heading))
        elements.append(Spacer(1, 2 * mm))

        # Parsed AI content
        elements.extend(parse_content_to_flowables(strategy_record.strategyContent))

        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    
class TeachingStrategyQueryController(viewsets.ViewSet):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def getSavedStrategies(self, request):
        """Matches Class Diagram: getSavedStrategies(studentID)"""
        student_id = request.query_params.get('studentID')
        
        # Pull base query and run it through the Filter Service
        base_queryset = TeachingStrategy.objects.all()
        filtered_queryset = StrategyQueryFilterService.get_filtered_strategies(base_queryset, student_id)
        
        if not filtered_queryset.exists():
            return Response([], status=status.HTTP_200_OK)
            
        serializer = StrategyRetrievalSerializer(filtered_queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def getStrategyDetails(self, request, pk=None):
        """Matches Class Diagram: getStrategyDetails(strategyID)"""
        try:
            strategy = TeachingStrategy.objects.get(pk=pk)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = StrategyRetrievalSerializer(strategy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def exportStrategyGuide(self, request, pk=None):
        """Matches Class Diagram: exportStrategyGuide(strategyID)"""
        try:
            strategy = TeachingStrategy.objects.get(pk=pk)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Trigger SDD Component: StrategyBinaryExportEngine
        pdf_stream = StrategyBinaryExportEngine.generate_pdf_stream(strategy)
        
        # Configure the HTTP response with transfer properties for local download
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="StrategyGuide_{strategy.pk}.pdf"'
        
        return response
    
    
# =====================================================================
# SDD COMPONENT: StrategyModificationService
# Description: Transaction validation helper handling core data transformation.
#              Processes textual updates and verifies structural criteria.
# =====================================================================
class StrategyModificationService:
    @staticmethod
    def process_update(strategy_record, validated_data):
        # 1. Systemic health check: Merge inbound text payload with existing row
        if 'title' in validated_data:
            strategy_record.title = validated_data['title']
            
        if 'strategyContent' in validated_data:
            strategy_record.strategyContent = validated_data['strategyContent']
            
        # 2. Execute the physical database write operation to Supabase
        strategy_record.save()
        return strategy_record
    
    

# =====================================================================
# SDD COMPONENT: TeachingStrategyUpdateController
# Description: Dedicated API controller managing write-intensive modification
#              pathways. Handles GET for preloading and PUT/PATCH for mutations.
# =====================================================================
class TeachingStrategyUpdateController(APIView):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: Populating historical data arrays"""
        try:
            strategy = TeachingStrategy.objects.get(pk=pk)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Use the read-only retrieval serializer to securely format the dates/names
        serializer = StrategyRetrievalSerializer(strategy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: saveStrategyEdits(strategyID, updatedContent)"""
        try:
            strategy = TeachingStrategy.objects.get(pk=pk)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Pass to SDD Component: StrategyUpdateValidationSerializer
        # partial=True allows the frontend to send just the text field that changed
        serializer = StrategyUpdateValidationSerializer(strategy, data=request.data, partial=True)
        
        if serializer.is_valid():
            # 2. Pass to SDD Component: StrategyModificationService
            StrategyModificationService.process_update(strategy, serializer.validated_data)
            
            # 3. Return database persistence confirmation (Success Boolean/Payload)
            return Response({
                "message": "Teaching Strategy modifications successfully preserved.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        # Return application validation errors (HTTP 400)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# =====================================================================
# SDD COMPONENT: StrategyRemovalService
# Description: Executes safe data extraction workflows, enforces multi-tenant 
#              boundary safety, and manages the transaction cycle.
# =====================================================================
class StrategyRemovalService:
    @staticmethod
    def execute_extraction(strategy_record):
        # SDD Security Enforcement: Multi-tenant boundary safety
        # In a fully authenticated production state, you would check:
        # if strategy_record.student.teacher != request.user: 
        #     raise PermissionDenied("You do not have authorization to delete this record.")
        
        # Execute the raw physical row deletion to the Supabase Postgres cluster
        strategy_record.delete()
        
        # Report successful operation flag back to the controller
        return True
    
    
# =====================================================================
# SDD COMPONENT: TeachingStrategyDeleteController
# Description: Routes extraction processes. Handles GET operations for list 
#              hydration and DELETE operations for destructive pipeline actions.
# =====================================================================
class TeachingStrategyDeleteController(APIView):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get(self, request, pk=None, *args, **kwargs):
        if pk:
            try:
                strategy = TeachingStrategy.objects.get(pk=pk)
                serializer = StrategyRetrievalSerializer(strategy)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except TeachingStrategy.DoesNotExist:
                return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            serializer = StrategyDeleteValidationSerializer(data=request.query_params)
            
            if serializer.is_valid():
                student_id = serializer.validated_data.get('studentID')
                if not student_id:
                    return Response({"error": "studentID parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
                    
                # 🚀 REWIRED: Traverse the new architectural chain!
                strategies = TeachingStrategy.objects.filter(
                    iep_goal__iep__studentID__pk=student_id
                ).order_by('-dateCreated')
                
                if not strategies.exists():
                    return Response([], status=status.HTTP_200_OK)
                    
                res_serializer = StrategyRetrievalSerializer(strategies, many=True)
                return Response(res_serializer.data, status=status.HTTP_200_OK)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: executeStrategyDeletion(strategyID)"""
        try:
            strategy = TeachingStrategy.objects.get(pk=pk)
        except TeachingStrategy.DoesNotExist:
            return Response(
                {"error": "Strategy record does not exist or has already been removed."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Trigger SDD Component: StrategyRemovalService
        StrategyRemovalService.execute_extraction(strategy)
        
        return Response(
            {"message": "Teaching Strategy database record successfully permanently deleted."},
            status=status.HTTP_204_NO_CONTENT
        )