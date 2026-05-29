# resources/services.py
import ollama
import json
from .models import TeachingStrategy, LessonPlan
from iep_management.models import IEPGoal
class TeachingStrategyGenerationService:
    
    @staticmethod
    def generate_and_save_strategy(goal_instance, teacher_instance):
        """
        Generates a practical teaching strategy and SAVES it directly to the database.
        """
        # 1. Safely traverse the database relationships to gather context
        iep = goal_instance.iep
        student = iep.studentID
        
        # 2. Extract and format the nested enroute objectives (Section C rows)
        rows = goal_instance.objective_rows.all()
        objectives_text = "\n".join(
            [f"- {row.enroute_objectives}" for row in rows if row.enroute_objectives]
        )
        if not objectives_text.strip():
            objectives_text = "No specific enroute objectives provided. Focus on the annual goal."

        # 3. Construct the highly-structured Context Frame Prompt using Cloud Delimiters
        prompt = f"""☁️system☁️Act as an elite Special Education Instructional Designer. You provide concise, highly actionable teaching methods. No fluff.☁️/system☁️
☁️user☁️
STUDENT CONTEXT (SECTION B):
- Name: {getattr(student, 'name', 'The student')}
- Difficulties/Barriers: {getattr(iep, 'difficulties', 'None')} | {getattr(iep, 'learning_barriers', 'None')}
- Accommodations/Facilitators: {getattr(iep, 'accommodations', 'None')} | {getattr(iep, 'learning_facilitators', 'None')}

TARGET GOAL: {getattr(goal_instance, 'annual_goal', 'Not specified')}

ENROUTE OBJECTIVES:
{objectives_text}

INSTRUCTIONS FOR GENERATION:
Generate a highly focused, actionable teaching strategy. Do NOT just rewrite the objectives. Tell the teacher EXACTLY HOW to teach them.

Format your response STRICTLY as follows:

**Core Strategy Overview:** 
(Provide 1 to 2 precise sentences on the overall pedagogical approach to overcome the barriers).

**Actionable Teaching Tactics:**
(For each enroute objective, provide 1 to 2 bullet points explaining the *specific teaching method, physical materials, or exact teacher phrasing* to use. Integrate the student's accommodations directly into these steps as tactical solutions.)

Strict Rules:
- Keep it concise, practical, and punchy.
- Do not add "Real-World Application" or "Macro-Environmental Factors" sections at the end.
- Do not use conversational filler, greetings, or summaries.
☁️/user☁️"""

        try:
            # 4. Route to Local Llama Model
            response = ollama.chat(
                model='llama3.2:3b', 
                messages=[
                    {
                        'role': 'user', 
                        'content': prompt
                    }
                ],
                options={"temperature": 0.25} # Lowered slightly for more direct, less creative text
            )
            
            strategy_content = response['message']['content'].strip()
            
            # 5. Create a dynamic title based on the IEP Goal Name
            strategy_title = f"Strategy for: {getattr(goal_instance, 'goalName', 'Target Goal')}"
            
            # 6. SAVE to the database automatically using the correct relational column
            new_strategy = TeachingStrategy.objects.create(
                iep_goal=goal_instance,
                title=strategy_title,
                strategyContent=strategy_content
            )
            
            return new_strategy
            
        except Exception as e:
            raise Exception(f"Teaching Strategy Generation failed: {str(e)}")
        

# =====================================================================
# SDD COMPONENT: LessonPlanGenerationService
# Description: Orchestrates contextual data extraction, constructs the 
#              cloud-delimited prompt, and enforces JSON array output.
# =====================================================================
class LessonPlanGenerationService:
    
    @staticmethod
    def execute_generation(goal_id, teacher_instance):
        try:
            # 1. Safely traverse database relationships
            goal_instance = IEPGoal.objects.get(pk=goal_id)
            iep = goal_instance.iep if hasattr(goal_instance, 'iep') else goal_instance.parent_iep
            student = iep.studentID
            
            # 2. Extract all Enroute Objectives for this specific goal
            rows = goal_instance.objective_rows.all()
            objectives_text = ""
            for idx, row in enumerate(rows, 1):
                objectives_text += f"Phase {idx}:\n"
                objectives_text += f"- Objective: {getattr(row, 'enroute_objectives', 'N/A')}\n"
                objectives_text += f"- Interventions to use: {getattr(row, 'interventions_procedures', 'N/A')}\n\n"

        except Exception as e:
            raise Exception(f"Failed to extract IEP parameters: {str(e)}")

        # 3. Construct the Cloud Delimited Prompt
        prompt = f"""☁️system☁️Act as an elite Special Education Instructional Designer. You will be provided with a student's context, an Annual Goal, and multiple Enroute Objectives. 
You MUST output ONLY a valid JSON object containing an array of lesson plans. Do not include markdown formatting or conversational filler.☁️/system☁️
☁️user☁️
STUDENT CONTEXT (SECTION A & B):
- Name: {getattr(student, 'name', 'The student')}
- Baseline/Barriers: {getattr(iep, 'baselineData', 'None specified')}
- Accommodations: {getattr(iep, 'accommodations', 'None specified')}

ANNUAL GOAL: {getattr(goal_instance, 'subject_category', 'Target Goal')}

ENROUTE OBJECTIVES:
{objectives_text}

TASK:
Generate a highly tailored lesson plan for EACH Enroute Objective listed above. Ensure the interventions and accommodations are heavily utilized in the 'core_activity'. Output MUST be in this exact JSON structure:
{{
  "lesson_plans": [
    {{
      "objective_focus": "Text of the enroute objective",
      "introduction": "How to introduce the lesson",
      "core_activity": "A single string paragraph explaining the step-by-step activity. DO NOT use nested objects or arrays here.",
      "assessment": "How to measure success",
      "materials_needed": ["Item 1", "Item 2"]
    }}
  ]
}}
☁️/user☁️"""

        try:
            # 4. Route to Local Llama Model with JSON strict mode
            response = ollama.chat(
                model='llama3.2:3b', 
                messages=[{'role': 'user', 'content': prompt}],
                options={"temperature": 0.25},
                format='json'
            )
            
            raw_content = response['message']['content'].strip()
            
            # Parse the JSON string into a native Python dictionary
            parsed_json = json.loads(raw_content)
            
            # 🎯 NEW: SAVE TO DATABASE AUTOMATICALLY
            # Extract a safe name for the title
            goal_area = getattr(goal_instance, 'subject_category', None) or "Target Goal"
            
            # Create the database record
            LessonPlan.objects.create(
                iep_goal=goal_instance,
                title=f"Lesson Sequence: {goal_area}",
                lessonContent=json.dumps(parsed_json), # Converts the dict to a string for your TextField!
                status="Draft"
            )
            
            return parsed_json
            
        except json.JSONDecodeError:
            raise Exception("AI failed to construct a valid JSON array. Please try generating again.")
        except Exception as e:
            raise Exception(f"Lesson Plan Generation failed: {str(e)}")