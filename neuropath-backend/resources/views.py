from django.db.models import Q
import io
import json
import re
import requests as http_client
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status,viewsets
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from users.models import Teacher,StudentProfile
from users.utils import get_teacher_for_user
from iep_management.models import IEPModel, IEPGoal, IEPObjectiveRow
from .models import LessonPlan,VisualAid,TeachingStrategy
from .services import TeachingStrategyGenerationService,LessonPlanGenerationService
from .permissions import UserAuthPermissions


def _goal_owned_by_teacher(iep_goal, teacher):
    return bool(teacher and iep_goal and iep_goal.iep.studentID.teacher_id == teacher.teacherID)


def _safe_generated_details(details):
    if not details:
        return {}
    if isinstance(details, dict):
        return details
    if isinstance(details, str):
        try:
            import json
            parsed = json.loads(details)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _first_non_empty(*values, default=""):
    for value in values:
        if value is None:
            continue
        value = str(value).strip()
        if value:
            return value
    return default


def _sync_goals_from_generated_details(iep):
    """Backfill old IEPs whose Section C is only stored in generatedDetails."""
    if not iep or IEPGoal.objects.filter(iep=iep).exists():
        return

    details = _safe_generated_details(iep.generatedDetails)
    learner_goals = (
        details.get('learnerGoals')
        or details.get('sectionC')
        or details.get('goals')
        or details.get('generatedGoals')
        or []
    )
    if not isinstance(learner_goals, list):
        return

    for idx, goal in enumerate(learner_goals, start=1):
        if not isinstance(goal, dict):
            continue
        subject_category = _first_non_empty(
            goal.get('subject_category'), goal.get('subjectCategory'),
            goal.get('type'), goal.get('goalArea'), goal.get('goalName'),
            default=f'Goal {idx}',
        )
        annual_goal = _first_non_empty(
            goal.get('annual_goal'), goal.get('annualGoal'), goal.get('label'),
            goal.get('goal'), goal.get('description'),
        )
        if not annual_goal:
            continue

        parent_goal = IEPGoal.objects.create(
            iep=iep,
            subject_category=subject_category,
            annual_goal=annual_goal,
            goalName=_first_non_empty(goal.get('goalName'), subject_category, default=f'Goal {idx}'),
            target_metric=_first_non_empty(goal.get('target_metric'), goal.get('targetMetric'), default='Standard IEP Metric'),
        )

        rows = goal.get('objective_rows') or goal.get('rows') or goal.get('objectives') or []
        if not isinstance(rows, list):
            rows = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            IEPObjectiveRow.objects.create(
                parent_goal=parent_goal,
                enroute_objectives=_first_non_empty(row.get('enroute_objectives'), row.get('objective'), row.get('enrouteObjectives')),
                interventions_procedures=_first_non_empty(row.get('interventions_procedures'), row.get('interventions'), row.get('activities')),
                timeline_mins_session=_first_non_empty(row.get('timeline_mins_session'), row.get('timeline'), row.get('session')),
                individuals_responsible=_first_non_empty(row.get('individuals_responsible'), row.get('responsible'), row.get('individualsResponsible')),
                progress_instructional=_first_non_empty(row.get('progress_instructional'), row.get('evaluation'), row.get('progress')),
                remarks=_first_non_empty(row.get('remarks')),
            )

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


def _latest_saved_iep_for_student(student):
    """Return the newest saved IEP/version for one student."""
    return (
        IEPModel.objects
        .filter(studentID=student)
        .order_by('-version', '-createdDate', '-iepID')
        .first()
    )


def _goal_option_payload(goal):
    """Small goal shape used by Lesson Plans and Teaching Strategies."""
    goal_area = goal.subject_category or goal.goalName or "IEP Goal"
    annual_goal = goal.annual_goal or goal.goalName or "Saved IEP goal"
    return {
        "goalID": goal.pk,
        "goalArea": goal_area,
        "label": annual_goal,
        "annual_goal": annual_goal,
        "subject_category": goal.subject_category or goal_area,
    }


def _latest_goal_options_for_student(student):
    latest_iep = _latest_saved_iep_for_student(student)
    if not latest_iep:
        return []

    _sync_goals_from_generated_details(latest_iep)

    goals = (
        IEPGoal.objects
        .filter(iep=latest_iep)
        .prefetch_related('objective_rows')
        .order_by('goalID')
    )
    return [_goal_option_payload(goal) for goal in goals]




# =====================================================================
# SDD COMPONENT: InstructionalSupportDashboardAPIView
# Description: Primary backend gateway handling GET requests, initializing
#              the workspace environment, and serving profile metadata.
# =====================================================================
class InstructionalSupportDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        lookup_email = request.user.email

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
    serializer_class = LessonPlanSerializer
    permission_classes = [UserAuthPermissions]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return LessonPlan.objects.none()
        return LessonPlan.objects.filter(iep_goal__iep__studentID__teacher=teacher)

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Generate / Save Lesson Plan]"""
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            teacher = get_teacher_for_user(request.user)
            if not _goal_owned_by_teacher(serializer.validated_data.get('iep_goal'), teacher):
                return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)

            if not serializer.validated_data.get('lessonContent'):
                iep_goal = serializer.validated_data.get('iep_goal')
                student_id = iep_goal.iep.studentID.pk
                topic = request.data.get('topic') or serializer.validated_data.get('title') or 'General Learning'

                generated_content = LessonPlanManagerService.generate_lesson_payload(student_id, topic)
                serializer.validated_data['lessonContent'] = (
                    json.dumps(generated_content)
                    if isinstance(generated_content, (dict, list))
                    else str(generated_content)
                )

            serializer.validated_data.setdefault('status', request.data.get('status', 'Generated'))
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
    permission_classes = [UserAuthPermissions]

    # =================================================================
    # GET: Populates the React Frontend Directory (Step 1 & 2)
    # =================================================================
    def get(self, request, *args, **kwargs):
        """
        Returns the directory of students and their IEP Goal Areas for the
        Generate Lesson Plan tab.
        """
        teacher = get_teacher_for_user(request.user)
        students = StudentProfile.objects.filter(teacher=teacher) if teacher else StudentProfile.objects.none()

        if not students.exists():
            return Response(
                {"directory": [], "message": "No active student profiles found. Please add a student first."},
                status=status.HTTP_200_OK
            )

        directory_payload = []
        for student in students:
            # Use the saved Section C goals from the student's latest IEP/version.
            goal_list = _latest_goal_options_for_student(student)
            directory_payload.append({
                "studentID": student.pk,
                "studentName": student.name,
                "availableGoals": goal_list,
            })

        return Response({"directory": directory_payload}, status=status.HTTP_200_OK)

    # =================================================================
    # POST: Triggers the Multi-Phase Ollama AI Generation (Step 3)
    # =================================================================
    def post(self, request, *args, **kwargs):
        # 1. Validate incoming React payload using your existing serializer
        serializer = LessonGenerationSerializer(data=request.data)
        
        if serializer.is_valid():
            goal_id = serializer.validated_data['goalID']
            teacher = get_teacher_for_user(request.user)

            if not teacher or not IEPGoal.objects.filter(pk=goal_id, iep__studentID__teacher=teacher).exists():
                return Response(
                    {"error": "Targeted IEP Goal could not be located."},
                    status=status.HTTP_404_NOT_FOUND
                )

            try:
                # 2. Trigger the new Service to generate the JSON Array
                generated_data = LessonPlanGenerationService.execute_generation(
                    goal_id=goal_id,
                    teacher_instance=request.user
                )
                
                # 3. Return the JSON array to React to render the stacked UI
                return Response({
                    "message": "Lesson plan sequence generated successfully.",
                    "data": generated_data # 🎯 This holds {"lesson_plans": [ ... ]}
                }, status=status.HTTP_200_OK)
                
            except IEPGoal.DoesNotExist:
                return Response(
                    {"error": "Targeted IEP Goal could not be located."},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {"error": str(e)}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        # Return validation errors if parameter is missing
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
        student_id = request_query_params.get('studentID', None)
        
        # 🚀 REWIRED: Traverse through iep_goal -> iep -> studentID -> name
        
        if student_id:
            queryset = queryset.filter(iep_goal__iep__studentID__pk=student_id)
            
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
    permission_classes = [UserAuthPermissions]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return LessonPlan.objects.none()
        # 🚀 REWIRED: select_related must follow the new chain to optimize database speed
        base_queryset = (
            LessonPlan.objects.filter(iep_goal__iep__studentID__teacher=teacher)
            .select_related('iep_goal__iep__studentID')
            .order_by('-dateCreated')
        )
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
    permission_classes = [UserAuthPermissions]

    def get(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: retrieveCurrentPlan(lessonID)"""
        teacher = get_teacher_for_user(request.user)
        try:
            # Locate the exact record, scoped to the requesting teacher's own students
            lesson_plan = LessonPlan.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)

            # Re-use our read-only serializer to send the data safely
            serializer = LessonPlanDetailSerializer(lesson_plan)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except LessonPlan.DoesNotExist:
            return Response({"error": "Lesson Plan not found."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: validateAndSubmitEdits(lessonID, updatedPayload)"""
        teacher = get_teacher_for_user(request.user)
        try:
            lesson_plan = LessonPlan.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
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
    permission_classes = [UserAuthPermissions]

    def delete(self, request, pk, *args, **kwargs):
        """Matches Class Diagram: executeDeletion(lessonID)"""
        teacher = get_teacher_for_user(request.user)
        try:
            # 1. SDD Security Check: verifyAuthorization(userID, lessonID) — scope the
            #    lookup itself to the requesting teacher's own students.
            lesson_plan = LessonPlan.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
        except LessonPlan.DoesNotExist:
            return Response(
                {"error": "Lesson Plan not found or already deleted."},
                status=status.HTTP_404_NOT_FOUND
            )

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
    serializer_class = VisualAidSerializer
    permission_classes = [UserAuthPermissions]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return VisualAid.objects.none()
        return VisualAid.objects.filter(iep_goal__iep__studentID__teacher=teacher).order_by('-dateCreated')

    def list(self, request, *args, **kwargs):
        """Return saved visual aids, optionally filtered by student.

        Query params supported:
        - student_id / studentID: only visual aids connected to that student's saved IEP goals
        """
        queryset = self.get_queryset()

        student_id = request.query_params.get("student_id") or request.query_params.get("studentID")
        if student_id:
            queryset = queryset.filter(iep_goal__iep__studentID_id=student_id)
        else:
            # Do not expose every student's visual aids by default.
            # The frontend should pass the selected student's ID.
            queryset = queryset.none()
        
        # Matches Sequence Diagram: Handle empty state
        if not queryset.exists():
            return Response([], status=status.HTTP_200_OK)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Matches Sequence Diagram: handleSelectVisualAid(aidId) -> return storageUrl String"""
        try:
            instance = self.get_object()
        except VisualAid.DoesNotExist:
            return Response({"error": "Visual aid asset not found."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Tab Option Selected = "Generate Visual Aid"]"""
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            teacher = get_teacher_for_user(request.user)
            if not _goal_owned_by_teacher(serializer.validated_data.get('iep_goal'), teacher):
                return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)

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
        Executes permission checks and drops the database row.
        """
        try:
            instance = self.get_object()
        except VisualAid.DoesNotExist:
            return Response(
                {"error": "Visual Aid record does not exist or has already been removed."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Drop the row from the database
        self.perform_destroy(instance)

        # Return successful execution state (204 No Content is standard for clean API deletes)
        return Response(
            {"message": "Visual Aid database entry successfully deleted."},
            status=status.HTTP_204_NO_CONTENT
        )
    
    

# =====================================================================
# SDD COMPONENT: PDFExportEngine
# Description: Compiles the processed visual cards, configures layout, 
#              and outputs a clean, printable PDF stream.
# =====================================================================
class PDFExportEngine:
    @staticmethod
    def compile_pdf(visual_aid_record):
        """Fetch the image and embed it into a proper PDF using ReportLab."""
        from reportlab.platypus import SimpleDocTemplate, Image as RLImage, Paragraph, Spacer
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        import tempfile, os

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm, leftMargin=20*mm,
            topMargin=20*mm, bottomMargin=20*mm,
        )
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph(visual_aid_record.title, styles['Title']))
        story.append(Spacer(1, 6*mm))

        # Fetch the image and write to a temp file so ReportLab can read it
        try:
            img_resp = http_client.get(visual_aid_record.imageUrl, timeout=30, allow_redirects=True)
            img_resp.raise_for_status()
            suffix = '.jpg'
            ct = img_resp.headers.get('Content-Type', '')
            if 'png' in ct:
                suffix = '.png'
            elif 'webp' in ct:
                suffix = '.webp'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(img_resp.content)
                tmp_path = tmp.name

            # Scale image to fit page width
            page_width = A4[0] - 40*mm
            rl_img = RLImage(tmp_path, width=page_width, height=page_width * 0.75)
            story.append(rl_img)
            story.append(Spacer(1, 4*mm))
        except Exception as e:
            story.append(Paragraph(f"Image could not be loaded: {e}", styles['Normal']))
            story.append(Paragraph(f"URL: {visual_aid_record.imageUrl}", styles['Normal']))
            tmp_path = None

        # Metadata
        if visual_aid_record.prompt_used:
            story.append(Spacer(1, 4*mm))
            story.append(Paragraph("<b>Prompt used:</b>", styles['Normal']))
            story.append(Paragraph(visual_aid_record.prompt_used, styles['Normal']))

        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(
            f"Generated: {visual_aid_record.dateCreated.strftime('%B %d, %Y')}",
            styles['Normal']
        ))

        doc.build(story)

        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

        buffer.seek(0)
        return buffer


# =====================================================================
# SDD COMPONENT: VisualAidGeneratorService
# Description: Orchestrates the visual synthesis pipeline.
#              Extracts IEP goal text and sensory data into a standard asset.
# =====================================================================
class VisualAidGeneratorService:
    POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"

    @staticmethod
    def build_prompt(goal_text, extra_prompt, category, student_name):
        parts = [
            f"Educational visual aid for a student named {student_name}",
            f"IEP Goal: {goal_text}",
        ]
        if extra_prompt:
            parts.append(f"Additional context: {extra_prompt}")
        if category:
            parts.append(f"Skill category: {category}")
        parts.append(
            "Style: clean, colorful, distraction-free, child-friendly flat illustration, "
            "low visual clutter, bright white background, simple bold icons, no text"
        )
        return ". ".join(parts)

    @staticmethod
    def fetch_image_from_pollinations(prompt):
        """Fetch the image bytes from Pollinations AI server-side to avoid CORS."""
        import urllib.parse
        encoded = urllib.parse.quote(prompt)
        url = f"{VisualAidGeneratorService.POLLINATIONS_BASE}/{encoded}?width=800&height=600&nologo=true&model=flux"
        resp = http_client.get(url, timeout=60, allow_redirects=True)
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "image/jpeg"), url

# =====================================================================
# SDD CONTROLLER: GenerateVisualAidAPIView
# =====================================================================
class GenerateVisualAidAPIView(APIView):
    permission_classes = [UserAuthPermissions]

    def post(self, request, *args, **kwargs):
        iep_goal_id = request.data.get("iep_goal_id")
        extra_prompt = request.data.get("prompt", "").strip()
        category = request.data.get("category", "").strip()

        if not iep_goal_id:
            return Response(
                {"error": "iep_goal_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher = get_teacher_for_user(request.user)
        try:
            target_goal = IEPGoal.objects.select_related("iep__studentID").get(pk=iep_goal_id)
            student = target_goal.iep.studentID
        except IEPGoal.DoesNotExist:
            return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Goal lookup failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not _goal_owned_by_teacher(target_goal, teacher):
            return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)

        # Build the image prompt
        try:
            goal_text = target_goal.annual_goal or "learning and development"
            full_prompt = VisualAidGeneratorService.build_prompt(
                goal_text, extra_prompt, category, student.name
            )
        except Exception as e:
            return Response({"error": f"Prompt build failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Fetch image from Pollinations (server-side — no CORS)
        try:
            _, _, pollinations_url = VisualAidGeneratorService.fetch_image_from_pollinations(full_prompt)
        except Exception as e:
            return Response(
                {"error": f"Image generation failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        final_url = pollinations_url

        # Build a descriptive title
        category_label = f"{category} — " if category else ""
        title = f"{category_label}{student.name} Visual Aid"

        # Save the VisualAid record to the database
        try:
            visual_aid = VisualAid.objects.create(
                iep_goal=target_goal,
                title=title,
                imageUrl=final_url,
                prompt_used=full_prompt,
            )
        except Exception as e:
            return Response({"error": f"Database save failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(
            {
                "message": "Visual Aid generated and saved successfully.",
                "data": {
                    "visualAidID": visual_aid.visualAidID,
                    "title": visual_aid.title,
                    "imageUrl": final_url,
                    "studentName": student.name,
                    "dateCreated": str(visual_aid.dateCreated),
                },
            },
            status=status.HTTP_201_CREATED,
        )
        
# =====================================================================
# SDD CONTROLLER: ExportVisualAidAPIView
# Description: Fetches the saved visual aid record and triggers the 
#              PDF Export Engine to return a downloadable file response.
# =====================================================================
class ExportVisualAidAPIView(APIView):
    permission_classes = [UserAuthPermissions]

    def get(self, request, pk, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        try:
            visual_aid = VisualAid.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
        except VisualAid.DoesNotExist:
            return Response({"error": "Saved Visual Aid not found."}, status=status.HTTP_404_NOT_FOUND)
            
        # Generate the PDF file stream
        pdf_stream = PDFExportEngine.compile_pdf(visual_aid)
        
        # Configure the HTTP response to trigger a file download in the browser
        response = HttpResponse(pdf_stream, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="VisualAid_{visual_aid.visualAidID}.pdf"'
        
        return response


# =====================================================================
# SDD COMPONENT: StrategyGenerationManagerService
# Description: Orchestrates automated strategy generation sequences.
#              Processes criteria and formats data matrices for storage.
# =====================================================================
class StrategyGenerationManagerService:
    @staticmethod
    def generate_strategy_content(title, student_profile):
        # Simulate the AI processing the pedagogical criteria
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
    serializer_class = TeachingStrategySerializer
    permission_classes = [UserAuthPermissions]

    def get_queryset(self):
        teacher = get_teacher_for_user(self.request.user)
        if not teacher:
            return TeachingStrategy.objects.none()
        return TeachingStrategy.objects.filter(iep_goal__iep__studentID__teacher=teacher).order_by('-dateCreated')

    def create(self, request, *args, **kwargs):
        """Matches Sequence Diagram: [Strategy Route Option = "Generate Teaching Strategy" Tab]"""
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            teacher = get_teacher_for_user(request.user)
            if not _goal_owned_by_teacher(serializer.validated_data.get('iep_goal'), teacher):
                return Response({"error": "IEP goal not found."}, status=status.HTTP_404_NOT_FOUND)

            if not serializer.validated_data.get('strategyContent'):
                iep_goal = serializer.validated_data.get('iep_goal')
                student_profile = iep_goal.iep.studentID
                title = serializer.validated_data['title']
                
                # Pass the student_profile object resolved from the IEP goal foreign key
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
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        students = StudentProfile.objects.filter(teacher=teacher) if teacher else StudentProfile.objects.none()

        if not students.exists():
            return Response(
                {"message": "No active student profiles available. Please add a student first."},
                status=status.HTTP_200_OK
            )

        directory_payload = []
        for student in students:
            # Use the saved Section C goals from the student's latest IEP/version.
            goal_list = _latest_goal_options_for_student(student)
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

            teacher = get_teacher_for_user(request.user)
            if not _goal_owned_by_teacher(target_goal, teacher):
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
    permission_classes = [UserAuthPermissions]

    def getSavedStrategies(self, request):
        """Matches Class Diagram: getSavedStrategies(studentID)"""
        student_id = request.query_params.get('studentID')
        teacher = get_teacher_for_user(request.user)

        if not teacher:
            return Response([], status=status.HTTP_200_OK)

        # Pull base query (scoped to the requesting teacher) and run it through the Filter Service
        base_queryset = TeachingStrategy.objects.filter(iep_goal__iep__studentID__teacher=teacher)
        filtered_queryset = StrategyQueryFilterService.get_filtered_strategies(base_queryset, student_id)

        if not filtered_queryset.exists():
            return Response([], status=status.HTTP_200_OK)

        serializer = StrategyRetrievalSerializer(filtered_queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def getStrategyDetails(self, request, pk=None):
        """Matches Class Diagram: getStrategyDetails(strategyID)"""
        teacher = get_teacher_for_user(request.user)
        try:
            strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StrategyRetrievalSerializer(strategy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def exportStrategyGuide(self, request, pk=None):
        """Matches Class Diagram: exportStrategyGuide(strategyID)"""
        teacher = get_teacher_for_user(request.user)
        try:
            strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
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
    permission_classes = [UserAuthPermissions]

    def get(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: Populating historical data arrays"""
        teacher = get_teacher_for_user(request.user)
        try:
            strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
        except TeachingStrategy.DoesNotExist:
            return Response({"error": "Strategy not found."}, status=status.HTTP_404_NOT_FOUND)

        # Use the read-only retrieval serializer to securely format the dates/names
        serializer = StrategyRetrievalSerializer(strategy)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: saveStrategyEdits(strategyID, updatedContent)"""
        teacher = get_teacher_for_user(request.user)
        try:
            strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
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
        # Multi-tenant boundary safety is enforced by the caller (see
        # TeachingStrategyDeleteController.delete), which only looks up
        # strategy_record scoped to the requesting teacher's own students.

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
    permission_classes = [UserAuthPermissions]

    def get(self, request, pk=None, *args, **kwargs):
        teacher = get_teacher_for_user(request.user)
        if pk:
            try:
                strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
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

                # 🚀 REWIRED: Traverse the new architectural chain! (scoped to this teacher)
                strategies = TeachingStrategy.objects.filter(
                    iep_goal__iep__studentID__pk=student_id,
                    iep_goal__iep__studentID__teacher=teacher,
                ).order_by('-dateCreated')

                if not strategies.exists():
                    return Response([], status=status.HTTP_200_OK)
                    
                res_serializer = StrategyRetrievalSerializer(strategies, many=True)
                return Response(res_serializer.data, status=status.HTTP_200_OK)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        """Matches Sequence Diagram: executeStrategyDeletion(strategyID)"""
        teacher = get_teacher_for_user(request.user)
        try:
            strategy = TeachingStrategy.objects.get(pk=pk, iep_goal__iep__studentID__teacher=teacher)
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