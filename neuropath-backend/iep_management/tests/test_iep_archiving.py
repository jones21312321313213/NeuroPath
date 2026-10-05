from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.serializers import IEPDataSerializer, IEPListDetailSerializer, IEPUpdateSerializer


class IEPArchivingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auth_user = User.objects.create_user(username='teacher_ann', email='ann@test.com', password='pw')
        self.teacher = Teacher.objects.create(name='Teacher Ann', email='ann@test.com', passwordHash='hash')
        self.student = StudentProfile.objects.create(name='Tommy Lee', age=8, teacher=self.teacher)
        self.iep_v1 = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Motor skills',
            is_archived=False,
        )

    def test_default_is_archived_is_false(self):
        new_iep = IEPModel.objects.create(
            studentID=self.student,
            version=2,
            difficulties='Speech',
        )
        self.assertFalse(new_iep.is_archived)

    def test_serializers_include_is_archived_field(self):
        list_data = IEPListDetailSerializer(self.iep_v1).data
        self.assertIn('is_archived', list_data)
        self.assertFalse(list_data['is_archived'])

        data_serializer = IEPDataSerializer(self.iep_v1).data
        self.assertIn('is_archived', data_serializer)

        update_serializer = IEPUpdateSerializer()
        self.assertIn('is_archived', update_serializer.fields)

    def test_edit_iep_can_toggle_is_archived(self):
        self.client.force_authenticate(user=self.auth_user)

        # Archive the IEP
        response = self.client.patch(
            f'/api/iep/edit/{self.iep_v1.pk}/',
            data={'is_archived': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get('is_archived'))

        self.iep_v1.refresh_from_db()
        self.assertTrue(self.iep_v1.is_archived)

        # Unarchive the IEP
        response = self.client.patch(
            f'/api/iep/edit/{self.iep_v1.pk}/',
            data={'is_archived': False},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json().get('is_archived'))

        self.iep_v1.refresh_from_db()
        self.assertFalse(self.iep_v1.is_archived)

    def test_dashboard_stats_excludes_archived_ieps(self):
        self.client.force_authenticate(user=self.auth_user)

        # Create a second IEP that is archived
        IEPModel.objects.create(
            studentID=self.student,
            version=2,
            is_archived=True,
        )

        response = self.client.get('/api/iep/dashboard-stats/')
        self.assertEqual(response.status_code, 200)
        # Should only count the 1 active IEP, not the archived one
        self.assertEqual(response.json().get('active_ieps'), 1)
