import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import Teacher, StudentProfile
from tracking.models import StudentProgress
from iep_management.models import IEPModel


class IEPBaselineProgressSeedingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teacher_seed@test.com',
            email='teacher_seed@test.com',
            password='password123'
        )
        self.teacher = Teacher.objects.create(
            name='Seed Teacher',
            email='teacher_seed@test.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            teacher=self.teacher,
            name='Baseline Learner',
            age=9,
            grade=3,
            profileDetails={'difficultyMarkers': ['Mathematics', 'Reading Comprehension']},
            preferences=json.dumps({'difficultyMarkers': ['Mathematics', 'Reading Comprehension']})
        )
        self.client.force_authenticate(user=self.user)

    def test_saving_iep_seeds_baseline_student_progress_records(self):
        payload = {
            'action': 'save',
            'studentID': self.student.pk,
            'difficulties': 'Mathematics\nReading Comprehension',
            'generatedDetails': {
                'barrierRows': [
                    {'difficulty': 'Mathematics'},
                    {'difficulty': 'Reading Comprehension'}
                ]
            }
        }
        response = self.client.post('/api/iep/generate-iep/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify StudentProgress rows were created
        progress_entries = StudentProgress.objects.filter(student=self.student)
        self.assertGreaterEqual(progress_entries.count(), 2)

        subjects = list(progress_entries.values_list('subjectName', flat=True))
        self.assertIn('Mathematics', subjects)
        self.assertIn('Reading Comprehension', subjects)

        for entry in progress_entries:
            self.assertEqual(entry.performanceScore, 40)

    def test_saving_iep_with_comma_separated_difficulties_seeds_progress(self):
        payload = {
            'action': 'save',
            'studentID': self.student.pk,
            'difficulties': 'Communication, Social Skills',
            'generatedDetails': {}
        }
        response = self.client.post('/api/iep/generate-iep/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        progress_entries = StudentProgress.objects.filter(student=self.student)
        subjects = list(progress_entries.values_list('subjectName', flat=True))
        self.assertIn('Communication', subjects)
        self.assertIn('Social Skills', subjects)

    def test_saving_iep_without_explicit_difficulties_uses_profile_or_default(self):
        student_no_diff = StudentProfile.objects.create(
            teacher=self.teacher,
            name='No Diff Student',
            age=7,
            grade=1
        )
        payload = {
            'action': 'save',
            'studentID': student_no_diff.pk,
            'difficulties': '',
            'generatedDetails': {}
        }
        response = self.client.post('/api/iep/generate-iep/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        progress_entries = StudentProgress.objects.filter(student=student_no_diff)
        self.assertGreaterEqual(progress_entries.count(), 1)
        self.assertEqual(progress_entries.first().subjectName, 'General')
