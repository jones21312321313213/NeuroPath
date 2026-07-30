from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from common_test_utils import create_teacher_with_login, create_student
from users.models import StudentProfile, Teacher
from .models import IEPModel, IEPGoal


class IEPManagementAuthAndTenantIsolationTests(TestCase):
    """IEP documents and goals must require authentication, and one teacher
    must never be able to read or modify another teacher's IEPs."""

    def setUp(self):
        self.client = APIClient()

        self.user1, self.teacher1, self.token1 = create_teacher_with_login('owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('other@example.com')

        self.student1 = create_student(self.teacher1, name='Owner Student')
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1, goalName='Goal 1', target_metric='Metric', annual_goal='Annual goal text',
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # ---- Unauthenticated access must be rejected ----

    def test_unauthenticated_iep_list_rejected(self):
        response = self.client.get(f'/api/iep/student/{self.student1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_iep_detail_rejected(self):
        response = self.client.get(f'/api/iep/{self.iep1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_iep_edit_rejected(self):
        response = self.client.patch(f'/api/iep/edit/{self.iep1.pk}/', {'goals': 'x'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_iep_delete_rejected(self):
        response = self.client.delete(f'/api/iep/delete/{self.iep1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_goals_list_rejected(self):
        response = self.client.get('/api/iep/goals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Cross-teacher access must be rejected ----

    def test_cross_teacher_iep_list_is_empty(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/iep/student/{self.student1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_cross_teacher_cannot_retrieve_iep(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/iep/{self.iep1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_edit_iep(self):
        self._auth(self.token2)
        response = self.client.patch(f'/api/iep/edit/{self.iep1.pk}/', {'goals': 'Hijacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.iep1.refresh_from_db()
        self.assertNotEqual(self.iep1.goals, 'Hijacked')

    def test_cross_teacher_cannot_delete_iep(self):
        self._auth(self.token2)
        response = self.client.delete(f'/api/iep/delete/{self.iep1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(IEPModel.objects.filter(pk=self.iep1.pk).exists())

    def test_cross_teacher_cannot_create_goal_on_foreign_iep(self):
        self._auth(self.token2)
        response = self.client.post('/api/iep/goals/', {
            'iep': self.iep1.pk,
            'goalName': 'Injected Goal',
            'target_metric': 'N/A',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_goals_list_excludes_foreign_goal(self):
        self._auth(self.token2)
        response = self.client.get('/api/iep/goals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['goalID'] for row in response.data]
        self.assertNotIn(self.goal1.pk, ids)

    # ---- Owning teacher retains access ----

    def test_owner_can_retrieve_own_iep(self):
        self._auth(self.token1)
        response = self.client.get(f'/api/iep/{self.iep1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


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
        # IEPDeleteAPIView scopes get_queryset() to the requesting teacher,
        # so a foreign pk simply isn't found rather than returning 403.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
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
