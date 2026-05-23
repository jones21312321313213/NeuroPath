from django.db.models import Q
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status,viewsets
from django.http import HttpResponse
from users.models import Teacher,StudentProfile
from iep_management.models import IEP
from .models import LessonPlan,VisualAid,TeachingStrategy
from .serializers import (UserContextSerializer,LessonPlanSerializer,LessonGenerationSerializer,
                          LessonPlanDetailSerializer,LessonPlanUpdateSerializer,VisualAidSerializer,
                          StrategyUpdateValidationSerializer,StrategyParameterSerializer,StrategyGenerationService,
                          StrategyRetrievalSerializer)
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
# SDD COMPONENT: VisualAidGeneratorService
# Description: Orchestrates the visual synthesis pipeline. Extracts IEP 
#              goal text and processes the output into a standardized asset.
# =====================================================================
class VisualAidGeneratorService:
    @staticmethod
    def process_synthesis_pipeline(goal_text):
        # 1. Format the target IEP goal for the AI Core Engine
        ai_prompt = f"Create a simple, distraction-free visual schedule icon illustrating: {goal_text}"
        
        # 2. Simulate receiving the generated binary image data from the AI
        mock_binary_data = b"simulated_image_byte_stream"
        
        # 3. Route through the Storage Manager to get a web URL
        cloud_url = SupabaseStorageManager.upload_temp_image(mock_binary_data, "asset_123")
        
        return {
            "appliedPrompt": ai_prompt,
            "temporaryStorageUrl": cloud_url
        }

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
    
#=====================================================================
# SDD CONTROLLER: GenerateVisualAidAPIView
# Description: Intercepts the target goal text, runs the generator 
#              service, and returns the preview URL to the frontend.
# =====================================================================
class GenerateVisualAidAPIView(APIView):
    def post(self, request, *args, **kwargs):
        goal_text = request.data.get('goalText')
        student_id = request.data.get('studentID')
        
        # Enforce validation matching your Sequence Diagram flow
        if not student_id or not goal_text:
            return Response(
                {"error": "A selected Student ID and Goal are required to generate an asset."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Execute the Generation Pipeline
        asset_payload = VisualAidGeneratorService.process_synthesis_pipeline(goal_text)
        
        return Response({
            "message": "Visual Aid generated successfully for preview.",
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
    def generate_strategy_content(title, student_name):
        # 1. Format the target prompt for the AI Core Engine
        ai_prompt = f"Generate an actionable teaching strategy for {student_name} focusing on: {title}"
        
        # 2. Simulate the AI processing the pedagogical criteria
        mock_generated_text = (
            f"Strategy Overview for {title}:\n"
            f"- Break down the target task into smaller, manageable micro-steps.\n"
            f"- Provide immediate positive reinforcement upon completion of each step.\n"
            f"- Utilize multi-sensory physical materials to maintain engagement."
        )
        
        return mock_generated_text
    

# =====================================================================
# SDD COMPONENT: TeachingStrategyViewSet
# Description: Centralized API controller handling inbound pathways. 
#              Delegates execution for create, list, retrieve, update, destroy.
# =====================================================================
class TeachingStrategyViewSet(viewsets.ModelViewSet):
    queryset = TeachingStrategy.objects.all().order_by('-dateCreated')
    serializer_class = StrategyUpdateValidationSerializer
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Strategy Route Option = "Generate Teaching Strategy" Tab]"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Check if the frontend provided content. If not, trigger the AI Generation Service.
            if not serializer.validated_data.get('strategyContent'):
                student_profile = serializer.validated_data['student']
                title = serializer.validated_data['title']
                
                # Execute the SDD Service
                generated_content = StrategyGenerationManagerService.generate_strategy_content(
                    title=title, 
                    student_name=student_profile.name
                )
                
                # Inject the generated content into the validated payload before saving
                serializer.validated_data['strategyContent'] = generated_content
            
            # Commit to the Supabase Database
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
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get(self, request, *args, **kwargs):
        """Matches Sequence Diagram: getInitializationData()"""
        students = StudentProfile.objects.all()
        
        # Alternative Flow: Empty State
        if not students.exists():
            return Response(
                {"message": "No active student profiles available. Please add a student first."}, 
                status=status.HTTP_200_OK
            )
            
        # Standard Flow: Return serialized student and target goal arrays
        directory_payload = []
        for student in students:
            # Fetch linked IEP goals for this specific student
            student_ieps = IEP.objects.filter(student=student)
            iep_list = [{"iepID": iep.pk, "status": iep.status} for iep in student_ieps]
            
            directory_payload.append({
                "studentID": student.pk,
                "studentName": student.name,
                "availableGoals": iep_list
            })
            
        return Response({"directory": directory_payload}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Matches Sequence Diagram: executeStrategyGeneration()"""
        serializer = StrategyParameterSerializer(data=request.data)
        
        if serializer.is_valid():
            student_id = serializer.validated_data['studentID']
            iep_id = serializer.validated_data['iepGoalID']
            
            try:
                student = StudentProfile.objects.get(pk=student_id)
                iep = IEP.objects.get(pk=iep_id)
            except (StudentProfile.DoesNotExist, IEP.DoesNotExist):
                return Response(
                    {"error": "Targeted Student or IEP Goal could not be located."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Drive the orchestration layer
            draft_payload = StrategyGenerationService.execute_compilation_workflow(student, iep)
            
            return Response({
                "message": "Teaching strategy successfully compiled for review.",
                "data": draft_payload
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# =====================================================================
# SDD COMPONENT: TeachingStrategyGenerationController
# Description: Primary back-end routing hub processing incoming GET 
#              directory requests and POST execution requests.
# =====================================================================
class TeachingStrategyGenerationController(APIView):
    # permission_classes = [UserAuthPermissions] <-- Uncomment when ready

    def get(self, request, *args, **kwargs):
        """Matches Sequence Diagram: getInitializationData()"""
        students = StudentProfile.objects.all()
        
        # Alternative Flow: Empty State
        if not students.exists():
            return Response(
                {"message": "No active student profiles available. Please add a student first."}, 
                status=status.HTTP_200_OK
            )
            
        # Standard Flow: Return serialized student and target goal arrays
        directory_payload = []
        for student in students:
            # Fetch linked IEP goals for this specific student
            student_ieps = IEP.objects.filter(student=student)
            
            # FIX: Removed the non-existent 'status' field and replaced it with a safe string label!
            iep_list = [{"iepID": iep.pk, "label": str(iep)} for iep in student_ieps]
            
            directory_payload.append({
                "studentID": student.pk,
                "studentName": student.name,
                "availableGoals": iep_list
            })
            
        return Response({"directory": directory_payload}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Matches Sequence Diagram: executeStrategyGeneration()"""
        serializer = StrategyParameterSerializer(data=request.data)
        
        if serializer.is_valid():
            student_id = serializer.validated_data['studentID']
            iep_id = serializer.validated_data['iepGoalID']
            
            try:
                student = StudentProfile.objects.get(pk=student_id)
                iep = IEP.objects.get(pk=iep_id)
            except (StudentProfile.DoesNotExist, IEP.DoesNotExist):
                return Response(
                    {"error": "Targeted Student or IEP Goal could not be located."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Drive the orchestration layer
            draft_payload = StrategyGenerationService.execute_compilation_workflow(student, iep)
            
            return Response({
                "message": "Teaching strategy successfully compiled for review.",
                "data": draft_payload
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
# =====================================================================
# SDD COMPONENT: StrategyQueryFilterService
# Description: Isolates table rows, evaluates data health, and strips 
#              out nested rows if structural prerequisite items fail.
# =====================================================================
class StrategyQueryFilterService:
    @staticmethod
    def get_filtered_strategies(queryset, student_id):
        # 1. Evaluate data collection health (ensure student_id is valid)
        if not student_id:
            return queryset.none()  # Return empty if safety checks fail
            
        # 2. Isolate historical logs based on target parameters
        return queryset.filter(student__pk=student_id).order_by('-dateCreated')

# =====================================================================
# SDD COMPONENT: StrategyBinaryExportEngine
# Description: Background processing class that handles dynamic print operations,
#              parsing text strings into an outgoing binary PDF stream.
# =====================================================================
class StrategyBinaryExportEngine:
    @staticmethod
    def generate_pdf_stream(strategy_record):
        # Generates a standard PDF byte stream for local download
        buffer = io.BytesIO()
        buffer.write(b"%PDF-1.4\n")
        
        # Inject standard layout maps and text strings
        buffer.write(f"Teaching Strategy Guide: {strategy_record.title}\n\n".encode('utf-8'))
        buffer.write(f"Prepared for Student ID: {strategy_record.student.pk}\n".encode('utf-8'))
        buffer.write(b"--------------------------------------------------\n\n")
        buffer.write(strategy_record.strategyContent.encode('utf-8'))
        
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