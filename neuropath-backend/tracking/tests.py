from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common_test_utils import create_teacher_with_login, create_student
from .models import StudentProgress


class TrackingAuthAndTenantIsolationTests(TestCase):
    """Student tracking/progress data must require authentication and must
    only ever be visible to the owning teacher."""

    def setUp(self):
        self.client = APIClient()

        self.user1, self.teacher1, self.token1 = create_teacher_with_login('owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('other@example.com')

        self.student1 = create_student(self.teacher1, name='Owner Student')
        self.progress = StudentProgress.objects.create(
            student=self.student1, subjectName='Math', performanceScore=80,
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # ---- Unauthenticated access must be rejected ----

    def test_unauthenticated_student_records_list_rejected(self):
        response = self.client.get('/api/tracking/student-records/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_student_record_retrieve_rejected(self):
        response = self.client.get(f'/api/tracking/student-records/{self.student1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_analytics_rejected(self):
        response = self.client.get('/api/tracking/analytics/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_gateway_rejected(self):
        # Regression test for SessionAuthenticationGuard, which used to
        # always return True regardless of authentication state.
        response = self.client.get('/api/tracking/gateway/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Cross-teacher access must be rejected ----

    def test_cross_teacher_student_records_list_is_empty(self):
        self._auth(self.token2)
        response = self.client.get('/api/tracking/student-records/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_cross_teacher_cannot_retrieve_student_record(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/tracking/student-records/{self.student1.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_export_student_record(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/tracking/student-records/{self.student1.pk}/export/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_view_analytics(self):
        self._auth(self.token2)
        response = self.client.get('/api/tracking/analytics/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ---- Owning teacher retains access ----

    def test_owner_can_list_own_student_records(self):
        self._auth(self.token1)
        response = self.client.get('/api/tracking/student-records/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertIn(self.student1.pk, ids)

    def test_owner_can_view_analytics(self):
        self._auth(self.token1)
        response = self.client.get('/api/tracking/analytics/', {'studentID': self.student1.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
