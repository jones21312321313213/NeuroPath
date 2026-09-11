import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel


class IEPDifficultySyncTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='spedteacher@test.com',
            email='spedteacher@test.com',
            password='password123'
        )
        self.teacher = Teacher.objects.create(
            name='Sped Teacher',
            email='spedteacher@test.com',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            teacher=self.teacher,
            name='Test Student',
            age=8,
            grade=3,
            profileDetails={'difficultyMarkers': ['Difficulty in Seeing']},
            preferences=json.dumps({'difficultyMarkers': ['Difficulty in Seeing']})
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            baselineData='Initial baseline',
            difficulties='Difficulty in Seeing',
            generatedDetails={'barrierRows': [{'difficulty': 'Difficulty in Seeing'}]}
        )
        self.client.force_authenticate(user=self.user)

    def test_sync_new_section_b_difficulties_to_student_profile(self):
        payload = {
            'difficulties': 'Difficulty in Seeing\nDifficulty in Mobility',
            'generatedDetails': {
                'barrierRows': [
                    {'difficulty': 'Difficulty in Seeing'},
                    {'difficulty': 'Difficulty in Mobility'}
                ]
            }
        }
        response = self.client.put(f'/api/iep/edit/{self.iep.iepID}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.student.refresh_from_db()
        markers = self.student.profileDetails.get('difficultyMarkers', [])
        self.assertIn('Difficulty in Seeing', markers)
        self.assertIn('Difficulty in Mobility', markers)
        self.assertEqual(len(markers), 2)

    def test_sync_deduplicates_case_insensitively(self):
        payload = {
            'difficulties': 'difficulty in seeing\nDifficulty in Hearing\nDIFFICULTY IN HEARING',
            'generatedDetails': {
                'barrierRows': [
                    {'difficulty': 'difficulty in seeing'},
                    {'difficulty': 'Difficulty in Hearing'},
                    {'difficulty': 'DIFFICULTY IN HEARING'}
                ]
            }
        }
        response = self.client.put(f'/api/iep/edit/{self.iep.iepID}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.student.refresh_from_db()
        markers = self.student.profileDetails.get('difficultyMarkers', [])
        # 'Difficulty in Seeing' was already there, 'Difficulty in Hearing' added once
        self.assertEqual(len(markers), 2)
        self.assertEqual(markers[0], 'Difficulty in Seeing')
        self.assertEqual(markers[1], 'Difficulty in Hearing')
