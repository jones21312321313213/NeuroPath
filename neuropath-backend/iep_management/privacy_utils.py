import re
from typing import Iterable, Optional

class ConsentRequiredException(Exception):
    """Raised when an action requiring RA 10173 minor consent is attempted without valid consent."""
    pass


def anonymize_student_context(student_instance) -> str:
    """
    Returns a generic educational descriptor for the student, strictly excluding
    real names, birthdates, and direct PII.
    """
    if not student_instance:
        return "Learner"
    grade = getattr(student_instance, 'grade', 0)
    
    descriptor_parts = ["Learner"]
    if grade and grade > 0:
        descriptor_parts.append(f"(Grade {grade})")
    elif grade == 0:
        descriptor_parts.append("(Kindergarten)")
    
    return " ".join(descriptor_parts)


PII_STOPWORDS = {
    "the", "and", "for", "with", "from", "into", "unto", "learner", "student",
    "parent", "guardian", "teacher", "school", "elementary", "high", "national",
    "central", "memorial", "integrated", "grade", "level", "none", "unknown",
}


def extract_student_pii_terms(student_instance, extra_terms: Optional[Iterable[str]] = None) -> list[str]:
    """
    Collects all student and guardian PII strings (full names, school names, LRNs,
    contact numbers, emails, addresses) from a StudentProfile instance and optional
    extra_terms for centralized word-boundary redaction.
    """
    terms = []
    if student_instance:
        for attr in ("name", "guardian_name"):
            val = getattr(student_instance, attr, "")
            if val and isinstance(val, str) and not val.startswith("gAAAAA") and not val.startswith("[Encrypted"):
                terms.append(val)
        details = getattr(student_instance, "profileDetails", None)
        if isinstance(details, dict):
            for key in (
                "studentName", "learnerName", "parentName", "guardianName",
                "fatherName", "motherName", "schoolName", "school",
                "lrn", "contactNumber", "phone", "email", "address",
                "birthDate", "dob", "dateOfBirth",
            ):
                d_val = details.get(key)
                if d_val and isinstance(d_val, str):
                    terms.append(d_val)
    if extra_terms:
        for t in extra_terms:
            if t and isinstance(t, str):
                terms.append(t)
    return terms


def scrub_pii_from_text(text: str, pii_terms: Optional[Iterable[str]] = None, replacement: str = "The learner") -> str:
    """
    Scans free-text content (e.g., barriers, teacher prompt, notes, logs) and redacts:
    1. Structured RA 10173 PII (12-digit DepEd LRNs, emails, phone numbers, dates).
    2. Full and word-boundary (\b) tokenized student/guardian/school names.
    """
    if not text:
        return ""

    scrubbed = str(text)

    # 1. Structured PII regexes (always enforced)
    scrubbed = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "[REDACTED_EMAIL]",
        scrubbed,
    )
    scrubbed = re.sub(r"\b\d{12}\b", "[REDACTED_LRN]", scrubbed)
    scrubbed = re.sub(
        r"\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})\b",
        "[REDACTED_DATE]",
        scrubbed,
    )
    scrubbed = re.sub(
        r"\b(?:\+?63[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{4}\b|\b\d{3}[-\s]\d{3}[-\s]\d{4}\b",
        "[REDACTED_PHONE]",
        scrubbed,
    )

    if not pii_terms:
        return scrubbed

    # 2. Expand full phrases and individual name tokens (>= 2 chars)
    candidates = set()
    for raw_term in pii_terms:
        if not raw_term:
            continue
        cleaned_term = str(raw_term).strip()
        if len(cleaned_term) > 1:
            candidates.add(cleaned_term)
        for token in re.findall(r"[A-Za-zÀ-ÿ]{2,}", cleaned_term):
            if token.lower() not in PII_STOPWORDS:
                candidates.add(token)

    sorted_terms = sorted(candidates, key=len, reverse=True)
    for term in sorted_terms:
        if re.match(r"^[A-Za-z0-9À-ÿ]+$", term):
            pattern = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)
        else:
            pattern = re.compile(re.escape(term), re.IGNORECASE)
        scrubbed = pattern.sub(replacement, scrubbed)

    return scrubbed


def verify_ra10173_consent(student_instance):
    """
    Validates that explicit parental/guardian consent has been recorded under
    Republic Act 10173 before external AI processing is initiated.
    """
    if not student_instance:
        raise ConsentRequiredException("Student record is missing.")
        
    consent_obtained = getattr(student_instance, 'parental_consent_obtained', False)
    if not consent_obtained:
        student_id = getattr(student_instance, 'pk', getattr(student_instance, 'studentID', 'Unknown'))
        raise ConsentRequiredException(
            f"RA 10173 Parental/Guardian Consent has not been recorded for student ID {student_id}. "
            "Automated AI processing and external data transmission are prohibited until consent is verified."
        )
    return True
