# resources/services.py
import ollama
from .models import TeachingStrategy 

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