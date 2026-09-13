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
    occurrences of specific student/guardian names, LRNs, contact numbers, and emails
    with non-identifying tokens.
    """
    if not text:
        return ""
    
    scrubbed = str(text)

    # 1. Scrub LRNs, contact numbers, and emails
    scrubbed = PIIScrubberService.LRN_PATTERN.sub('[LRN_REDACTED]', scrubbed)
    scrubbed = PIIScrubberService.PHONE_PATTERN.sub('[CONTACT_REDACTED]', scrubbed)
    scrubbed = PIIScrubberService.EMAIL_PATTERN.sub('[EMAIL_REDACTED]', scrubbed)

    if not pii_terms:
        return scrubbed

    # Sort terms by descending length to prevent partial prefix replacements
    sorted_terms = sorted([t.strip() for t in pii_terms if t and len(t.strip()) > 1], key=len, reverse=True)
    
    for term in sorted_terms:
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        scrubbed = pattern.sub(replacement, scrubbed)
        
    return scrubbed


class PIIScrubberService:
    """
    RA 10173 Compliant De-identification Engine for Minor Learners with ASD.
    Replaces real-world identifiers with ephemeral, session-bound surrogate tokens
    and provides re-hydration utilities for authenticated teacher sessions.
    """
    LRN_PATTERN = re.compile(r'\b\d{12}\b')  # 12-digit DepEd Learner Reference Number
    PHONE_PATTERN = re.compile(r'(\+63|0)9\d{9}\b')
    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

    @classmethod
    def sanitize_plaafp(cls, text: str, student_profile: dict) -> tuple[str, dict[str, str]]:
        """
        Sanitizes raw PLAAFP text and student profile details, returning the
        de-identified text along with an ephemeral surrogate dictionary.
        """
        surrogate_map = {}
        if not text:
            return "", surrogate_map

        sanitized = str(text)

        # 1. Map Student Name & Aliases
        real_name = str(student_profile.get('full_name') or student_profile.get('name') or '').strip()
        first_name = str(student_profile.get('first_name') or '').strip()
        guardian_name = str(student_profile.get('guardian_name') or '').strip()

        if real_name and len(real_name) > 1:
            surrogate_map['[STUDENT_A]'] = real_name
            sanitized = re.sub(re.escape(real_name), '[STUDENT_A]', sanitized, flags=re.IGNORECASE)
        if first_name and len(first_name) > 1 and first_name.lower() not in ('the', 'a', 'student', 'learner'):
            if '[STUDENT_A]' not in surrogate_map:
                surrogate_map['[STUDENT_A]'] = first_name
            sanitized = re.sub(rf'\b{re.escape(first_name)}\b', '[STUDENT_A]', sanitized, flags=re.IGNORECASE)
        if guardian_name and len(guardian_name) > 1:
            surrogate_map['[GUARDIAN_A]'] = guardian_name
            sanitized = re.sub(re.escape(guardian_name), '[GUARDIAN_A]', sanitized, flags=re.IGNORECASE)

        # 2. Scrub DepEd LRNs
        sanitized = cls.LRN_PATTERN.sub('[LRN_REDACTED]', sanitized)

        # 3. Scrub Contact Details & Emails
        sanitized = cls.PHONE_PATTERN.sub('[CONTACT_REDACTED]', sanitized)
        sanitized = cls.EMAIL_PATTERN.sub('[EMAIL_REDACTED]', sanitized)

        # 4. Normalize Age / Birthdate to Developmental Brackets
        age = student_profile.get('age')
        if age is not None:
            try:
                age_int = int(age)
                bracket = '[ELEM_PRIMARY]' if age_int <= 9 else '[ELEM_INTERMEDIATE]'
                sanitized = re.sub(rf'\b{age_int}\s*(years old|yo|y/o|years)\b', bracket, sanitized, flags=re.IGNORECASE)
            except (ValueError, TypeError):
                pass

        return sanitized, surrogate_map

    @classmethod
    def rehydrate_text(cls, generated_text: str, surrogate_map: dict[str, str]) -> str:
        """
        Restores surrogate tokens to real identifiers in memory for authenticated response delivery.
        """
        if not generated_text or not surrogate_map:
            return generated_text or ""

        rehydrated = str(generated_text)
        for token, original_val in surrogate_map.items():
            if token and original_val:
                rehydrated = rehydrated.replace(token, original_val)
        return rehydrated


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
