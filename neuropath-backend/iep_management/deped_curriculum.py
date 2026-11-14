import re
from typing import Optional

CANONICAL_GOAL_AREAS: tuple[str, ...] = (
    "Mathematical Skills",
    "Functional Academic Skills",
    "Communication Skills",
    "Social / Interpersonal Skills",
    "Behavioral Skills",
)

GOAL_AREA_ALIASES: dict[str, str] = {
    "mathematical skills": "Mathematical Skills",
    "mathematics": "Mathematical Skills",
    "math": "Mathematical Skills",
    "functional academic skills": "Functional Academic Skills",
    "functional skills": "Functional Academic Skills",
    "literacy skills": "Functional Academic Skills",
    "reading and writing": "Functional Academic Skills",
    "reading": "Functional Academic Skills",
    "communication skills": "Communication Skills",
    "communication": "Communication Skills",
    "social / interpersonal skills": "Social / Interpersonal Skills",
    "social-emotional skills": "Social / Interpersonal Skills",
    "social skills": "Social / Interpersonal Skills",
    "behavioral skills": "Behavioral Skills",
    "care skills": "Behavioral Skills",
    "self-care skills": "Behavioral Skills",
    "daily living skills": "Behavioral Skills",
    "motor skills": "Behavioral Skills",
    "fine and gross motor skills": "Behavioral Skills",
    "sensory regulation": "Behavioral Skills",
}

DEPED_TRANSITION_CURRICULUM: dict[str, list[dict[str, str]]] = {
    "Mathematical Skills": [
        {
            "code": "TP_MFP-nv-NG-1",
            "competency": "Recognizing numbers from 0-10 and associating quantities with numerals",
            "package": "Functional Academics - Mathematics (Number Values)",
        },
        {
            "code": "TP_MFP-nv-NG-5",
            "competency": "Counting and grouping concrete objects up to 20 using tactile and visual counters",
            "package": "Functional Academics - Mathematics (Number Values)",
        },
        {
            "code": "TP_MFP-nv-NG-18",
            "competency": "Identifying and sorting Philippine coins and paper bills in practical tasks",
            "package": "Functional Academics - Mathematics (Money & Number Values)",
        },
        {
            "code": "TP_MFP-fo-NG-1",
            "competency": "Performing single-digit addition and combining sets using concrete manipulatives",
            "package": "Functional Academics - Mathematics (Fundamental Operations)",
        },
        {
            "code": "TP_MFP-fo-NG-8",
            "competency": "Solving simple subtraction situations using visual and tactile objects",
            "package": "Functional Academics - Mathematics (Fundamental Operations)",
        },
        {
            "code": "TP_MFP-fr-NG-1",
            "competency": "Identifying wholes and halves in everyday classroom objects and food items",
            "package": "Functional Academics - Mathematics (Fractions)",
        },
        {
            "code": "TP_MFP-ge-NG-1",
            "competency": "Identifying and sorting basic 2D shapes and sizes in the environment",
            "package": "Functional Academics - Mathematics (Geometry)",
        },
        {
            "code": "TP_MFP-sp-NG-1",
            "competency": "Completing and extending simple repeating sequences and visual patterns",
            "package": "Functional Academics - Mathematics (Sequences & Patterns)",
        },
        {
            "code": "TP_MFP-al-NG-1",
            "competency": "Finding missing elements in simple concrete number sentences",
            "package": "Functional Academics - Mathematics (Algebra)",
        },
        {
            "code": "TP_MFP-me-NG-2",
            "competency": "Comparing lengths, weights, and time intervals using daily schedules",
            "package": "Functional Academics - Mathematics (Mensuration)",
        },
        {
            "code": "TP_MFP-dp-NG-1.1",
            "competency": "Reading and organizing simple pictographs and classroom tally charts",
            "package": "Functional Academics - Mathematics (Data & Probability)",
        },
        {
            "code": "TPLS_FL-pm-NG-2",
            "competency": "Demonstrating practical money handling during simulated buying and selling",
            "package": "Life Skills - Functional Literacy (Practical Money)",
        },
    ],
    "Functional Academic Skills": [
        {
            "code": "TP_EFP-ak-NG-1",
            "competency": "Naming and matching uppercase and lowercase letters of the alphabet",
            "package": "Functional Academics - English (Alphabet Knowledge)",
        },
        {
            "code": "TP_EFP-pwr-NG-1",
            "competency": "Decoding and matching CVC words and common functional sight words",
            "package": "Functional Academics - English (Phonics & Word Recognition)",
        },
        {
            "code": "TP_EFP-v-NG-1",
            "competency": "Identifying familiar object labels, action words, and classroom vocabulary",
            "package": "Functional Academics - English (Vocabulary)",
        },
        {
            "code": "TP_EFP-bpk-NG-1",
            "competency": "Demonstrating book and print orientation from left to right and top to bottom",
            "package": "Functional Academics - English (Book & Print Knowledge)",
        },
        {
            "code": "TP_EFP-rc-NG-1",
            "competency": "Answering literal who, what, and where questions from picture stories",
            "package": "Functional Academics - English (Reading Comprehension)",
        },
        {
            "code": "TP_EFP-w-NG-1",
            "competency": "Tracing and copying functional words, personal name, and short labels",
            "package": "Functional Academics - English (Writing)",
        },
        {
            "code": "TPLS_CS-re-NG-1",
            "competency": "Reading and interpreting environmental print, safety signs, and symbols",
            "package": "Life Skills - Communication Skills (Functional Reading)",
        },
        {
            "code": "TPLS_CS-wr-NG-1",
            "competency": "Writing basic personal information on simplified functional forms",
            "package": "Life Skills - Communication Skills (Functional Writing)",
        },
        {
            "code": "TP_SFP-bp-NG-1",
            "competency": "Identifying main body parts and their basic functions using visual charts",
            "package": "Functional Academics - Science (Body Parts)",
        },
        {
            "code": "TP_SFP-po-NG-1",
            "competency": "Classifying physical objects by color, texture, shape, and size",
            "package": "Functional Academics - Science (Physical Objects)",
        },
        {
            "code": "TP_SFP-tw-NG-1",
            "competency": "Identifying daily weather conditions and appropriate clothing choices",
            "package": "Functional Academics - Science (The Weather)",
        },
    ],
    "Communication Skills": [
        {
            "code": "TPLS_CS-oc-NG-1",
            "competency": "Expressing basic personal needs and wants using verbal words, gestures, or AAC/PECS",
            "package": "Life Skills - Communication Skills (Oral Communication)",
        },
        {
            "code": "TPLS_CS-oc-NG-2",
            "competency": "Responding appropriately to greetings and familiar social questions",
            "package": "Life Skills - Communication Skills (Oral Communication)",
        },
        {
            "code": "TPLS_CS-li-NG-1",
            "competency": "Attending to speaker and responding to own name and basic auditory cues",
            "package": "Life Skills - Communication Skills (Listening)",
        },
        {
            "code": "TPLS_CS-li-NG-4",
            "competency": "Listening attentively and following 1-to-2 step routine instructions",
            "package": "Life Skills - Communication Skills (Listening)",
        },
        {
            "code": "TP_EFP-ol-NG-1",
            "competency": "Using polite expressions and functional phrases during classroom routines",
            "package": "Functional Academics - English (Oral Language)",
        },
        {
            "code": "TP_EFP-apd-NG-1",
            "competency": "Discriminating common environmental and speech sounds accurately",
            "package": "Functional Academics - English (Auditory Perception)",
        },
        {
            "code": "TP_EFP-pa-NG-6",
            "competency": "Producing initial letter sounds and blending simple spoken syllables",
            "package": "Functional Academics - English (Phonological Awareness)",
        },
        {
            "code": "TP_EFP-l-NG-3",
            "competency": "Identifying key details from short spoken instructions or stories",
            "package": "Functional Academics - English (Listening Comprehension)",
        },
        {
            "code": "TP_EFP-olf-NG-1",
            "competency": "Initiating and sustaining short functional exchanges with teacher and peers",
            "package": "Functional Academics - English (Oral Language Fluency)",
        },
    ],
    "Social / Interpersonal Skills": [
        {
            "code": "TPLS_CS-oc-NG-3",
            "competency": "Practicing turn-taking and waiting for one's turn during structured group interactions",
            "package": "Life Skills - Communication Skills (Social Nuances)",
        },
        {
            "code": "TPLS_CS-oc-NG-5",
            "competency": "Recognizing and respecting personal space and appropriate social boundaries",
            "package": "Life Skills - Communication Skills (Social Nuances)",
        },
        {
            "code": "TPLS_LE-lr-NG-1",
            "competency": "Participating cooperatively in structured leisure games and peer play",
            "package": "Life Skills - Leisure & Recreation",
        },
        {
            "code": "TPLS_PS-si-NG-2",
            "competency": "Identifying and expressing own basic emotions using visual emotion cards",
            "package": "Life Skills - Personal & Social (Self-Identity)",
        },
        {
            "code": "TPLS_PS-se-NG-1",
            "competency": "Demonstrating confidence and positive self-concept when completing group tasks",
            "package": "Life Skills - Personal & Social (Self-Esteem)",
        },
        {
            "code": "TPLS_PS-is-NG-4",
            "competency": "Sharing classroom materials and offering help to peers during activities",
            "package": "Life Skills - Personal & Social (Interpersonal Skills)",
        },
        {
            "code": "TPLS_HS-hu-NG-1",
            "competency": "Building positive peer relationships and cooperative classroom behavior",
            "package": "Life Skills - Human Sexuality & Relationships",
        },
        {
            "code": "TPLS_CM-cm-NG-7",
            "competency": "Observing classroom and school community rules during group transitions",
            "package": "Life Skills - Community Orientation",
        },
        {
            "code": "TPEP-mu-NG-5",
            "competency": "Participating in cooperative group music, rhythm, and movement routines",
            "package": "Enrichment Package - Music & Movement",
        },
        {
            "code": "TPEP-dc-NG-6",
            "competency": "Following synchronized group movement and expressive activities with peers",
            "package": "Enrichment Package - Dance & Movement",
        },
    ],
    "Behavioral Skills": [
        {
            "code": "TPCS_PH-ct-NG-3",
            "competency": "Performing independent handwashing and personal cleanliness routines",
            "package": "Care Skills - Personal Hygiene",
        },
        {
            "code": "TPCS_PH-to-NG-3",
            "competency": "Following structured toileting and self-care sequences with visual schedules",
            "package": "Care Skills - Personal Hygiene (Toileting)",
        },
        {
            "code": "TPCS_GG-gp-NG-3",
            "competency": "Demonstrating proper grooming and dressing routines in daily activities",
            "package": "Care Skills - Good Grooming",
        },
        {
            "code": "TPCS_NU-gh-NG-2",
            "competency": "Practicing appropriate mealtime behavior and independent utensil use",
            "package": "Care Skills - Nutrition & Mealtime Habits",
        },
        {
            "code": "TPCS_HC-hh-NG-3",
            "competency": "Putting away learning materials and keeping the classroom workspace orderly",
            "package": "Care Skills - Housekeeping & Orderliness",
        },
        {
            "code": "TPCS_PS-sp-NG-3",
            "competency": "Following classroom safety rules and staying within designated learning areas",
            "package": "Care Skills - Personal Safety",
        },
        {
            "code": "TPLS_CS-li-NG-4",
            "competency": "Complying with 1-to-2 step teacher directions and visual transition cues",
            "package": "Life Skills - Task Compliance & Listening",
        },
        {
            "code": "TPLS_HP-ps-NG-3",
            "competency": "Practicing self-regulation strategies and sensory breaks when frustrated",
            "package": "Life Skills - Health & Personal Safety",
        },
        {
            "code": "TPLS_MD-md-NG-1",
            "competency": "Demonstrating honesty, respect, and calm classroom conduct during tasks",
            "package": "Life Skills - Moral Development",
        },
        {
            "code": "TP_SFP-fd-NG-1",
            "competency": "Following sequential daily classroom schedules and routine transitions",
            "package": "Functional Academics - Science (Following Directions)",
        },
    ],
}

ALL_VALID_DEPED_CODES: dict[str, dict[str, str]] = {
    entry["code"].upper(): entry
    for entries in DEPED_TRANSITION_CURRICULUM.values()
    for entry in entries
}

CODE_PATTERN = re.compile(
    r"\(\s*(TP(?:CS|LS|EP|_EFP|_MFP|_SFP)[A-Za-z0-9_.-]+-NG-[0-9.]+)\s*\)",
    re.IGNORECASE,
)
ANY_PAREN_TP_PATTERN = re.compile(r"\(\s*TP[A-Za-z0-9_.-]*\s*\)", re.IGNORECASE)


def resolve_canonical_goal_area(goal_area: str) -> str:
    cleaned = (goal_area or "").strip().lower()
    return GOAL_AREA_ALIASES.get(cleaned, "Functional Academic Skills")


def get_default_competencies_for_area(goal_area: str, count: int = 3) -> list[dict[str, str]]:
    canonical = resolve_canonical_goal_area(goal_area)
    catalog = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    return list(catalog[: max(1, count)])


def get_curriculum_prompt_block(goal_area: str) -> str:
    """
    Returns the authoritative DepEd Order No. 021, s. 2020 K-12 Transition Curriculum
    block for injection into system_prompt. Deliberately excludes the raw goal_area
    string so client-supplied goal_area labels are never interpolated into system_prompt.
    """
    canonical = resolve_canonical_goal_area(goal_area)
    entries = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    lines = [
        "Official DepEd Order No. 021, s. 2020 K to 12 Transition Curriculum Competencies & SPED Codes "
        "(Harvest 2-3 developmentally sequential competencies from this official list and format each "
        "enroute_objectives value as '<Contextualized Competency>\\n(<Official DepEd Code>)'):"
    ]
    for item in entries:
        lines.append(f"- {item['competency']} ({item['code']})")
    return "\n".join(lines)


def extract_deped_code(text: str) -> Optional[str]:
    if not text:
        return None
    for match in CODE_PATTERN.finditer(str(text)):
        candidate = match.group(1).strip()
        canonical_entry = ALL_VALID_DEPED_CODES.get(candidate.upper())
        if canonical_entry:
            return canonical_entry["code"]
    return None


def _select_best_matching_entry(
    clean_statement: str, catalog: list[dict[str, str]], row_index: int = 0
) -> dict[str, str]:
    tokens = {
        tok
        for tok in re.findall(r"[a-z0-9]+", clean_statement.lower())
        if len(tok) > 2 and tok not in {"the", "and", "for", "with", "will", "learner", "student"}
    }
    best_entry = None
    best_score = 0
    for entry in catalog:
        comp_tokens = set(re.findall(r"[a-z0-9]+", entry["competency"].lower()))
        overlap = len(tokens & comp_tokens)
        if overlap > best_score:
            best_score = overlap
            best_entry = entry
    if best_entry is not None and best_score > 0:
        return best_entry
    return catalog[row_index % len(catalog)]


def ensure_valid_deped_enroute_objective(
    enroute_text: str, goal_area: str, row_index: int = 0
) -> str:
    """
    Validates that enroute_text ends with a newline + parenthesized official DepEd Order
    No. 021, s. 2020 SPED code from the catalog. Strips hallucinated/invalid (TP_...) codes
    and deterministically attaches an official code when missing or malformed.
    """
    canonical = resolve_canonical_goal_area(goal_area)
    catalog = DEPED_TRANSITION_CURRICULUM.get(
        canonical, DEPED_TRANSITION_CURRICULUM["Functional Academic Skills"]
    )
    raw = str(enroute_text or "").strip()
    valid_code = extract_deped_code(raw)

    # Strip any trailing/inline parenthesized TP codes to normalize cleanly
    statement = CODE_PATTERN.sub("", raw)
    statement = ANY_PAREN_TP_PATTERN.sub("", statement)
    statement = re.sub(r"\s+", " ", statement).strip(" \t\r\n-–—")

    if not valid_code:
        matched_entry = _select_best_matching_entry(statement, catalog, row_index=row_index)
        valid_code = matched_entry["code"]
        if not statement:
            statement = matched_entry["competency"]
    elif not statement:
        statement = ALL_VALID_DEPED_CODES[valid_code.upper()]["competency"]

    return f"{statement}\n({valid_code})"
