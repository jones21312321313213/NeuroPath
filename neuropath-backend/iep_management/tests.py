from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from users.models import StudentProfile, Teacher
from .models import IEPModel


def make_teacher(email, password, first_name='Teach', last_name='Er'):
    """Create a Django auth User + matching Teacher mirror row, like registration does."""
    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name=first_name, last_name=last_name,
    )
    teacher = Teacher.objects.create(
        email=email, name=f'{first_name} {last_name}', passwordHash='not-used',
    )
    token = Token.objects.create(user=user)
    return user, teacher, token


class IEPOwnershipTests(APITestCase):
    def setUp(self):
        self.user_a, self.teacher_a, self.token_a = make_teacher(
            'teacher.a@example.com', 'password123', 'Alice', 'Anderson'
        )
        self.user_b, self.teacher_b, self.token_b = make_teacher(
            'teacher.b@example.com', 'password123', 'Bob', 'Brown'
        )
        self.student_a = StudentProfile.objects.create(
            teacher=self.teacher_a, name='Alpha Student', age=8, grade=2,
            assessmentResult='Detailed baseline assessment notes.',
        )
        self.iep_a = IEPModel.objects.create(
            studentID=self.student_a, baselineData='baseline', goals='goals', version=1,
        )

    def auth_as(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # --- IEPDeleteAPIView ---

    def test_non_owner_cannot_delete_iep(self):
        self.auth_as(self.token_b)
        response = self.client.delete(reverse('delete_iep', args=[self.iep_a.iepID]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(IEPModel.objects.filter(pk=self.iep_a.iepID).exists())

    def test_owner_can_delete_iep(self):
        self.auth_as(self.token_a)
        response = self.client.delete(reverse('delete_iep', args=[self.iep_a.iepID]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(IEPModel.objects.filter(pk=self.iep_a.iepID).exists())

    def test_delete_iep_requires_authentication(self):
        response = self.client.delete(reverse('delete_iep', args=[self.iep_a.iepID]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- IEPGenerationAPIView (generate) ---

    def test_generate_requires_authentication(self):
        """Unauthenticated caller must not be able to impersonate a teacher via teacherID."""
        response = self.client.post(reverse('generate_save_iep'), {
            'action': 'generate',
            'studentID': self.student_a.studentID,
            'baselineData': 'notes',
            'domains': 'communication',
            'teacherID': self.user_a.id,  # spoofed identity attempt
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_owner_cannot_generate_for_another_teachers_student(self):
        self.auth_as(self.token_b)
        response = self.client.post(reverse('generate_save_iep'), {
            'action': 'generate',
            'studentID': self.student_a.studentID,
            'baselineData': 'notes',
            'domains': 'communication',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_generate_for_own_student(self):
        self.auth_as(self.token_a)
        response = self.client.post(reverse('generate_save_iep'), {
            'action': 'generate',
            'studentID': self.student_a.studentID,
            'baselineData': 'notes',
            'domains': 'communication',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- IEPGenerationAPIView (save) ---

    def test_non_owner_cannot_save_iep_for_another_teachers_student(self):
        self.auth_as(self.token_b)
        response = self.client.post(reverse('generate_save_iep'), {
            'action': 'save',
            'studentID': self.student_a.studentID,
            'baselineData': 'notes',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(IEPModel.objects.filter(studentID=self.student_a).count(), 1)

    def test_owner_can_save_iep_for_own_student(self):
        self.auth_as(self.token_a)
        response = self.client.post(reverse('generate_save_iep'), {
            'action': 'save',
            'studentID': self.student_a.studentID,
            'baselineData': 'notes',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
