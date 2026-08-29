from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from common_test_utils import create_teacher_with_login, create_student
from tracking.views import BinaryReportRenderEngine
from users.models import StudentProfile
from .models import StudentProgress


class BinaryReportRenderEngineTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.teacher, self.token = create_teacher_with_login('teacher@test.com')
        self.student = StudentProfile.objects.create(
            name='Alice Johnson',
            age=8,
            grade=2,
            gender='Female',
            teacher=self.teacher,
            diagnosis='Autism Spectrum Disorder',
            support_needs='Visual cues, structured routine',
            learning_style='Visual / Kinesthetic',
            assessmentResult='Baseline evaluation complete.'
        )

    def test_generate_report_stream_valid_pdf_structure(self):
        pdf_stream = BinaryReportRenderEngine.generate_report_stream(self.student)
        content = pdf_stream.getvalue()

        # PDF must start with valid header
        self.assertTrue(content.startswith(b'%PDF-'))
        # PDF must contain valid trailer / EOF marker
        self.assertTrue(b'%%EOF' in content)
        # PDF must be non-trivial ReportLab binary output (> 1000 bytes)
        self.assertGreater(len(content), 1000)

    def test_export_record_pdf_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        response = self.client.get(f'/api/tracking/student-records/{self.student.pk}/export/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn(f'StudentRecord_{self.student.pk}.pdf', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertTrue(b'%%EOF' in response.content)


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
