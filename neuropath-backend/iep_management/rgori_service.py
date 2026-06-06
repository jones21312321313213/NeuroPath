import json
from .huggingface_service import CustomLlamaService


class RGORICheckerService:
    @staticmethod
    def evaluate_goal(goal_text, student_context):

        eval_prompt = f"""☁️system☁️
Act as an elite Special Education Auditor trained in the Revised IFSP/IEP Goals and Objectives
Rating Instrument (R-GORI). Your job is to score a single IEP annual goal against the 4 R-GORI
criteria. Each criterion is worth 25 points (total = 100). Output ONLY valid JSON — no markdown,
no explanation outside the JSON object.
☁️/system☁️

☁️user☁️
STUDENT CONTEXT:
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
}}
☁️/user☁️"""

        raw_evaluation = CustomLlamaService.generate_text(eval_prompt, max_new_tokens=200)

        try:
            return json.loads(raw_evaluation.strip())
        except json.JSONDecodeError:
            # Failsafe if the AI hallucinates
            return {
                "total_score": 0,
                "breakdown": {
                    "measurability":         0,
                    "functionality":         0,
                    "generality":            0,
                    "instructional_context": 0,
                },
                "feedback":  "R-GORIsk validation failed — could not parse AI response.",
                "compliant": False,
            }