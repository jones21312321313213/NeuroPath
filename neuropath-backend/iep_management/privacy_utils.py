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


def scrub_pii_from_text(text: str, pii_terms: Optional[Iterable[str]] = None, replacement: str = "The learner") -> str:
    """
    Scans free-text content (e.g., barriers, teacher prompt, notes) and replaces
    occurrences of specific student/guardian names with non-identifying tokens.
    """
    if not text:
        return ""
    
    scrubbed = str(text)
    if not pii_terms:
        return scrubbed

    # Sort terms by descending length to prevent partial prefix replacements
    sorted_terms = sorted([t.strip() for t in pii_terms if t and len(t.strip()) > 1], key=len, reverse=True)
    
    for term in sorted_terms:
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
