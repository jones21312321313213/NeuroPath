from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import StudentProfile
from django.contrib.auth.models import User
from .serializers import StudentProfileSerializer, ValidationService,TeacherSerializer
from django.contrib.auth import authenticate, login
import requests
import json
# =====================================================================
# SDD MODULE: TEACHER REGISTRATION
# Component Name: TeacherCreateController
# Description: Intercepts POST requests, orchestrates user payload 
#              validation, and persists credentials into the database.
# =====================================================================
#ListCreateAPIView to temp add teacher
class TeacherCreateController(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = TeacherSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Teacher account successfully created.",
                "user": serializer.data
            }, status=status.HTTP_201_CREATED)
            
        return Response({
            "message": "Registration failed. Invalid details provided.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
# =====================================================================
# SDD MODULE 1.1: CREATE STUDENT PROFILE & LIST PROFILES
# Component Name: StudentProfileListCreateView
# Description: Handles incoming HTTP POST/GET requests for profile 
#              creation and roster generation.
# =====================================================================
class StudentProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentProfileSerializer

    def get_queryset(self):
        """
        Return only the students that belong to the requesting teacher.

        The frontend passes the logged-in teacher's Django User ID as the
        ?teacher_id= query parameter.  We resolve that User → Teacher record
        and filter the queryset accordingly.  If no valid teacher_id is
        supplied we return an empty queryset so no data leaks.
        """
        from django.contrib.auth.models import User
        from .models import Teacher

        teacher_id = self.request.query_params.get('teacher_id')
        if not teacher_id:
            return StudentProfile.objects.none()

        try:
            user = User.objects.get(pk=int(teacher_id))
            teacher = Teacher.objects.get(email=user.email)
            return StudentProfile.objects.filter(teacher=teacher)
        except (User.DoesNotExist, Teacher.DoesNotExist, ValueError, TypeError):
            return StudentProfile.objects.none()

    def create(self, request, *args, **kwargs):
        # 1. Receive data from the React Form
        serializer = self.get_serializer(data=request.data)

        # 2. Process Validation rules via Serializer
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response({
                "message": "Student profile successfully created and saved.",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Validation failed. Please check the entered details.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# SDD MODULE 1.2: UPDATE STUDENT PROFILE
# Component Name: ProfileUpdateController
# Description: Intercepts HTTP PUT requests, coordinates server-side 
#              validation, and commits data edits to PostgreSQL.
# =====================================================================
class ProfileUpdateController(generics.RetrieveUpdateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = ValidationService  # Links to your update ValidationService

    def update(self, request, *args, **kwargs):
        # 1. ProfileService context: Verify record existence
        try:
            instance = self.get_object() 
        except Exception:
            return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # 2. Process partial input payloads safely
        serializer = self.get_serializer(instance, data=request.data, partial=True)

        if serializer.is_valid():
            # 3. StudentProfileManager context: Secure update execution
            self.perform_update(serializer)
            return Response({
                "message": "Student profile updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Update failed. Invalid input provided.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# =====================================================================
# SDD MODULE 1.3: VIEW STUDENT PROFILE
# Component Name: ProfileViewController
# Description: Intercepts client-side HTTP GET requests to read and 
#              isolate specific student records safely.
# =====================================================================
class ProfileViewController(generics.RetrieveAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer

    def retrieve(self, request, *args, **kwargs):
        # 1. ProfileService context: Retrieve targeted profile record
        try:
            instance = self.get_object() 
        except Exception:
            # Matches Sequence Diagram 'alt' block [validation = FALSE]
            return Response({
                "error": "No Details Available. Student profile not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 2. Return record if found: [validation = TRUE]
        serializer = self.get_serializer(instance)
        return Response({
            "message": "Profile Data Returned successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


# =====================================================================
# SDD MODULE 1.4: ANALYZE AND GENERATE AI INSIGHTS
# System Sub-Pipeline Architecture Block
# =====================================================================

# --- Sub-Component 1: StudentProfileManager ---
class StudentProfileManager:
    @staticmethod
    def get_student_record(student_id):
        try:
            return StudentProfile.objects.get(pk=student_id)
        except StudentProfile.DoesNotExist:
            return None

# --- Sub-Component 2: ValidationService ---
class ValidationService:
    @staticmethod
    def validate_data_sufficiency(student):
        if not student.assessmentResults or len(student.assessmentResults.strip()) < 5:
            return False
        return True

# --- Sub-Component 3: AIGenerationService ---
class AIGenerationService:
    @staticmethod
    def generate_insight(student):
        prompt = (
            f"Analyze the following student profile for {student.name}. "
            f"Age: {student.age}, Grade: {student.grade}. "
            f"ASD Background: {student.ASDBackground}. "
            f"Preferences: {student.preferences}. "
            f"Assessment Results: {student.assessmentResults}. "
            f"Provide actionable pedagogical insights."
        )
        
        # Mock AI generation response pattern matching your design documentation flow
        mock_ai_response = (
            f"Based on the data provided for {student.name}, the AI recommends "
            f"leveraging their preference for '{student.preferences}' to create "
            f"highly structured learning modules. Ensure visual schedules are utilized."
        )
        return mock_ai_response

# --- Sub-Component 4: AIInsightController (Main Controller Node) ---
class AIInsightController(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk, format=None):
        # We just return a 200 OK so the UI loads cleanly before they click generate
        return Response({
            "message": "Ready to generate insights."
        }, status=status.HTTP_200_OK)
        
        
    def post(self, request, pk, format=None):
        
        # 1. Coordinate data isolation via Manager layer
        student = StudentProfileManager.get_student_record(pk)
        if not student:
            return Response({
                "error": "Profile not found. Cannot generate insights."
            }, status=status.HTTP_404_NOT_FOUND)

        # 2. Route payload through strict server-side validation check
        is_valid = ValidationService.validate_data_sufficiency(student)
        if not is_valid:
            return Response({
                "error": "Validation Failed: Insufficient assessment data to generate a meaningful AI insight."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Request logic resolution from Generation service layer
        insight_text = AIGenerationService.generate_insight(student)

        # 4. Return serialized text response engine content back to React frontend
        return Response({
            "message": "AI Insight generated successfully.",
            "insightData": insight_text
        }, status=status.HTTP_200_OK)
        
# =====================================================================
# SDD MODULE: TEACHER LOGIN
# Component Name: TeacherLoginController
# Description: Authenticates user credentials against the database and 
#              establishes a secure server-side session.
# =====================================================================
@method_decorator(csrf_exempt, name='dispatch')
class TeacherLoginController(APIView):
    authentication_classes = [] 
    permission_classes = [AllowAny] 

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)

        if user is not None:
            # 🎯 Generate or fetch the Token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                "message": "Login successful",
                "token": token.key, # 🎯 Return token to React
                "teacher": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        
# =====================================================================
# TEACHER PROFILE UPDATE
# PATCH /api/users/profile/update/
# Accepts: { id, first_name, last_name, email, password? }
# Identifies the teacher by the Django User id sent in the request body.
# Also keeps the Teacher mirror-row (name, email) in sync.
# =====================================================================
class TeacherProfileUpdateController(APIView):
    def patch(self, request, *args, **kwargs):
        user_id = request.data.get("id")
        if not user_id:
            return Response(
                {"detail": "User ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        first_name = request.data.get("first_name", user.first_name).strip()
        last_name  = request.data.get("last_name",  user.last_name).strip()
        email      = request.data.get("email",      user.email).strip().lower()
        password   = request.data.get("password", "")

        errors = {}
        if not first_name:
            errors["first_name"] = "First name is required."
        if not last_name:
            errors["last_name"] = "Last name is required."
        if not email or "@" not in email:
            errors["email"] = "A valid email address is required."
        if password and len(password) < 6:
            errors["password"] = "Password must be at least 6 characters."
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Check email uniqueness (exclude the current user)
        if User.objects.filter(email=email).exclude(pk=user_id).exists():
            return Response(
                {"errors": {"email": "This email is already in use."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update the Django User row
        user.first_name = first_name
        user.last_name  = last_name
        user.email      = email
        user.username   = email   # username == email convention used at registration
        if password:
            user.set_password(password)
        user.save()

        # Keep the Teacher mirror-row in sync
        from .models import Teacher
        Teacher.objects.filter(email__iexact=user.email).update(
            name=f"{first_name} {last_name}".strip(),
            email=email,
        )

        return Response(
            {
                "id":         user.id,
                "first_name": user.first_name,
                "last_name":  user.last_name,
                "email":      user.email,
            },
            status=status.HTTP_200_OK,
        )
        
