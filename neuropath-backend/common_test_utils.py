"""Shared fixtures for cross-app auth/tenant-isolation regression tests.

Not named test*.py on purpose so Django's test discovery does not try to
collect it as a test module.
"""
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from users.models import Teacher, StudentProfile


def create_teacher_with_login(email, name=None, password='TestPass123!'):
    """Create a Django auth User + matching Teacher row + auth Token.

    Mirrors the real registration flow (TeacherCreateController), where the
    Teacher row is linked to the auth User only by matching email — never by
    foreign key.
    """
    name = name or email.split('@')[0]
    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name=name, last_name='',
    )
    teacher = Teacher.objects.create(email=email, name=name, passwordHash='not-used-in-tests')
    token = Token.objects.create(user=user)
    return user, teacher, token


def create_student(teacher, name='Test Student', **kwargs):
    defaults = dict(name=name, age=8, grade=2, gender='F')
    defaults.update(kwargs)
    return StudentProfile.objects.create(teacher=teacher, **defaults)


def auth_headers(token):
    return {'HTTP_AUTHORIZATION': f'Token {token.key}'}
