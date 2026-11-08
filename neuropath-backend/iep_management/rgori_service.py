import json
import logging
import re
from .ai_engine import AIEngineService

logger = logging.getLogger(__name__)


class RGORICheckerService:
    APPROVED_VERBS = {
        "answers", "classifies", "communicates", "copies", "counts", "defines",
        "follows", "greets", "identifies", "imitates", "initiates", "labels",
        "locates", "manipulates", "matches", "names", "points", "prints",
        "produces", "reads", "reaches", "remains", "requests", "responds",
        "selects", "signs", "sorts", "uses", "vocalizes", "verbalizes",
        "writes", "transition", "transitions", "walks", "sits", "attends",
        "participates", "completes", "demonstrates", "speaks", "asks",
        "shares", "raises", "regulates", "engages", "maintains", "identifies"
    }

    NON_OBSERVABLE_VERBS = {
        "understands", "understand", "appreciates", "appreciate", "considers",
        "consider", "decodes", "explores", "explore", "examines", "examine",
        "improves", "improve", "increases", "increase", "integrates", "integrate",
        "realizes", "realize", "knows", "know", "make sense", "makes sense",
        "tries", "try", "visualizes", "visualize", "learn", "learns"
    }

    CLINICAL_JARGON = [
        "bilateral motor coordination", "cooperative play", "intelligibility",
        "pincer grasp", "simple turn taking", "tripod grasp", "vestibular",
        "proprioceptive", "tactile defensiveness", "sensory processing disorder"
    ]

    @classmethod
    def audit_goal_explainable(cls, goal_text, student_context=""):
        """
        Deterministically evaluates an annual goal against the 4 R-GORI criteria
        using explainable ABCD pedagogical heuristics without blocking AI network calls.
        """
        text = (goal_text or "").strip()
        lower_text = text.lower()

        # -------------------------------------------------------------
        # 1. MEASURABILITY (Observable verb [12] + Measurable criteria [13])
        # -------------------------------------------------------------
        non_obs_matches = [v for v in cls.NON_OBSERVABLE_VERBS if re.search(r"\b" + re.escape(v) + r"\b", lower_text)]
        obs_matches = [v for v in cls.APPROVED_VERBS if re.search(r"\b" + re.escape(v) + r"\b", lower_text)]

        if non_obs_matches and not obs_matches:
            obs_score = 0
            obs_exp = f"Employs non-observable internal verb ('{non_obs_matches[0]}') lacking definite behavioral criteria."
        elif non_obs_matches and obs_matches:
            obs_score = 6
            obs_exp = f"Includes observable actions ('{obs_matches[0]}') alongside non-observable phrases ('{non_obs_matches[0]}')."
        elif obs_matches:
            obs_score = 12
            obs_exp = f"Employs clear observable action verb ('{obs_matches[0]}') with verifiable execution boundaries."
        else:
            obs_score = 6
            obs_exp = "Behavioral action is implied but would benefit from a more concrete observable action verb."

        measurable_indicators = []
        if re.search(r"\b(independently|correctly|without prompts|with 0 prompts|unassisted)\b", lower_text):
            measurable_indicators.append("independence/accuracy condition")
        if re.search(r"\b\d+%\b", lower_text) or "accuracy" in lower_text:
            measurable_indicators.append("percentage accuracy threshold")
        if re.search(r"\b\d+\s*(?:out of|of|\/)\s*\d+\b", lower_text) or "opportunities" in lower_text or "trials" in lower_text:
            measurable_indicators.append("trial frequency ratio")
        if re.search(r"\b(?:across|over)\s+\d+\s+consecutive\b", lower_text) or "weeks" in lower_text or "sessions" in lower_text:
            measurable_indicators.append("consecutive endurance period")
        if re.search(r"\bfor\s+\d+\s+(?:minutes|mins|seconds|secs)\b", lower_text):
            measurable_indicators.append("duration threshold")

        if len(measurable_indicators) >= 2:
            meas_score = 13
            meas_exp = f"Specifies rigorous measurement criteria including {', '.join(measurable_indicators[:2])}."
        elif len(measurable_indicators) == 1:
            meas_score = 8
            meas_exp = f"Provides baseline criteria ({measurable_indicators[0]}), but lacks multi-session mastery endurance."
        else:
            meas_score = 0
            meas_exp = "Missing quantifiable thresholds, percentage criteria, and trial frequencies."

        measurability_score = max(0, min(25, obs_score + meas_score))
        measurability_explanation = f"{obs_exp} {meas_exp}"

        # -------------------------------------------------------------
        # 2. FUNCTIONALITY (Daily Participation [12] + Task Completion [13])
        # -------------------------------------------------------------
        func_indicators = []
        if re.search(r"\b(classroom|activities|routine|daily|school|recess|lunch|transition|home|community)\b", lower_text):
            func_indicators.append("routine participation")
        if re.search(r"\b(communicate|request|interact|peer|independently|self-care|participate|respond|express)\b", lower_text):
            func_indicators.append("functional independence")

        if len(func_indicators) >= 2:
            func_score = 25
            func_exp = "Directly facilitates student access, interaction, and essential independence in daily classroom routines."
        elif len(func_indicators) == 1:
            func_score = 18
            func_exp = "Addresses functional participation within specific activities, with moderate transferability to general routines."
        else:
            func_score = 10
            func_exp = "Appears academic or drill-focused without clear integration into active daily school routines."

        # -------------------------------------------------------------
        # 3. GENERALITY (Generic Concept [12] + Across Settings [13])
        # -------------------------------------------------------------
        gen_indicators = []
        if re.search(r"\b(across|various|multiple|different|settings|routines|opportunities|materials|peers|adults|teachers)\b", lower_text):
            gen_indicators.append("cross-context transfer")
        if not re.search(r"\b(cut with scissors|rote counts to ten|stacks three cubes)\b", lower_text):
            gen_indicators.append("broad behavioral class")

        if len(gen_indicators) >= 2:
            gen_score = 25
            gen_exp = "Targets a generic behavioral competency that readily generalizes across settings, materials, and team members."
        elif len(gen_indicators) == 1:
            gen_score = 18
            gen_exp = "Represents a broad behavioral skill, though explicit generalization parameters across contexts could be expanded."
        else:
            gen_score = 10
            gen_exp = "Risk of restricted behavior locked to isolated stimuli or single specific classroom materials."

        # -------------------------------------------------------------
        # 4. INSTRUCTIONAL CONTEXT (Teachable in Routine [12] + Jargon-Free [13])
        # -------------------------------------------------------------
        jargon_matches = [j for j in cls.CLINICAL_JARGON if j in lower_text]
        if jargon_matches:
            inst_score = 14
            inst_exp = f"Teachable across activities, but contains clinical terminology ('{jargon_matches[0]}') that may confuse general education aides or parents."
        else:
            inst_score = 25
            inst_exp = "Expressed in clean, jargon-free pedagogical language directly teachable by general ed teachers, aides, and parents."

        total_score = max(0, min(100, measurability_score + func_score + gen_score + inst_score))

        if total_score >= 85:
            status = "Exemplary"
            feedback = "Exemplary SMART ABCD alignment across all 4 pedagogical R-GORI criteria."
        elif total_score >= 65:
            status = "IEP Ready"
            feedback = "Meets R-GORI compliance standards; ready for IEP committee review."
        else:
            status = "Review Advised"
            feedback = "Review advised: Strengthen observable action verbs and measurable criteria before finalizing."

        return {
            "total_score": total_score,
            "status": status,
            "compliant": total_score >= 65,
            "feedback": feedback,
            "breakdown": {
                "measurability": {
                    "score": measurability_score,
                    "explanation": measurability_explanation,
                },
                "functionality": {
                    "score": func_score,
                    "explanation": func_exp,
                },
                "generality": {
                    "score": gen_score,
                    "explanation": gen_exp,
                },
                "instructional_context": {
                    "score": inst_score,
                    "explanation": inst_exp,
                },
            },
        }

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

        try:
            raw_evaluation, _ = AIEngineService.generate_text(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=300,
                json_mode=True,
            )
        except Exception as e:
            logger.warning("R-GORI evaluation AI call failed: %s", e)
            raise RuntimeError(f"AI generation service is temporarily unavailable for R-GORI evaluation: {e}")

        return RGORICheckerService._parse_evaluation(raw_evaluation)

    @classmethod
    def _parse_evaluation(cls, raw_text):
        if not raw_text or not isinstance(raw_text, str):
            raise RuntimeError("AI generation service returned empty or invalid response for R-GORI evaluation.")

        cleaned = raw_text.strip()
        # Strip markdown code fences if present
        if "```" in cleaned:
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Extract first valid JSON object non-greedily using JSONDecoder.raw_decode
        decoder = json.JSONDecoder()
        data = None
        for idx, ch in enumerate(cleaned):
            if ch == "{":
                try:
                    candidate, _ = decoder.raw_decode(cleaned[idx:])
                    if isinstance(candidate, dict):
                        data = candidate
                        break
                except Exception:
                    continue

        try:
            if data is None:
                data = json.loads(cleaned)
            if not isinstance(data, dict):
                raise RuntimeError("Failed to parse R-GORI evaluation: expected a JSON object.")

            # Compute total_score deterministically from the 4 criterion scores when breakdown is present
            breakdown = data.get("breakdown")
            if isinstance(breakdown, dict) and all(
                k in breakdown for k in ["measurability", "functionality", "generality", "instructional_context"]
            ):
                measurability = max(0, min(25, int(breakdown.get("measurability", 0))))
                functionality = max(0, min(25, int(breakdown.get("functionality", 0))))
                generality = max(0, min(25, int(breakdown.get("generality", 0))))
                instructional_context = max(0, min(25, int(breakdown.get("instructional_context", 0))))
                clean_breakdown = {
                    "measurability": measurability,
                    "functionality": functionality,
                    "generality": generality,
                    "instructional_context": instructional_context,
                }
                total_score = max(0, min(100, sum(clean_breakdown.values())))
            elif "total_score" in data:
                total_score = max(0, min(100, int(data.get("total_score", 0))))
                quarter = round(total_score / 4)
                clean_breakdown = {
                    "measurability": quarter,
                    "functionality": quarter,
                    "generality": quarter,
                    "instructional_context": total_score - (quarter * 3),
                }
            else:
                raise RuntimeError("Failed to parse R-GORI evaluation: missing score metrics.")

            # Always compute compliance deterministically in Python; ignore LLM-supplied booleans
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
            if isinstance(e, RuntimeError):
                raise
            logger.warning("Error parsing R-GORI evaluation JSON: %s", e)
            raise RuntimeError(f"Failed to parse R-GORI evaluation from AI response: {e}")