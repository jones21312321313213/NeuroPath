from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import StudentProfile, Teacher


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


class TeacherProfileUpdateOwnershipTests(APITestCase):
    def setUp(self):
        self.user_a, self.teacher_a, self.token_a = make_teacher(
            'teacher.a@example.com', 'password123', 'Alice', 'Anderson'
        )
        self.user_b, self.teacher_b, self.token_b = make_teacher(
            'teacher.b@example.com', 'password123', 'Bob', 'Brown'
        )
        self.url = reverse('teacher-profile-update')

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.patch(self.url, {'id': self.user_b.id, 'first_name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_client_supplied_id_cannot_target_another_teacher(self):
        """Teacher A authenticates but sends Teacher B's id — only A's own account may change."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        response = self.client.patch(self.url, {
            'id': self.user_b.id,
            'first_name': 'Hacked',
            'last_name': 'Name',
            'email': self.user_a.email,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The response reflects the authenticated caller (A), not the spoofed id (B).
        self.assertEqual(response.data['id'], self.user_a.id)

        self.user_a.refresh_from_db()
        self.user_b.refresh_from_db()
        self.assertEqual(self.user_a.first_name, 'Hacked')
        # Teacher B's account must be completely untouched.
        self.assertEqual(self.user_b.first_name, 'Bob')

    def test_teacher_can_update_own_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        response = self.client.patch(self.url, {
            'first_name': 'Alicia',
            'last_name': self.user_a.last_name,
            'email': self.user_a.email,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertEqual(self.user_a.first_name, 'Alicia')


class StudentProfileOwnershipTests(APITestCase):
    def setUp(self):
        self.user_a, self.teacher_a, self.token_a = make_teacher(
            'teacher.a@example.com', 'password123', 'Alice', 'Anderson'
        )
        self.user_b, self.teacher_b, self.token_b = make_teacher(
            'teacher.b@example.com', 'password123', 'Bob', 'Brown'
        )
        self.student_a = StudentProfile.objects.create(
            teacher=self.teacher_a, name='Alpha Student', age=8, grade=2,
        )

    def auth_as(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_list_students_unauthenticated_rejected(self):
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_teacher_cannot_list_another_teachers_students(self):
        self.auth_as(self.token_b)
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertNotIn(self.student_a.studentID, ids)

    def test_owner_can_list_own_students(self):
        self.auth_as(self.token_a)
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertIn(self.student_a.studentID, ids)

    def test_create_ignores_client_supplied_teacher(self):
        """Teacher B tries to create a student under Teacher A's account by spoofing `teacher`."""
        self.auth_as(self.token_b)
        response = self.client.post(reverse('student-create-list'), {
            'name': 'Spoofed Student',
            'teacher': self.teacher_a.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = StudentProfile.objects.get(pk=response.data['data']['studentID'])
        self.assertEqual(created.teacher_id, self.teacher_b.pk)

    def test_non_owner_cannot_view_student_by_pk(self):
        self.auth_as(self.token_b)
        response = self.client.get(reverse('student-view', args=[self.student_a.studentID]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_view_student_by_pk(self):
        self.auth_as(self.token_a)
        response = self.client.get(reverse('student-view', args=[self.student_a.studentID]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_cannot_update_student_by_pk(self):
        self.auth_as(self.token_b)
        response = self.client.patch(
            reverse('student-detail-update', args=[self.student_a.studentID]),
            {'name': 'Hacked Name'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.student_a.refresh_from_db()
        self.assertEqual(self.student_a.name, 'Alpha Student')

    def test_owner_can_update_student_by_pk(self):
        self.auth_as(self.token_a)
        response = self.client.patch(
            reverse('student-detail-update', args=[self.student_a.studentID]),
            {'name': 'Updated Name'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_a.refresh_from_db()
        self.assertEqual(self.student_a.name, 'Updated Name')
