from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import IEPDataSerializer
from users.models import StudentProfile
import requests
import json
from tracking.models import AIGenerationLog # Importing the log table from your ERD

# =====================================================================
# SDD COMPONENT: IEPGeneratorService
# Description: Orchestrates the AI-driven drafting process, constructing
#              engineering prompts based on diagnostic profiles.
# =====================================================================
class IEPGeneratorService:
    @staticmethod
    def generate_draft(student, baseline_input, target_domains, teacher_id):
        
        # 1. Format the strict prompt using your research methodology parameters
        formatted_prompt = (
            f"<system>Generate a structured IEP.</system>"
            f"<user>Background: {student.ASDBackground} | "
            f"Baseline: {baseline_input} | Target: {target_domains}</user>"
        )

        # 2. Construct the Request DTO
        payload = {
            "prompt": formatted_prompt,
            "parameters": {
                "temperature": 0.4, # Low temperature for factual, clinical IEP generation
                "max_tokens": 2000
            }
        }

        # 3. Make the network call to your future LLM endpoint
        # (This URL will change depending on where you host your model)
        llm_endpoint = "https://api.your-custom-model-host.com/v1/generate"
        headers = {"Authorization": "Bearer YOUR_FUTURE_API_KEY", "Content-Type": "application/json"}
        
        try:
            response = requests.post(llm_endpoint, json=payload, headers=headers)
            response_data = response.json()
            
            # 4. Extract the generated text from the Response DTO
            draft_goals = response_data['generation']['draft_goals']
            draft_accommodations = response_data['generation']['draft_accommodations']
            
            # 5. Save the metadata to your AIGenerationLog table!
            AIGenerationLog.objects.create(
                teacherID_id=teacher_id,
                prompt_text=formatted_prompt,
                ai_response=json.dumps(response_data['generation']),
                # You can also log response_data['metadata']['generation_tokens'] here!
            )

            return {
                "draft_goals": draft_goals,
                "draft_accommodations": draft_accommodations
            }
            
        except Exception as e:
            # Fallback if the AI server is down
            return {"error": "AI Generation Engine is currently unreachable."}

# =====================================================================
# SDD COMPONENT: IEPGenerationAPIView
# Description: Controller managing incoming HTTP request payloads to 
#              trigger AI generation and process the final save request.
# =====================================================================
class IEPGenerationAPIView(APIView):
    
    def post(self, request, *args, **kwargs):
        # Action 1: "Generate IEP Goals Draft" (Matches Sequence Diagram)
        action = request.data.get('action')
        
        if action == 'generate':
            student_id = request.data.get('studentID')
            baseline_data = request.data.get('baselineData')
            target_domains = request.data.get('domains')
            
            try:
                student = StudentProfile.objects.get(pk=student_id)
            except StudentProfile.DoesNotExist:
                return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)
                
            # Trigger the AI Service
            draft_payload = IEPGeneratorService.generate_draft(student, baseline_data, target_domains)
            
            return Response({
                "message": "Successfully synthesized draft IEP.",
                "draftData": draft_payload
            }, status=status.HTTP_200_OK)

        # Action 2: "Save" (Matches Sequence Diagram update/destroy lifecycle)
        elif action == 'save':
            serializer = IEPDataSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save() # Triggers saveRecord() on the Model
                return Response({
                    "message": "Created Successfully", 
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({"error": "Invalid action specified."}, status=status.HTTP_400_BAD_REQUEST)