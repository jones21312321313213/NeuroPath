from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common_test_utils import create_teacher_with_login, create_student
from .models import StudentProfile


class UsersAuthAndTenantIsolationTests(TestCase):
    """Student rosters and teacher accounts must require authentication, and
    one teacher must never be able to read or modify another teacher's
    students or account."""

    def setUp(self):
        self.client = APIClient()

        self.user1, self.teacher1, self.token1 = create_teacher_with_login('owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('other@example.com')

        self.student1 = create_student(self.teacher1, name='Owner Student', assessmentResult='Detailed baseline result')

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # ---- Registration must remain open ----

    def test_registration_does_not_require_authentication(self):
        response = self.client.post('/api/users/register/', {
            'username': 'new@example.com',
            'email': 'new@example.com',
            'password': 'BrandNewPass123!',
            'first_name': 'New',
            'last_name': 'Teacher',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_listing_all_teacher_accounts_requires_authentication(self):
        response = self.client.get('/api/users/teachers/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Unauthenticated access must be rejected ----

    def test_unauthenticated_student_list_rejected(self):
        response = self.client.get('/api/users/students/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_student_view_rejected(self):
        response = self.client.get(f'/api/users/students/{self.student1.pk}/view/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_profile_update_rejected(self):
        response = self.client.patch('/api/users/profile/update/', {'first_name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Cross-teacher access must be rejected ----

    def test_cross_teacher_student_list_is_empty(self):
        self._auth(self.token2)
        response = self.client.get('/api/users/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertNotIn(self.student1.pk, ids)

    def test_cross_teacher_cannot_view_student(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/users/students/{self.student1.pk}/view/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_update_student(self):
        self._auth(self.token2)
        response = self.client.put(
            f'/api/users/students/{self.student1.pk}/', {'name': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.student1.refresh_from_db()
        self.assertEqual(self.student1.name, 'Owner Student')

    def test_cross_teacher_cannot_generate_insight_for_student(self):
        self._auth(self.token2)
        response = self.client.post(f'/api/users/students/{self.student1.pk}/generate-insight/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_new_student_is_assigned_to_authenticated_teacher_not_client_supplied_one(self):
        # Regression test: the client used to be able to set `teacher` /
        # `teacher_user_id` directly and assign a student to any teacher.
        self._auth(self.token2)
        response = self.client.post('/api/users/students/', {
            'name': 'New Student',
            'teacher': self.teacher1.pk,
            'teacher_user_id': self.user1.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = StudentProfile.objects.get(pk=response.data['data']['studentID'])
        self.assertEqual(created.teacher_id, self.teacher2.teacherID)

    def test_cannot_update_another_teachers_account_via_profile_update(self):
        # Regression test: the endpoint used to trust a client-supplied "id"
        # to select which User row to PATCH.
        self._auth(self.token2)
        response = self.client.patch('/api/users/profile/update/', {
            'id': self.user1.id,
            'first_name': 'Hijacked',
            'last_name': 'Name',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The call must only ever mutate the authenticated caller's own row.
        self.user1.refresh_from_db()
        self.assertNotEqual(self.user1.first_name, 'Hijacked')
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.first_name, 'Hijacked')

    # ---- Owning teacher retains access ----

    def test_owner_can_view_own_student(self):
        self._auth(self.token1)
        response = self.client.get(f'/api/users/students/{self.student1.pk}/view/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
