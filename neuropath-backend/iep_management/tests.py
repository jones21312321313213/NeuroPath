from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common_test_utils import create_teacher_with_login, create_student
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
