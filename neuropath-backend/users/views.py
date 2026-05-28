from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
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
class TeacherLoginController(APIView):
    def post(self, request, *args, **kwargs):
        # Your React app sends the email, which we saved as the username
        email = request.data.get('email')
        password = request.data.get('password')

        # Check if the credentials match a user in the database
        user = authenticate(request, username=email, password=password)

        if user is not None:
            # This creates the session in the database and drops a cookie in the browser
            login(request, user)
            
            return Response({
                "message": "Login successful",
                "teacher": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Invalid email or password."
            }, status=status.HTTP_401_UNAUTHORIZED)

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

        # Capture the OLD email before overwriting it, so we can locate the
        # Teacher mirror-row that still holds the original address.
        old_email = user.email

        # Update the Django User row
        user.first_name = first_name
        user.last_name  = last_name
        user.email      = email
        user.username   = email   # username == email convention used at registration
        if password:
            user.set_password(password)
        user.save()

        # Keep the Teacher mirror-row in sync using the OLD email address.
        # (Using user.email here would be wrong — it's already the new value.)
        from .models import Teacher
        Teacher.objects.filter(email__iexact=old_email).update(
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
        
        
        
# =====================================================================
# SDD MODULE 1.5: STANDARDIZE PLAAFP VIA LOCAL AI
# Component Name: PLAAFPStandardizationController
# Description: Extracts unstructured baseline observations from the NoSQL 
#              preferences block, processes each row against IRIS standards, 
#              and commits the professional clinical text back to storage.
# =====================================================================
class PLAAFPStandardizationController(APIView):
    permission_classes = [IsAuthenticated]  # Mandates secure session cookie validation

    def post(self, request, student_id, format=None):
        try:
            # 1. Retrieve the profile via secure data isolation bounds
            student = StudentProfile.objects.get(studentID=student_id, teacher__email=request.user.email)
            
            if not student.preferences:
                return Response({
                    "error": "No baseline preferences data initialized for this student profile."
                }, status=status.HTTP_400_BAD_REQUEST)
                
            preferences_data = json.loads(student.preferences)

            # 2. Extract specific PLAAFP structural arrays safely via dictionary getters
            eval_results = preferences_data.get('presentEvaluation', '')
            strengths = preferences_data.get('academicStrengths', '')
            needs = preferences_data.get('academicNeeds', '')
            concerns = preferences_data.get('parentalConcerns', '')
            impact = preferences_data.get('curriculumImpact', '')

            if not any([eval_results, strengths, needs, concerns, impact]):
                return Response({
                    "error": "Standardization validation failed. Baseline rows cannot be empty."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 3. Formulate structural system delimiters for the local 3B parameter model context
            system_prompt = """You are an expert Special Education Copyeditor. Your job is to standardize raw teacher notes into formal, IRIS-compliant PLAAFP documentation.

            CRITICAL EXECUTION RULES:
            1. INDEPENDENT TRANSLATION: Process each field independently. Do not combine, blend, or move information between fields.
            2. CORRECT TYPOS & GRAMMAR: Fix all spelling, punctuation, and grammatical mistakes (e.g., convert "with alphabeth blocks he can spell" to "he can spell out random words using alphabet blocks").
            3. UPGRADE TO IRIS STANDARDS: Elevate informal slang or conversational shorthand into clear, professional, behavioral special education compliance statements. 
            4. PRESERVE CONTEXT EXACTLY: Do not invent new metrics, scores, or facts. Maintain the teacher's original diagnostic meaning exactly.
            5. STRICT OUTPUT: You must output ONLY a valid JSON object matching the requested input keys. Do not add markdown backticks or introductory text.
            """

            user_content = f"""Apply IRIS standards to refine each of these five distinct rows individually:

            ROW 1 (presentEvaluation):
            "{eval_results}"
            -> Refine into a clear, professional baseline evaluation text statement.

            ROW 2 (academicStrengths):
            "{strengths}"
            -> Refine into an objective, strength-focused performance text statement.

            ROW 3 (academicNeeds):
            "{needs}"
            -> Refine into a precise, actionable accommodation/need text statement.

            ROW 4 (parentalConcerns):
            "{concerns}"
            -> Refine into a formal, clear representation of parental priorities.

            ROW 5 (curriculumImpact):
            "{impact}"
            -> Refine into a legally compliant description of how the disability hinders general education curriculum progress.

            Return your exact corrections using this identical JSON structure:
            {{
                "presentEvaluation": "Polished ROW 1 text here",
                "academicStrengths": "Polished ROW 2 text here",
                "academicNeeds": "Polished ROW 3 text here",
                "parentalConcerns": "Polished ROW 4 text here",
                "curriculumImpact": "Polished ROW 5 text here"
            }}"""

            # 4. Route payload over local network pipeline loop to Ollama instance
            payload = {
                "model": "llama3.2:3b", 
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                "stream": False,
                "format": "json", 
                "options": {"temperature": 0.1}
            }

            ollama_response = requests.post("http://localhost:11434/api/chat", json=payload, timeout=30)
            if ollama_response.status_code != 200:
                return Response({
                    "error": "Local execution engine execution timeout or failure."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # 5. Deserialize AI response string and update structural attributes
            ai_text = ollama_response.json()['message']['content']
            standardized_plaafp = json.loads(ai_text)

            preferences_data['presentEvaluation'] = standardized_plaafp.get('presentEvaluation', eval_results)
            preferences_data['academicStrengths'] = standardized_plaafp.get('academicStrengths', strengths)
            preferences_data['academicNeeds'] = standardized_plaafp.get('academicNeeds', needs)
            preferences_data['parentalConcerns'] = standardized_plaafp.get('parentalConcerns', concerns)
            preferences_data['curriculumImpact'] = standardized_plaafp.get('curriculumImpact', impact)

            # Re-serialize dictionary mapping back to preferences text column
            student.preferences = json.dumps(preferences_data)
            
            # Commit mutations back down to PostgreSQL
            student.assessmentResult = preferences_data['presentEvaluation']
            student.support_needs = preferences_data['academicNeeds']
            student.save()

            return Response({
                "message": "PLAAFP entries successfully standardized according to IRIS criteria.",
                "standardized_data": standardized_plaafp
            }, status=status.HTTP_200_OK)

        except StudentProfile.DoesNotExist:
            return Response({
                "error": "Targeted profile resource not found or access boundary isolation violation."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)