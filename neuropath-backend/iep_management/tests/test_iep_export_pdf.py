from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal, IEPObjectiveRow


class IEPExportPDFTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='test_teacher',
            email='test_teacher@example.com',
            password='password123'
        )
        self.teacher = Teacher.objects.create(
            name='Test Teacher',
            email='test_teacher@example.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            name='Alex Doe',
            age=10,
            grade=4,
            teacher=self.teacher,
            diagnosis='Autism Spectrum Disorder',
            profileDetails={
                'school': 'Central Elementary',
                'schoolYear': '2026-2027',
                'presentEvaluation': 'Evaluated with moderate support needs.',
                'academicStrengths': 'Excels in visual recognition and sequencing.',
                'academicNeeds': 'Needs assistance with vocal transitions and social interactions.',
                'parentalConcerns': 'Parent requested visual schedule cues.',
                'curriculumImpact': 'Requires modified pacing in general instruction.'
            }
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            program_type='Graded',
            difficulties='Social Communication\nSensory Processing',
            learning_barriers='Noise sensitivity\nUnstructured transitions',
            learning_facilitators='PECS visual cards\nNoise-cancelling headphones',
            learning_accommodations='5-minute quiet breaks\nVisual timetable',
            generatedDetails={
                'specialFactorNotes': 'Student uses visual schedules for transitions.'
            }
        )
        self.goal = IEPGoal.objects.create(
            iep=self.iep,
            subject_category='Communication',
            annual_goal='Improve verbal responses during group activities.'
        )
        self.row = IEPObjectiveRow.objects.create(
            parent_goal=self.goal,
            enroute_objectives='Use PECS card to request help',
            month_1_target='Given PECS cards and direct physical guidance, request help in 70% of opportunities',
            month_2_target='Given PECS cards and faded verbal cues, request help in 75% of opportunities',
            month_3_target='Given PECS cards, independently initiate help requests with 80% accuracy in 4 of 5 trials',
            interventions_procedures='Prompting hierarchy',
            timeline_mins_session='15 mins daily',
            individuals_responsible='SPED Teacher, SLP',
            progress_instructional='Quarterly assessment',
            remarks='Consistent progress noted'
        )

        # Other teacher and student
        self.other_user = User.objects.create_user(
            username='other_teacher',
            email='other_teacher@example.com',
            password='password123'
        )
        self.other_teacher = Teacher.objects.create(
            name='Other Teacher',
            email='other_teacher@example.com',
            passwordHash='hash'
        )
        self.other_student = StudentProfile.objects.create(
            name='Other Student',
            age=9,
            grade=3,
            teacher=self.other_teacher
        )
        self.other_iep = IEPModel.objects.create(
            studentID=self.other_student,
            version=1
        )

    def test_export_pdf_unauthenticated_returns_401(self):
        response = self.client.get(f'/api/iep/{self.iep.iepID}/export/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_export_pdf_authorized_returns_pdf_stream(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/iep/{self.iep.iepID}/export/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertIn('Alex_Doe', response['Content-Disposition'])
        self.assertIn('v1.pdf', response['Content-Disposition'])
        # PDF binary starts with %PDF-
        self.assertTrue(response.content.startswith(b'%PDF-'))

    def test_export_pdf_other_teacher_iep_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/iep/{self.other_iep.iepID}/export/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_export_pdf_nonexistent_iep_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/iep/999999/export/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_objective_row_persists_monthly_milestones(self):
        self.row.refresh_from_db()
        self.assertIn('direct physical guidance', self.row.month_1_target)
        self.assertIn('faded verbal cues', self.row.month_2_target)
        self.assertIn('independently initiate', self.row.month_3_target)

    def test_standalone_goal_serializer_monthly_milestones(self):
        from iep_management.serializers import StandaloneIEPGoalSerializer
        serializer = StandaloneIEPGoalSerializer(self.goal)
        data = serializer.data
        self.assertEqual(len(data['objective_rows']), 1)
        row_data = data['objective_rows'][0]
        self.assertEqual(row_data['month_1_target'], self.row.month_1_target)
        self.assertEqual(row_data['month_2_target'], self.row.month_2_target)
        self.assertEqual(row_data['month_3_target'], self.row.month_3_target)

    def test_export_pdf_renders_monthly_milestone_table(self):
        from iep_management.views import IEPBinaryReportRenderEngine
        pdf_stream = IEPBinaryReportRenderEngine.generate_iep_pdf_stream(self.iep)
        content = pdf_stream.getvalue()
        self.assertTrue(content.startswith(b'%PDF-'))
        self.assertGreater(len(content), 1000)

