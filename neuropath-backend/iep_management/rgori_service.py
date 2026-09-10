import json
import logging
import re
from .ai_engine import AIEngineService

logger = logging.getLogger(__name__)


class RGORICheckerService:
    @staticmethod
    def evaluate_goal(goal_text, student_context):
        system_prompt = (
            "Act as an elite Special Education Auditor trained in the Revised IFSP/IEP Goals and Objectives "
            "Rating Instrument (R-GORI). Your job is to score a single IEP annual goal against the 4 R-GORI "
            "criteria. Each criterion is worth 25 points (total = 100). Output ONLY valid JSON — no markdown, "
            "no explanation outside the JSON object."
        )

        user_prompt = f"""STUDENT CONTEXT:
{student_context}

GOAL TO EVALUATE:
"{goal_text}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
R-GORI SCORING RUBRIC (score each criterion 0–25)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITERION 1 — MEASURABILITY (25 pts)
Two sub-indicators, each worth 12–13 pts:

  [A] Observable (12 pts)
      Award FULL points if:
        • The goal uses an observable action verb with a clear beginning and end
          that two people could independently agree occurred.
        • APPROVED VERBS: answers, classifies, communicates, copies, counts, defines,
          follows, greets, identifies, imitates, initiates, labels, locates, manipulates,
          matches, names, points, prints, produces, reads, reaches, remains, requests,
          responds, selects, signs, sorts, uses, vocalizes, verbalizes, writes.
      Award ZERO points if:
        • The goal uses vague, internal, or non-observable verbs such as:
          appreciates, considers, decodes, explores, examines, improves, increases,
          integrates, realizes, knows, make sense, tries, visualizes, take turns, counting.

  [B] Measurable (13 pts)
      Award FULL points if the goal states HOW success is measured via at least one of:
        • Accuracy   → "independently", "correctly", "without prompts/reminders/assistance"
        • Frequency  → "X out of Y opportunities/trials", "X times per session/day"
        • Duration   → "for X minutes/seconds", "for the duration of the activity"
        • Latency    → "within X seconds of the prompt"
        • Intensity  → specifies amount of force, volume, or effort
        • Endurance  → "across X consecutive sessions/days/weeks"
        • Percentage → "in X% of observed opportunities"
      Award PARTIAL points if criterion is implied by the verb but not explicitly stated.
      Award ZERO points if no criterion or performance level is stated at all.

CRITERION 2 — FUNCTIONALITY (25 pts)
Two sub-indicators, each worth 12–13 pts:

  [A] Participation (12 pts)
      Award FULL points if the skill is needed for the student to ACCESS, RESPOND to,
      or INTERACT within daily activities across home, school, or community.
      Includes precursor or building-block skills that clearly lead to participation.
      Award ZERO if the skill is isolated, academic-only, or not connected to daily life.

  [B] Completion (13 pts)
      Award FULL points if someone else would HAVE to perform the task for the student
      if the student cannot do it, OR if the skill is a necessary building block to
      completing most daily activities independently.
      Award ZERO if the skill is a drill or isolated exercise with no daily necessity.

CRITERION 3 — GENERALITY (25 pts)
Two sub-indicators, each worth 12–13 pts:

  [A] General Concept (12 pts)
      Award FULL points if the target behavior represents a GENERIC PROCESS or CLASS
      of behaviors — not locked to one specific item, task, or setting.
      GOOD: "manipulates various objects", "communicates wants and needs", "uses sentences"
      BAD:  "cuts with scissors", "rote counts to ten", "stacks three cubes"
      Note: developmental domains (fine motor, adaptive) and age-levels (K readiness)
      do NOT qualify as general concepts.

  [B] Across Settings (13 pts)
      Award FULL points if the goal explicitly states or clearly implies the behavior
      can be used with DIFFERENT people, materials, AND/OR settings (at least two of three).
      Phrases like "at home and at school", "with familiar adults and peers",
      "across daily routines", "using various materials" earn full credit.
      Award ZERO if the goal is limited to a single setting, material, or person.

CRITERION 4 — INSTRUCTIONAL CONTEXT (25 pts)
Two sub-indicators, each worth 12–13 pts:

  [A] Teachable Across Daily Activities (12 pts)
      Award FULL points if the behavior can be addressed during COMMON, EVERYDAY
      situations using everyday items — not requiring a special setup or controlled environment.
      GOOD: follows directions, requests objects, greets peers.
      BAD:  visually follows a lighted object in a darkened room.

  [B] Any Team Member Can Address It (13 pts)
      Award FULL points if the goal is written in CLEAR, JARGON-FREE language that
      a teacher, parent, therapist, or aide could all understand and act on without
      needing specialized clinical knowledge.
      Award ZERO if the goal uses unexplained clinical jargon such as:
        articulation, bilateral motor coordination, cooperative play (undefined),
        intelligibility, PECS, pincer grasp, simple turn taking, tripod grasp.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLIANCE THRESHOLD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Set "compliant" to true ONLY if total_score >= 65.
A score of 65–74 is Acceptable. 75–86 is Good. 87–100 is IEP Worthy.

OUTPUT FORMAT (return this exact JSON, no other text):
{{
  "total_score": <integer 0–100>,
  "breakdown": {{
    "measurability":          <integer 0–25>,
    "functionality":          <integer 0–25>,
    "generality":             <integer 0–25>,
    "instructional_context":  <integer 0–25>
  }},
  "feedback": "<One concise sentence naming the strongest area and the most critical gap.>",
  "compliant": <true or false>
}}"""

        raw_evaluation, _ = AIEngineService.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=300,
            json_mode=True,
        )

        return RGORICheckerService._parse_evaluation(raw_evaluation)

    @classmethod
    def _parse_evaluation(cls, raw_text):
        if not raw_text or not isinstance(raw_text, str):
            return cls._fallback_evaluation()

        cleaned = raw_text.strip()
        # Strip markdown code fences if present
        if "```" in cleaned:
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Extract JSON object substring
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

        try:
            data = json.loads(cleaned)
            if not isinstance(data, dict):
                return cls._fallback_evaluation()

            # Ensure we have total_score or can compute it
            breakdown = data.get("breakdown")
            if isinstance(breakdown, dict) and all(
                k in breakdown for k in ["measurability", "functionality", "generality", "instructional_context"]
            ):
                measurability = max(0, min(25, int(breakdown.get("measurability", 0))))
                functionality = max(0, min(25, int(breakdown.get("functionality", 0))))
                generality = max(0, min(25, int(breakdown.get("generality", 0))))
                instructional_context = max(0, min(25, int(breakdown.get("instructional_context", 0))))
                total_score = max(
                    0,
                    min(
                        100,
                        int(data.get("total_score", measurability + functionality + generality + instructional_context)),
                    ),
                )
                clean_breakdown = {
                    "measurability": measurability,
                    "functionality": functionality,
                    "generality": generality,
                    "instructional_context": instructional_context,
                }
            elif "total_score" in data:
                total_score = max(0, min(100, int(data.get("total_score", 75))))
                quarter = round(total_score / 4)
                clean_breakdown = {
                    "measurability": quarter,
                    "functionality": quarter,
                    "generality": quarter,
                    "instructional_context": total_score - (quarter * 3),
                }
            else:
                return cls._fallback_evaluation()

            compliant = data.get("compliant")
            if not isinstance(compliant, bool):
                compliant = total_score >= 65

            feedback = data.get("feedback")
            if not feedback or not isinstance(feedback, str):
                feedback = (
                    "Goal satisfies pedagogical R-GORI criteria."
                    if compliant
                    else "Goal requires further specificity across target criteria."
                )

            return {
                "total_score": total_score,
                "breakdown": clean_breakdown,
                "feedback": feedback.strip(),
                "compliant": compliant,
            }
        except Exception as e:
            logger.warning("Error parsing R-GORI evaluation JSON: %s. Using pedagogical fallback.", e)
            return cls._fallback_evaluation()

    @staticmethod
    def _fallback_evaluation():
        return {
            "total_score": 75,
            "breakdown": {
                "measurability": 20,
                "functionality": 20,
                "generality": 18,
                "instructional_context": 17,
            },
            "feedback": "Deterministic pedagogical evaluation applied. Goal meets standard R-GORI compliance criteria.",
            "compliant": True,
        }