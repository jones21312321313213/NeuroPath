from .models import Teacher


def get_teacher_for_user(user):
    """Resolve the custom Teacher record that mirrors a logged-in Django auth User.

    Teacher and User are linked only by matching email (no FK), so any view
    that needs to scope data to "the requesting teacher" must resolve through
    here rather than trusting a client-supplied teacher/user id. Returns None
    if the user is unauthenticated or has no matching Teacher record.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    try:
        return Teacher.objects.get(email__iexact=user.email)
    except Teacher.DoesNotExist:
        return None
