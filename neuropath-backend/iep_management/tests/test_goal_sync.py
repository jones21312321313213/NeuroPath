from django.test import TestCase
from rest_framework.test import APIClient
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal


class GoalSyncTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = Teacher.objects.create(name='Teacher Clara', email='clara@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(name='Sammy Davis', age=9, teacher=self.teacher)
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            generatedDetails={
                'learnerGoals': [
                    {
                        'type': 'Care Skills',
                        'annualGoal': 'Sammy will wash hands independently with visual cue.',
                        'rows': [{'objective': 'Turn on water'}]
                    }
                ]
            }
        )

    def test_query_goals_by_student_with_latest_syncs_and_returns_goals(self):
        from django.contrib.auth.models import User
        auth_user = User.objects.create_user(username='clara', email='clara@test.com', password='pw')
        self.client.force_authenticate(user=auth_user)

        self.assertEqual(IEPGoal.objects.filter(iep=self.iep).count(), 0)

        url = f'/api/iep/goals/?student_id={self.student.pk}&latest=true'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['annual_goal'], 'Sammy will wash hands independently with visual cue.')
        self.assertEqual(IEPGoal.objects.filter(iep=self.iep).count(), 1)

    def test_query_goals_latest_true_only_returns_latest_iep_goals(self):
        from django.contrib.auth.models import User
        auth_user = User.objects.create_user(username='clara_multi', email='clara@test.com', password='pw')
        self.client.force_authenticate(user=auth_user)

        # self.iep is version 1. Add a goal to it.
        IEPGoal.objects.create(
            iep=self.iep,
            subject_category='Math',
            annual_goal='Old math goal',
            goalName='Old Goal',
            target_metric='Metric'
        )

        # Create a newer IEP (version 2) with generatedDetails
        new_iep = IEPModel.objects.create(
            studentID=self.student,
            version=2,
            generatedDetails={
                'learnerGoals': [
                    {
                        'type': 'Reading',
                        'annualGoal': 'Sammy will read 20 words per minute.',
                        'rows': []
                    }
                ]
            }
        )

        url = f'/api/iep/goals/?student_id={self.student.pk}&latest=true'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['annual_goal'], 'Sammy will read 20 words per minute.')
        self.assertEqual(data[0]['iep'], new_iep.pk)
