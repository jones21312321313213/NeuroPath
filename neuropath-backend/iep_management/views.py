from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import IEPDataSerializer
from users.models import StudentProfile
from tracking.models import AIGenerationLog
from .models import Assessment, IEPGoal
import requests
import json
import re

# =====================================================================
# SDD COMPONENT: IEPGeneratorService
# Description: Orchestrates the AI-driven drafting process, constructing
#              engineering prompts based on diagnostic profiles.
# =====================================================================
class IEPGeneratorService:
    @staticmethod
    def generate_draft(student, baseline_input, target_domains, teacher_id):
        
        # 1. Fetch up to 3 of the most recent formal Assessments for this student
        recent_assessments = Assessment.objects.filter(student=student).order_by('-dateTaken')[:3]
        assessment_context = ""
        if recent_assessments.exists():
            assessment_context = "\nFormal Assessment History:\n" + "\n".join(
                [f"- {a.assessmentType}: {a.result}" for a in recent_assessments]
            )

        # 2. Inject the Assessment context directly into the AI prompt
        formatted_prompt = (
            f"☁️system☁️Act as an expert Special Education diagnostician. Generate a structured IEP adhering strictly to R-GORI compliance standards.☁️/system☁️\n"
            f"☁️user☁️\n"
            f"Student Profile Data:\n"
            f"- ASD Background: {student.asdBackground}\n"
            f"- Formal Diagnosis: {student.diagnosis}\n"
            f"- Support Needs: {student.support_needs}\n"
            f"- Sensory Preferences: {student.sensory_preferences}\n"
            f"- High-Interest Areas: {student.interests}\n"
            f"- Learning Style: {student.learning_style}\n"
            f"- Teacher Observations: {baseline_input}\n"
            f"{assessment_context}\n"
            f"- Target Educational Domains: {target_domains}\n"
            f"☁️/user☁️"
        )

        # 3. Construct the Request DTO
        payload = {
            "prompt": formatted_prompt,
            "parameters": {
                "temperature": 0.3,
                "max_tokens": 2000
            }
        }

        # =================================================================
        # FUTURE PRODUCTION CODE: UNCOMMENT THIS WHEN YOUR LLM IS LIVE
        # =================================================================
        # llm_endpoint = "https://api.your-custom-model-host.com/v1/generate"
        # headers = {"Authorization": "Bearer YOUR_FUTURE_API_KEY", "Content-Type": "application/json"}
        # 
        # try:
        #     response = requests.post(llm_endpoint, json=payload, headers=headers)
        #     response_data = response.json()
        #     
        #     # Extract the generated text from the Response DTO
        #     draft_goals = response_data['generation']['draft_goals']
        #     draft_accommodations = response_data['generation']['draft_accommodations']
        #     
        # except Exception as e:
        #     print(f"LLM Error: {str(e)}") 
        #     return {"error": "AI Generation Engine is currently unreachable."}
        # =================================================================

        # =================================================================
        # CURRENT DEVELOPMENT CODE: MOCK DATA (DELETE WHEN LLM IS LIVE)
        # =================================================================
        draft_goals = (
            f"1. By May 2027, when presented with tasks matching his learning style ({student.learning_style}), "
            f"Kuan will independently maintain task persistence for 15 minutes across 4 out of 5 consecutive data tracking days.\n"
            f"2. By June 2027, Kuan will request a sensory break verbally in 80% of opportunities."
        )
        draft_accommodations = (
            f"1. Leverage interest in {student.interests} as an interactive academic motivator.\n"
            f"2. Strict adherence to sensory rules: Provide accommodations for {student.sensory_preferences} prior to bells."
        )
        # =================================================================

        # 4. Save the metadata to your AIGenerationLog table!
        if teacher_id:
            AIGenerationLog.objects.create(
                teacherID_id=teacher_id,
                prompt_text=formatted_prompt,
                ai_response=json.dumps({
                    "draft_goals": draft_goals,
                    "draft_accommodations": draft_accommodations
                }),
            )

        return {
            "draft_goals": draft_goals,
            "draft_accommodations": draft_accommodations
        }


# =====================================================================
# SDD COMPONENT: IEPGenerationAPIView
# Description: Controller managing incoming HTTP request payloads to 
#              trigger AI generation and process the final save request.
# =====================================================================
class IEPGenerationAPIView(APIView):
    
    def post(self, request, *args, **kwargs):
        action = request.data.get('action')
        
        # Action 1: "Generate IEP Goals Draft"
        if action == 'generate':
            student_id = request.data.get('studentID')
            baseline_data = request.data.get('baselineData')
            target_domains = request.data.get('domains')
            
            teacher_id = request.user.id if request.user.is_authenticated else request.data.get('teacherID')
            
            try:
                student = StudentProfile.objects.get(pk=student_id)
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
                
            draft_payload = IEPGeneratorService.generate_draft(
                student=student, 
                baseline_input=baseline_data, 
                target_domains=target_domains, 
                teacher_id=teacher_id
            )
            
            if "error" in draft_payload:
                return Response(draft_payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            return Response({
                "message": "Successfully synthesized draft IEP.",
                "draftData": draft_payload
            }, status=status.HTTP_200_OK)

        # Action 2: "Save" finalized document and atomize goals
        elif action == 'save':
            serializer = IEPDataSerializer(data=request.data)
            if serializer.is_valid():
                # 1. Save the main document paragraph to the IEPModel table
                iep_instance = serializer.save() 
                
                # 2. Parse the generated goals text block and save to IEPGoal table
                raw_goals_text = iep_instance.goals
                goal_items = re.split(r'\n\d+\.\s*', raw_goals_text)
                
                for item in goal_items:
                    cleaned_goal = item.strip()
                    if cleaned_goal and len(cleaned_goal) > 10:
                        extracted_metric = "Tracked via Teacher Data" if "tracking" in cleaned_goal else "Standard R-GORI Metric"
                        
                        IEPGoal.objects.create(
                            iep=iep_instance,
                            goalName=cleaned_goal[:200], 
                            target_metric=extracted_metric
                        )

                return Response({
                    "message": "IEP Created Successfully and Goals Atomized.", 
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({"error": "Invalid action specified."}, status=status.HTTP_400_BAD_REQUEST)

