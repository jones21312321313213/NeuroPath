# resources/services.py
import json
from .models import TeachingStrategy
from iep_management.models import IEPGoal
from iep_management.ai_engine import AIEngineService
from iep_management.privacy_utils import (
    anonymize_student_context,
    extract_student_pii_terms,
    scrub_pii_from_text,
    verify_ra10173_consent,
)


class TeachingStrategyGenerationService:
    
    @staticmethod
    def generate_strategy(goal_instance, teacher_instance):
        """
        Generates a practical teaching strategy draft WITHOUT saving it to the database.
        """
        # 1. Safely traverse the database relationships to gather context
        iep = getattr(goal_instance, 'iep', None) or getattr(goal_instance, 'parent_iep', None)
        student = getattr(iep, 'studentID', None) if iep else None
        
        # Enforce RA 10173 Consent Check
        verify_ra10173_consent(student)

        student_desc = anonymize_student_context(student)
        pii_tokens = extract_student_pii_terms(student)

        # Extract specialFactorNotes from generatedDetails if present
        details = getattr(iep, 'generatedDetails', None) or {}
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except Exception:
                details = {}
        special_notes = details.get('specialFactorNotes', '') if isinstance(details, dict) else ''
        special_notes = scrub_pii_from_text(special_notes, pii_tokens)
        special_notes_line = f"- Special Factors / Behavioral & Sensory: {special_notes}\n" if special_notes else ""

        # 2. Extract and format the nested enroute objectives (Section C rows)
        rows = goal_instance.objective_rows.all() if hasattr(goal_instance, 'objective_rows') else []
        objectives_text = "\n".join(
            [f"- {row.enroute_objectives}" for row in rows if getattr(row, 'enroute_objectives', None)]
        )
        if not objectives_text.strip():
            objectives_text = "No specific enroute objectives provided. Focus on the annual goal."
        objectives_text = scrub_pii_from_text(objectives_text, pii_tokens)

        # 3. Construct the Spotlighted Context Frame Prompt with native system_prompt separation
        nonce = AIEngineService.generate_nonce()
        raw_diffs = scrub_pii_from_text(
            f"{getattr(iep, 'difficulties', 'None')} | {getattr(iep, 'learning_barriers', 'None')}",
            pii_tokens,
        )
        raw_accomms = scrub_pii_from_text(
            f"{getattr(iep, 'accommodations', 'None')} | {getattr(iep, 'learning_facilitators', 'None')}",
            pii_tokens,
        )
        raw_goal = scrub_pii_from_text(
            getattr(goal_instance, 'annual_goal', 'Not specified'),
            pii_tokens,
        )
        spot_difficulties = AIEngineService.sanitize_and_spotlight(raw_diffs, nonce=nonce)
        spot_accommodations = AIEngineService.sanitize_and_spotlight(raw_accomms, nonce=nonce)
        spot_goal = AIEngineService.sanitize_and_spotlight(raw_goal, nonce=nonce)
        spot_objectives = AIEngineService.sanitize_and_spotlight(objectives_text, nonce=nonce)
        if special_notes:
            special_notes_line = (
                f"- Special Factors / Behavioral & Sensory: "
                f"{AIEngineService.sanitize_and_spotlight(special_notes, nonce=nonce)}\n"
            )

        system_prompt = (
            "Act as an elite Special Education Instructional Designer. "
            "You provide concise, highly actionable teaching methods. No fluff."
        )
        prompt = f"""STUDENT CONTEXT (SECTION B):
- Learner: {student_desc}
- Difficulties/Barriers: {spot_difficulties}
- Accommodations/Facilitators: {spot_accommodations}
{special_notes_line}
TARGET GOAL: {spot_goal}

ENROUTE OBJECTIVES:
{spot_objectives}

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
- Do not use conversational filler, greetings, or summaries."""

        try:
            # 4. Route to AIEngineService
            strategy_content, _ = AIEngineService.generate_text(
                prompt=prompt, system_prompt=system_prompt
            )
            strategy_content = strategy_content.strip()
            
            # 5. Create a dynamic title based on the IEP Goal Name
            goal_name = getattr(goal_instance, 'goalName', None) or getattr(goal_instance, 'annual_goal', 'Target Goal')
            strategy_title = f"Strategy for: {goal_name}"
            
            goal_id = getattr(goal_instance, 'goalID', None) or getattr(goal_instance, 'pk', None)
            student_id = getattr(student, 'pk', None) if student else None
            student_name = getattr(student, 'name', 'Unknown Student') if student else 'Unknown Student'
            
            return {
                "title": strategy_title,
                "strategyContent": strategy_content,
                "goalID": goal_id,
                "goalName": goal_name,
                "studentName": student_name,
                "studentID": student_id,
            }
            
        except Exception as e:
            raise Exception(f"Teaching Strategy Generation failed: {str(e)}")

    @staticmethod
    def generate_and_save_strategy(goal_instance, teacher_instance):
        """
        Generates a practical teaching strategy and SAVES it directly to the database.
        Retained for backward compatibility.
        """
        draft = TeachingStrategyGenerationService.generate_strategy(goal_instance, teacher_instance)
        new_strategy = TeachingStrategy.objects.create(
            iep_goal=goal_instance,
            title=draft["title"],
            strategyContent=draft["strategyContent"]
        )
        return new_strategy
        

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
            
            # Enforce RA 10173 Consent Check
            verify_ra10173_consent(student)

            student_desc = anonymize_student_context(student)
            pii_tokens = extract_student_pii_terms(student)
            
            # 2. Extract all Enroute Objectives for this specific goal
            rows = goal_instance.objective_rows.all()
            objectives_text = ""
            for idx, row in enumerate(rows, 1):
                objectives_text += f"Phase {idx}:\n"
                objectives_text += f"- Objective: {getattr(row, 'enroute_objectives', 'N/A')}\n"
                objectives_text += f"- Interventions to use: {getattr(row, 'interventions_procedures', 'N/A')}\n\n"
            objectives_text = scrub_pii_from_text(objectives_text, pii_tokens)

        except Exception as e:
            raise Exception(f"Failed to extract IEP parameters: {str(e)}")

        # 3. Construct the Spotlighted Prompt with native system_prompt separation
        nonce = AIEngineService.generate_nonce()
        spot_baseline = AIEngineService.sanitize_and_spotlight(
            scrub_pii_from_text(getattr(iep, 'baselineData', 'None specified'), pii_tokens),
            nonce=nonce,
        )
        spot_accomm = AIEngineService.sanitize_and_spotlight(
            scrub_pii_from_text(getattr(iep, 'accommodations', 'None specified'), pii_tokens),
            nonce=nonce,
        )
        spot_goal = AIEngineService.sanitize_and_spotlight(
            scrub_pii_from_text(getattr(goal_instance, 'subject_category', 'Target Goal'), pii_tokens),
            nonce=nonce,
        )
        spot_objectives = AIEngineService.sanitize_and_spotlight(
            objectives_text,
            nonce=nonce,
        )

        system_prompt = (
            "Act as an elite Special Education Instructional Designer. You will be provided with a student's context, "
            "an Annual Goal, and multiple Enroute Objectives. You MUST output ONLY a valid JSON object containing an array "
            "of lesson plans. Do not include markdown formatting or conversational filler."
        )
        prompt = f"""STUDENT CONTEXT (SECTION A & B):
- Learner: {student_desc}
- Baseline/Barriers: {spot_baseline}
- Accommodations: {spot_accomm}

ANNUAL GOAL: {spot_goal}

ENROUTE OBJECTIVES:
{spot_objectives}

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
}}"""

        try:
            # 4. Route to AIEngineService with JSON strict mode
            raw_content, _ = AIEngineService.generate_text(
                prompt=prompt, system_prompt=system_prompt, json_mode=True
            )
            
            if isinstance(raw_content, dict):
                parsed_json = raw_content
            else:
                clean_content = str(raw_content).strip()
                if clean_content.startswith('```'):
                    lines = clean_content.splitlines()
                    if lines and lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines and lines[-1].startswith('```'):
                        lines = lines[:-1]
                    clean_content = '\n'.join(lines).strip()
                parsed_json = json.loads(clean_content)
            if not isinstance(parsed_json, dict) or 'lesson_plans' not in parsed_json:
                raise ValueError("Parsed JSON missing 'lesson_plans' key.")
            
            # 5. Return parsed payload for teacher preview.
            # Persistence is triggered explicitly when the teacher accepts and saves.
            return parsed_json
            
        except Exception as e:
            raise Exception(f"Lesson Plan Generation failed: {str(e)}")

