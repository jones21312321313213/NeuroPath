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

    INDICATOR_SPECS = {
        "observable_verb": {"max_score": 10, "dimension": "measurability"},
        "baseline_calibrated_criterion": {"max_score": 10, "dimension": "measurability"},
        "evaluation_schedule_timeline": {"max_score": 10, "dimension": "measurability"},
        "stimulus_prompt_condition": {"max_score": 15, "dimension": "instructional_context"},
        "naturalistic_routine_context": {"max_score": 10, "dimension": "instructional_context"},
        "plaafp_baseline_traceability": {"max_score": 15, "dimension": "functionality"},
        "functional_daily_academic_utility": {"max_score": 10, "dimension": "functionality"},
        "cross_setting_material_person": {"max_score": 10, "dimension": "generality"},
        "maintenance_generality_criterion": {"max_score": 5, "dimension": "generality"},
        "sequential_milestone_alignment": {"max_score": 5, "dimension": "generality"},
    }

    RGORI_EVALUATION_SCHEMA = {
        "type": "object",
        "properties": {
            "indicators": {
                "type": "object",
                "properties": {k: {"type": "integer"} for k in INDICATOR_SPECS},
                "required": list(INDICATOR_SPECS.keys()),
            },
            "feedback": {"type": "string"},
        },
        "required": ["indicators", "feedback"],
    }

    _BOILERPLATE_RE = re.compile(
        r"\b(?:80%\s*accuracy|4\s*(?:out\s*of|of|/)\s*5\s*(?:trials|opportunities))\b",
        re.IGNORECASE,
    )

    @classmethod
    def _verb_variants(cls, verbs):
        variants = set(verbs)
        for v in verbs:
            if v.endswith("ies") and len(v) > 3:
                variants.add(v[:-3] + "y")
            elif v.endswith("es") and len(v) > 2:
                variants.add(v[:-2])
                variants.add(v[:-1])
            elif v.endswith("s") and len(v) > 1:
                variants.add(v[:-1])
        return variants

    @classmethod
    def _apply_boilerplate_cap(cls, goal_text, indicators, raw_total):
        """
        Deterministically cap syntax-only boilerplate goals at <= 80% (IEP Ready)
        when they lack explicit cross-setting generality or naturalistic routine context.
        """
        if not goal_text:
            return raw_total, False
        has_boilerplate = bool(cls._BOILERPLATE_RE.search(goal_text))
        cross_setting = indicators.get("cross_setting_material_person", {}).get("score", 0)
        naturalistic = indicators.get("naturalistic_routine_context", {}).get("score", 0)
        if has_boilerplate and (cross_setting == 0 or naturalistic < 6):
            return min(raw_total, 80), True
        return raw_total, False

    @staticmethod
    def _compute_tier_status(total_score):
        if total_score >= 85:
            return "Exemplary"
        if total_score >= 65:
            return "IEP Ready"
        return "Review Advised"

    @classmethod
    def audit_goal_explainable(cls, goal_text, student_context=""):
        """
        Deterministically evaluates an annual goal against the decomposed 10-indicator
        R-GORI rubric (100 pts total) and normalizes the 4 canonical dimensions to /25
        for backward-compatible UI rendering without blocking AI network calls.
        """
        text = (goal_text or "").strip()
        lower_text = text.lower()
        ctx_lower = (student_context or "").lower()

        # -------------------------------------------------------------
        # 1. MEASURABILITY & OBSERVABILITY (30 pts total)
        # -------------------------------------------------------------
        non_obs_set = cls._verb_variants(cls.NON_OBSERVABLE_VERBS)
        obs_set = cls._verb_variants(cls.APPROVED_VERBS)
        non_obs_matches = [v for v in non_obs_set if re.search(r"\b" + re.escape(v) + r"\b", lower_text)]
        obs_matches = [v for v in obs_set if re.search(r"\b" + re.escape(v) + r"\b", lower_text)]

        if non_obs_matches and not obs_matches:
            ind_obs = 0
            obs_exp = f"Employs non-observable internal verb ('{non_obs_matches[0]}') lacking definite behavioral criteria."
        elif non_obs_matches and obs_matches:
            ind_obs = 5
            obs_exp = f"Includes observable actions ('{obs_matches[0]}') alongside non-observable phrases ('{non_obs_matches[0]}')."
        elif obs_matches:
            ind_obs = 10
            obs_exp = f"Employs clear observable action verb ('{obs_matches[0]}') with verifiable execution boundaries."
        else:
            ind_obs = 5
            obs_exp = "Behavioral action is implied but would benefit from a more concrete observable action verb."

        criterion_hits = 0
        if re.search(r"\b(independently|correctly|without prompts|with 0 prompts|unassisted)\b", lower_text):
            criterion_hits += 1
        if re.search(r"\b\d+%\b", lower_text) or "accuracy" in lower_text:
            criterion_hits += 1
        if re.search(r"\b\d+\s*(?:out of|of|/)\s*\d+\b", lower_text) or "opportunities" in lower_text or "trials" in lower_text:
            criterion_hits += 1
        if re.search(r"\bfor\s+\d+\s+(?:minutes|mins|seconds|secs)\b", lower_text):
            criterion_hits += 1

        if criterion_hits >= 2:
            ind_crit = 10
            crit_exp = "Specifies quantifiable accuracy, independence, or frequency mastery criteria."
        elif criterion_hits == 1:
            ind_crit = 6
            crit_exp = "Provides a single performance criterion; calibrate mastery level to PLAAFP baseline."
        else:
            ind_crit = 0
            crit_exp = "Missing quantifiable thresholds, percentage criteria, or trial frequencies."

        has_schedule = bool(
            re.search(r"\b(?:across|over)\s+\d+\s+consecutive\b", lower_text)
            or re.search(r"\b\d+\s+(?:consecutive\s+)?(?:weeks|sessions|days|months)\b", lower_text)
        )
        if has_schedule:
            ind_sched = 10
            sched_exp = "Includes explicit multi-session/week evaluation window and endurance schedule."
        elif re.search(r"\b(weeks|sessions|days|quarter|monthly)\b", lower_text):
            ind_sched = 5
            sched_exp = "Mentions a general timeframe, but lacks consecutive endurance criteria."
        else:
            ind_sched = 0
            sched_exp = "Missing explicit evaluation schedule or consecutive endurance period."

        meas_30 = ind_obs + ind_crit + ind_sched
        measurability_score = max(0, min(25, round(meas_30 * 25 / 30)))
        measurability_explanation = f"{obs_exp} {crit_exp} {sched_exp}"

        # -------------------------------------------------------------
        # 2. INSTRUCTIONAL CONTEXT (25 pts total)
        # -------------------------------------------------------------
        has_condition = bool(
            re.search(r"\b(given|using|with|when provided|when presented|during)\b", lower_text)
            and re.search(r"\b(visual|prompt|prompts|cue|cues|schedule|model|models|support|manipulative|aac|pecs|timer|checklist|card|cards)\b", lower_text)
        )
        if has_condition:
            ind_stim = 15
            stim_exp = "Explicitly defines environmental antecedent, instructional prompt, or assistive support."
        elif re.search(r"\b(given|using|with|during)\b", lower_text):
            ind_stim = 8
            stim_exp = "States a general condition, but could specify concrete prompts or assistive supports."
        else:
            ind_stim = 0
            stim_exp = "Missing explicit antecedent stimulus or prompt-level condition ('Given...')."

        jargon_matches = [j for j in cls.CLINICAL_JARGON if j in lower_text]
        has_routine = bool(
            re.search(r"\b(circle|station|stations|snack|lunch|recess|transition|arrival|dismissal|morning|small-group|classroom\s+routine|daily\s+routine|class\s+activity|activities)\b", lower_text)
        )
        if has_routine and not jargon_matches:
            ind_nat = 10
            nat_exp = "Embedded in naturalistic everyday classroom routines using jargon-free team language."
        elif not jargon_matches and re.search(r"\b(classroom|school|home|routine|daily)\b", lower_text):
            ind_nat = 5
            nat_exp = "Jargon-free language, though specific naturalistic classroom routines could be named."
        elif jargon_matches:
            ind_nat = 3
            nat_exp = f"Contains clinical jargon ('{jargon_matches[0]}') that may confuse aides or parents."
        else:
            ind_nat = 0
            nat_exp = "Lacks everyday naturalistic classroom routine context."

        inst_score = max(0, min(25, ind_stim + ind_nat))
        inst_exp = f"{stim_exp} {nat_exp}"

        # -------------------------------------------------------------
        # 3. FUNCTIONALITY & PLAAFP ALIGNMENT (25 pts total)
        # -------------------------------------------------------------
        ctx_tokens = {
            tok for tok in re.findall(r"[a-z]{4,}", ctx_lower)
            if tok not in {"student", "learner", "difficulties", "barriers", "accommodations", "with", "from", "that", "this", "needs"}
        }
        goal_tokens = set(re.findall(r"[a-z]{4,}", lower_text))
        overlap = ctx_tokens.intersection(goal_tokens)
        if len(overlap) >= 2 or (not ctx_tokens and re.search(r"\b(classroom|routine|daily|school|communication|direction|directions|reading|math|social)\b", lower_text)):
            ind_plaafp = 15
            plaafp_exp = "Directly traceable to learner PLAAFP baseline needs, barriers, and accommodations."
        elif len(overlap) == 1 or re.search(r"\b(support|accommodation|visual|prompt|direction|skill)\b", lower_text):
            ind_plaafp = 9
            plaafp_exp = "Partially aligned with learner profile; strengthen explicit PLAAFP barrier traceability."
        else:
            ind_plaafp = 4
            plaafp_exp = "Weak lexical traceability to the learner's PLAAFP baseline and accommodations."

        if re.search(r"\b(communicate|request|interact|peer|independently|self-care|participate|respond|follow|transition|initiate|functional)\b", lower_text):
            ind_func = 10
            func_exp = "Supports meaningful daily school participation and learner autonomy."
        else:
            ind_func = 5
            func_exp = "Appears drill-focused; clarify daily classroom participation utility."

        func_score = max(0, min(25, ind_plaafp + ind_func))
        full_func_exp = f"{plaafp_exp} {func_exp}"

        # -------------------------------------------------------------
        # 4. GENERALITY & PROGRESSION (20 pts total)
        # -------------------------------------------------------------
        has_cross_setting = bool(
            re.search(r"\b(across|various|multiple|different)\b.{0,45}\b(settings|routines|environments|materials|partners|peers|adults|teachers|contexts)\b", lower_text)
            or re.search(r"\b(at least\s+2|two\s+or\s+more|2\s+classroom|2\s+communicative)\b", lower_text)
        )
        if has_cross_setting:
            ind_cross = 10
            cross_exp = "Explicitly requires generalization across multiple settings, materials, or partners."
        elif re.search(r"\b(across|various|different|peers|teachers|settings)\b", lower_text):
            ind_cross = 5
            cross_exp = "Implies some transfer, but should specify >= 2 settings, materials, or partners."
        else:
            ind_cross = 0
            cross_exp = "No cross-setting, cross-material, or cross-partner generalization specified."

        not_rote_drill = not re.search(r"\b(cut with scissors|rote counts to ten|stacks three cubes)\b", lower_text)
        ind_maint = 5 if (not_rote_drill and (has_cross_setting or has_schedule)) else (3 if not_rote_drill else 0)
        maint_exp = "Targets a durable, generalizable behavioral class." if ind_maint == 5 else "Ensure skill durability beyond isolated rote practice."

        has_bracket = bool(re.search(r"\b\d+(?:[-–]\d+)?\b", lower_text))
        ind_seq = 5 if has_bracket else 2
        seq_exp = "Defines a measurable skill bracket suitable for Month 1–3 progression." if ind_seq == 5 else "Add concrete skill brackets to scaffold Month 1–3 milestones."

        gen_20 = ind_cross + ind_maint + ind_seq
        gen_score = max(0, min(25, round(gen_20 * 25 / 20)))
        gen_exp = f"{cross_exp} {maint_exp} {seq_exp}"

        indicators = {
            "observable_verb": {"score": ind_obs, "max_score": 10, "rationale": obs_exp},
            "baseline_calibrated_criterion": {"score": ind_crit, "max_score": 10, "rationale": crit_exp},
            "evaluation_schedule_timeline": {"score": ind_sched, "max_score": 10, "rationale": sched_exp},
            "stimulus_prompt_condition": {"score": ind_stim, "max_score": 15, "rationale": stim_exp},
            "naturalistic_routine_context": {"score": ind_nat, "max_score": 10, "rationale": nat_exp},
            "plaafp_baseline_traceability": {"score": ind_plaafp, "max_score": 15, "rationale": plaafp_exp},
            "functional_daily_academic_utility": {"score": ind_func, "max_score": 10, "rationale": func_exp},
            "cross_setting_material_person": {"score": ind_cross, "max_score": 10, "rationale": cross_exp},
            "maintenance_generality_criterion": {"score": ind_maint, "max_score": 5, "rationale": maint_exp},
            "sequential_milestone_alignment": {"score": ind_seq, "max_score": 5, "rationale": seq_exp},
        }

        raw_total = sum(item["score"] for item in indicators.values())
        total_score, boilerplate_capped = cls._apply_boilerplate_cap(text, indicators, raw_total)
        status = cls._compute_tier_status(total_score)

        if status == "Exemplary":
            feedback = "Exemplary SMART ABCD alignment across all 10 decomposed R-GORI indicators."
        elif status == "IEP Ready":
            feedback = (
                "Meets R-GORI compliance standards (capped at <= 80%: add cross-setting generality and naturalistic routine context for Exemplary)."
                if boilerplate_capped
                else "Meets R-GORI compliance standards; ready for IEP committee review."
            )
        else:
            feedback = "Review advised: Strengthen observable action verbs, measurable criteria, and naturalistic context before finalizing."

        return {
            "total_score": total_score,
            "status": status,
            "compliant": total_score >= 65,
            "boilerplate_capped": boilerplate_capped,
            "feedback": feedback,
            "indicators": indicators,
            "breakdown": {
                "measurability": {
                    "score": measurability_score,
                    "explanation": measurability_explanation,
                },
                "functionality": {
                    "score": func_score,
                    "explanation": full_func_exp,
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

        # Extract JSON object substring
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

        try:
            data = json.loads(cleaned)
            if not isinstance(data, dict):
                raise RuntimeError("Failed to parse R-GORI evaluation: expected a JSON object.")

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
            if isinstance(e, RuntimeError):
                raise
            logger.warning("Error parsing R-GORI evaluation JSON: %s", e)
            raise RuntimeError(f"Failed to parse R-GORI evaluation from AI response: {e}")