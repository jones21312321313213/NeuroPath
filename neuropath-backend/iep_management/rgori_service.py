import json
from .huggingface_service import CustomLlamaService

class RGORICheckerService:
    @staticmethod
    def evaluate_goal(goal_text, student_context):
        # 🎯 Cloud delimiters strictly partition instructions from data
        eval_prompt = f"""☁️system☁️Act as an elite Special Education Auditor. Evaluate an IEP goal using the R-GORI framework.
You MUST output ONLY a valid JSON object. Do not include markdown formatting or conversational filler.☁️/system☁️
☁️user☁️
STUDENT CONTEXT: 
{student_context}

GOAL TO EVALUATE: 
"{goal_text}"

TASK:
Score the goal out of 100 based on the 4 R-GORI criteria (Functionality, Generality, Instructional Context, Measurability - 25 pts each).
If the total score is 65 or higher, set compliant to true.

OUTPUT FORMAT:
{{
  "total_score": [0-100],
  "feedback": "A concise 1-sentence explanation of the score.",
  "compliant": true/false
}}
☁️/user☁️"""
        
        raw_evaluation = CustomLlamaService.generate_text(eval_prompt, max_new_tokens=150)
        
        try:
            return json.loads(raw_evaluation.strip())
        except json.JSONDecodeError:
            # Failsafe if the AI hallucinates
            return {"total_score": 0, "feedback": "R-GORI validation failed.", "compliant": False}