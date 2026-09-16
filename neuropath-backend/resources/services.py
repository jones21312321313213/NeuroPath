# resources/services.py
import json
from .models import TeachingStrategy, LessonPlan
from iep_management.models import IEPGoal
from iep_management.ai_engine import AIEngineService
from iep_management.retriever_service import SemanticRetrieverService
from iep_management.privacy_utils import (
    anonymize_student_context,
    scrub_pii_from_text,
    verify_ra10173_consent,
    PIIScrubberService,
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
        real_name = getattr(student, 'name', '') or ''
        guardian_name = getattr(student, 'guardian_name', '') or ''
        pii_tokens = [real_name, guardian_name]
        if real_name:
            pii_tokens.extend(real_name.split())
        if guardian_name:
            pii_tokens.extend(guardian_name.split())

        student_profile = {
            'full_name': real_name,
            'name': real_name,
            'first_name': real_name.split()[0] if real_name else '',
            'guardian_name': guardian_name,
            'age': getattr(student, 'age', None),
            'grade': getattr(student, 'grade', None),
        }

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

        # Scrub Section B fields prior to query formation or prompt insertion
        difficulties_scrubbed = scrub_pii_from_text(getattr(iep, 'difficulties', '') or '', pii_tokens)
        barriers_scrubbed = scrub_pii_from_text(getattr(iep, 'learning_barriers', '') or '', pii_tokens)
        accommodations_scrubbed = scrub_pii_from_text(getattr(iep, 'accommodations', '') or '', pii_tokens)
        facilitators_scrubbed = scrub_pii_from_text(getattr(iep, 'learning_facilitators', '') or '', pii_tokens)

        # 2. Extract and format the nested enroute objectives (Section C rows)
        rows = goal_instance.objective_rows.all() if hasattr(goal_instance, 'objective_rows') else []
        raw_objectives = "\n".join(
            [f"- {row.enroute_objectives}" for row in rows if getattr(row, 'enroute_objectives', None)]
        )
        objectives_text = scrub_pii_from_text(raw_objectives, pii_tokens)
        if not objectives_text.strip():
            objectives_text = "No specific enroute objectives provided. Focus on the annual goal."

        # 2.5 Retrieve RAG Pedagogical Context with target age partition
        goal_domain = getattr(goal_instance, 'subject_category', None) or 'Communication'
        target_age_group = SemanticRetrieverService.derive_age_group(
            age=getattr(student, 'age', None),
            grade=getattr(student, 'grade', None)
        )
        rag_query = f"Teaching strategies and instructional accommodations for {goal_domain}. Barriers: {difficulties_scrubbed}"
        retrieved_chunks = SemanticRetrieverService.retrieve_context(
            domain=goal_domain,
            query_text=rag_query,
            target_age_group=target_age_group,
            top_k=3
        )
        rag_context_text = SemanticRetrieverService.format_context_for_prompt(retrieved_chunks)

        # Create surrogate map for in-memory rehydration
        _, surrogate_map = PIIScrubberService.sanitize_plaafp(
            f"{real_name} {special_notes}",
            student_profile
        )
        if '[STUDENT_A]' not in surrogate_map:
            surrogate_map['[STUDENT_A]'] = real_name or student_desc

        # 3. Construct the highly-structured Context Frame Prompt using Cloud Delimiters
        prompt = f"""☁️system☁️Act as an elite Special Education Instructional Designer for DepEd Region VII. You provide concise, highly actionable teaching methods grounded in evidence-based ASD practices. No fluff.☁️/system☁️
☁️user☁️
PEDAGOGICAL KNOWLEDGE BASE (GROUNDING CONTEXT):
----------------------------------------
{rag_context_text}
----------------------------------------

STUDENT CONTEXT (SECTION B):
- Learner: {student_desc}
- Difficulties/Barriers: {difficulties_scrubbed or 'None'} | {barriers_scrubbed or 'None'}
- Accommodations/Facilitators: {accommodations_scrubbed or 'None'} | {facilitators_scrubbed or 'None'}
{special_notes_line}
TARGET GOAL: {scrub_pii_from_text(getattr(goal_instance, 'annual_goal', 'Not specified'), pii_tokens)}

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
            # 4. Route to AIEngineService
            strategy_content, _ = AIEngineService.generate_text(prompt=prompt)
            strategy_content = strategy_content.strip()
            # Rehydrate surrogate tokens in memory before storage
            strategy_content = PIIScrubberService.rehydrate_text(strategy_content, surrogate_map)
            
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
            real_name = getattr(student, 'name', '') or ''
            guardian_name = getattr(student, 'guardian_name', '') or ''
            pii_tokens = [real_name, guardian_name]
            if real_name:
                pii_tokens.extend(real_name.split())
            if guardian_name:
                pii_tokens.extend(guardian_name.split())

            student_profile = {
                'full_name': real_name,
                'name': real_name,
                'first_name': real_name.split()[0] if real_name else '',
                'guardian_name': guardian_name,
                'age': getattr(student, 'age', None),
                'grade': getattr(student, 'grade', None),
            }

            # 2. Extract all Enroute Objectives for this specific goal and scrub PII
            rows = goal_instance.objective_rows.all()
            objectives_text = ""
            for idx, row in enumerate(rows, 1):
                objectives_text += f"Phase {idx}:\n"
                objectives_text += f"- Objective: {getattr(row, 'enroute_objectives', 'N/A')}\n"
                objectives_text += f"- Interventions to use: {getattr(row, 'interventions_procedures', 'N/A')}\n\n"

            objectives_scrubbed = scrub_pii_from_text(objectives_text, pii_tokens)
            baseline_scrubbed = scrub_pii_from_text(getattr(iep, 'baselineData', '') or '', pii_tokens)
            accommodations_scrubbed = scrub_pii_from_text(getattr(iep, 'accommodations', '') or '', pii_tokens)

        except Exception as e:
            raise Exception(f"Failed to extract IEP parameters: {str(e)}")

        # 2.5 Retrieve RAG Pedagogical Context with target age partition
        lesson_domain = getattr(goal_instance, 'subject_category', None) or 'Communication'
        target_age_group = SemanticRetrieverService.derive_age_group(
            age=getattr(student, 'age', None),
            grade=getattr(student, 'grade', None)
        )
        rag_query = f"Lesson plan activities and ASD interventions for {lesson_domain}. Objectives: {objectives_scrubbed[:200]}"
        retrieved_chunks = SemanticRetrieverService.retrieve_context(
            domain=lesson_domain,
            query_text=rag_query,
            target_age_group=target_age_group,
            top_k=3
        )
        rag_context_text = SemanticRetrieverService.format_context_for_prompt(retrieved_chunks)

        # Create surrogate map for in-memory rehydration
        _, surrogate_map = PIIScrubberService.sanitize_plaafp(
            f"{real_name} {baseline_scrubbed}",
            student_profile
        )
        if '[STUDENT_A]' not in surrogate_map:
            surrogate_map['[STUDENT_A]'] = real_name or student_desc

        # 3. Construct the Cloud Delimited Prompt
        prompt = f"""☁️system☁️Act as an elite Special Education Instructional Designer for DepEd Region VII. You will be provided with authoritative reference knowledge, a student's context, an Annual Goal, and multiple Enroute Objectives. 
You MUST output ONLY a valid JSON object containing an array of lesson plans grounded in the pedagogical context. Do not include markdown formatting or conversational filler.☁️/system☁️
☁️user☁️
PEDAGOGICAL KNOWLEDGE BASE (GROUNDING CONTEXT):
----------------------------------------
{rag_context_text}
----------------------------------------

STUDENT CONTEXT (SECTION A & B):
- Learner: {student_desc}
- Baseline/Barriers: {baseline_scrubbed or 'None specified'}
- Accommodations: {accommodations_scrubbed or 'None specified'}

ANNUAL GOAL: {getattr(goal_instance, 'subject_category', 'Target Goal')}

ENROUTE OBJECTIVES:
{objectives_scrubbed}

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
            # 4. Route to AIEngineService with JSON strict mode
            raw_content, _ = AIEngineService.generate_text(prompt=prompt, json_mode=True)
            
            try:
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
            except Exception:
                fallback_str = AIEngineService._deterministic_fallback(prompt, json_mode=True)
                parsed_json = json.loads(fallback_str)
            
            # Rehydrate nested surrogate tokens in memory before database storage
            def _rehydrate_payload(item, s_map):
                if isinstance(item, str):
                    return PIIScrubberService.rehydrate_text(item, s_map)
                elif isinstance(item, list):
                    return [_rehydrate_payload(x, s_map) for x in item]
                elif isinstance(item, dict):
                    return {k: _rehydrate_payload(v, s_map) for k, v in item.items()}
                return item

            parsed_json = _rehydrate_payload(parsed_json, surrogate_map)

            # 5. SAVE TO DATABASE AUTOMATICALLY
            # Extract a safe name for the title
            goal_area = getattr(goal_instance, 'subject_category', None) or "Target Goal"
            
            # Create the database record
            LessonPlan.objects.create(
                iep_goal=goal_instance,
                title=f"Lesson Sequence: {goal_area}",
                lessonContent=json.dumps(parsed_json),
                status="Draft"
            )
            
            return parsed_json
            
        except Exception as e:
            raise Exception(f"Lesson Plan Generation failed: {str(e)}")

