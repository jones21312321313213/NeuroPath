from unittest import mock
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from common_test_utils import create_teacher_with_login, create_student
from .models import StudentProfile, Teacher


class TeacherLogoutControllerTests(APITestCase):
    """POST /api/users/logout/ must revoke the caller's DRF auth token."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="teacher@example.com",
            email="teacher@example.com",
            password="s3cret-pass",
        )
        self.token = Token.objects.create(user=self.user)
        self.url = reverse("teacher-logout")

    def test_logout_deletes_the_token(self):
        """Mirrors the frontend call: Token header plus an empty JSON body."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_token_is_rejected_after_logout(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.client.post(self.url)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Token.objects.filter(user=self.user).exists())

    def test_bearer_scheme_is_not_accepted(self):
        """The app standardises on `Token`; `Bearer` must not authenticate."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token.key}")

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Token.objects.filter(user=self.user).exists())


class TeacherProfileUpdateFieldRulesTests(APITestCase):
    """Field-level rules for PATCH /api/users/profile/update/.

    Authentication and cross-account protection for this endpoint are covered by
    TeacherProfileUpdateOwnershipTests and UsersAuthAndTenantIsolationTests
    below; this class only covers rules those do not assert.
    """

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com",
            email="owner@example.com",
            password="owner-original-pw",
            first_name="Owner",
            last_name="One",
        )
        self.victim = User.objects.create_user(
            username="victim@example.com",
            email="victim@example.com",
            password="victim-original-pw",
            first_name="Victim",
            last_name="Two",
        )
        self.token = Token.objects.create(user=self.owner)
        self.url = reverse("teacher-profile-update")

    def _authenticate(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_password_is_untouched_when_the_field_is_omitted(self):
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Renamed",
                "last_name": "One",
                "email": "owner@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Renamed")
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.first_name, "Renamed")
        # Password left alone when the field is omitted.
        self.assertTrue(self.owner.check_password("owner-original-pw"))

    def test_email_already_used_by_another_account_is_rejected(self):
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "victim@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.email, "owner@example.com")

    def test_weak_password_is_rejected_on_profile_update(self):
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "owner@example.com",
                "password": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data["errors"])

    def test_email_change_updates_teacher_mirror_row(self):
        teacher = Teacher.objects.create(
            name="Owner One",
            email="owner@example.com",
            passwordHash="not-used",
        )
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "new.owner.email@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        teacher.refresh_from_db()
        self.assertEqual(teacher.email, "new.owner.email@example.com")

    def test_login_succeeds_with_new_email_after_profile_update(self):
        """Teacher can immediately authenticate using the new email after profile update."""
        Teacher.objects.create(
            name="Owner One",
            email="owner@example.com",
            passwordHash="not-used",
        )
        self._authenticate()

        # Update profile email
        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "updated.owner@example.com",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Clear authentication credentials from client to simulate a fresh login
        self.client.credentials()

        # Attempt login using the updated email and original password
        login_url = reverse("teacher-login")
        login_response = self.client.post(
            login_url,
            {
                "email": "updated.owner@example.com",
                "password": "owner-original-pw",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("token", login_response.data)
        self.assertEqual(login_response.data["teacher"]["email"], "updated.owner@example.com")

    def test_login_succeeds_with_new_email_and_new_password_after_profile_update(self):
        """Teacher can authenticate using new email and new password when both are updated."""
        Teacher.objects.create(
            name="Owner One",
            email="owner@example.com",
            passwordHash="not-used",
        )
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "new.both@example.com",
                "password": "NewSecretPassword123!@#",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials()

        login_url = reverse("teacher-login")
        login_response = self.client.post(
            login_url,
            {
                "email": "new.both@example.com",
                "password": "NewSecretPassword123!@#",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("token", login_response.data)

    def test_profile_update_rejects_email_matching_another_users_username(self):
        """Profile update rejects email if it collides with another user's username."""
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": "victim@example.com",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])


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


class TeacherProfileUpdateOwnershipTests(APITestCase):
    def setUp(self):
        self.user_a, self.teacher_a, self.token_a = make_teacher(
            'teacher.a@example.com', 'password123', 'Alice', 'Anderson'
        )
        self.user_b, self.teacher_b, self.token_b = make_teacher(
            'teacher.b@example.com', 'password123', 'Bob', 'Brown'
        )
        self.url = reverse('teacher-profile-update')

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.patch(self.url, {'id': self.user_b.id, 'first_name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_client_supplied_id_cannot_target_another_teacher(self):
        """Teacher A authenticates but sends Teacher B's id — only A's own account may change."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        response = self.client.patch(self.url, {
            'id': self.user_b.id,
            'first_name': 'Hacked',
            'last_name': 'Name',
            'email': self.user_a.email,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The response reflects the authenticated caller (A), not the spoofed id (B).
        self.assertEqual(response.data['id'], self.user_a.id)

        self.user_a.refresh_from_db()
        self.user_b.refresh_from_db()
        self.assertEqual(self.user_a.first_name, 'Hacked')
        # Teacher B's account must be completely untouched.
        self.assertEqual(self.user_b.first_name, 'Bob')

    def test_teacher_can_update_own_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        response = self.client.patch(self.url, {
            'first_name': 'Alicia',
            'last_name': self.user_a.last_name,
            'email': self.user_a.email,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertEqual(self.user_a.first_name, 'Alicia')


class StudentProfileOwnershipTests(APITestCase):
    def setUp(self):
        self.user_a, self.teacher_a, self.token_a = make_teacher(
            'teacher.a@example.com', 'password123', 'Alice', 'Anderson'
        )
        self.user_b, self.teacher_b, self.token_b = make_teacher(
            'teacher.b@example.com', 'password123', 'Bob', 'Brown'
        )
        self.student_a = StudentProfile.objects.create(
            teacher=self.teacher_a, name='Alpha Student', age=8, grade=2,
        )

    def auth_as(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_list_students_unauthenticated_rejected(self):
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_teacher_cannot_list_another_teachers_students(self):
        self.auth_as(self.token_b)
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertNotIn(self.student_a.studentID, ids)

    def test_owner_can_list_own_students(self):
        self.auth_as(self.token_a)
        response = self.client.get(reverse('student-create-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['studentID'] for row in response.data]
        self.assertIn(self.student_a.studentID, ids)

    def test_create_ignores_client_supplied_teacher(self):
        """Teacher B tries to create a student under Teacher A's account by spoofing `teacher`."""
        self.auth_as(self.token_b)
        response = self.client.post(reverse('student-create-list'), {
            'name': 'Spoofed Student',
            'teacher': self.teacher_a.pk,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = StudentProfile.objects.get(pk=response.data['data']['studentID'])
        self.assertEqual(created.teacher_id, self.teacher_b.pk)

    def test_non_owner_cannot_view_student_by_pk(self):
        self.auth_as(self.token_b)
        response = self.client.get(reverse('student-view', args=[self.student_a.studentID]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_view_student_by_pk(self):
        self.auth_as(self.token_a)
        response = self.client.get(reverse('student-view', args=[self.student_a.studentID]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_cannot_update_student_by_pk(self):
        self.auth_as(self.token_b)
        response = self.client.patch(
            reverse('student-detail-update', args=[self.student_a.studentID]),
            {'name': 'Hacked Name'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.student_a.refresh_from_db()
        self.assertEqual(self.student_a.name, 'Alpha Student')

    def test_owner_can_update_student_by_pk(self):
        self.auth_as(self.token_a)
        response = self.client.patch(
            reverse('student-detail-update', args=[self.student_a.studentID]),
            {'name': 'Updated Name'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_a.refresh_from_db()
        self.assertEqual(self.student_a.name, 'Updated Name')

    def test_non_owner_cannot_delete_student_by_pk(self):
        self.auth_as(self.token_b)
        response = self.client.delete(
            reverse('student-detail-update', args=[self.student_a.studentID])
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(StudentProfile.objects.filter(pk=self.student_a.studentID).exists())

    def test_owner_can_delete_student_by_pk(self):
        self.auth_as(self.token_a)
        response = self.client.delete(
            reverse('student-detail-update', args=[self.student_a.studentID])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(StudentProfile.objects.filter(pk=self.student_a.studentID).exists())


class TeacherRegistrationSecurityTests(APITestCase):
    """Registration security tests: password validation and email uniqueness."""

    def test_registration_rejects_weak_password(self):
        """Registration must enforce AUTH_PASSWORD_VALIDATORS (reject short/numeric passwords)."""
        response = self.client.post('/api/users/register/', {
            'username': 'weakpass@example.com',
            'email': 'weakpass@example.com',
            'password': '123',
            'first_name': 'Weak',
            'last_name': 'Pass',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data.get('errors', {}))

    def test_registration_rejects_duplicate_email(self):
        """Registration must reject duplicate emails and prevent cross-tenant teacher roster sharing."""
        # Create initial teacher
        response1 = self.client.post('/api/users/register/', {
            'username': 'teacher@example.com',
            'email': 'teacher@example.com',
            'password': 'StrongPass123!@#',
            'first_name': 'Original',
            'last_name': 'Teacher',
        }, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Attempt to register second account with same email (different case)
        response2 = self.client.post('/api/users/register/', {
            'username': 'teacher2',
            'email': 'Teacher@example.com',
            'password': 'StrongPass123!@#',
            'first_name': 'Imposter',
            'last_name': 'Teacher',
        }, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response2.data.get('errors', {}))

    def test_registration_succeeds_with_valid_credentials(self):
        """Valid registration creates Django auth User and linked Teacher row."""
        response = self.client.post('/api/users/register/', {
            'username': 'valid@example.com',
            'email': 'valid@example.com',
            'password': 'StrongPass123!@#',
            'first_name': 'Valid',
            'last_name': 'Teacher',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='valid@example.com').exists())
        self.assertTrue(Teacher.objects.filter(email='valid@example.com').exists())

    @mock.patch('users.serializers.Teacher.objects.create')
    def test_registration_atomic_rollback_on_teacher_creation_failure(self, mock_teacher_create):
        """If Teacher creation fails during registration, the User record is rolled back atomically."""
        mock_teacher_create.side_effect = RuntimeError("Simulated failure during Teacher creation")

        with self.assertRaises(RuntimeError):
            self.client.post('/api/users/register/', {
                'username': 'atomic.fail@example.com',
                'email': 'atomic.fail@example.com',
                'password': 'StrongPass123!@#',
                'first_name': 'Atomic',
                'last_name': 'Test',
            }, format='json')

        self.assertFalse(User.objects.filter(email='atomic.fail@example.com').exists())
        self.assertFalse(Teacher.objects.filter(email='atomic.fail@example.com').exists())


class TeacherTutorialEndpointTests(APITestCase):
    """Tests for has_completed_tutorial in login payload and POST /api/users/tutorial-complete/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="newteacher@example.com",
            email="newteacher@example.com",
            password="securepassword123",
            first_name="Jane",
            last_name="Doe",
        )
        self.teacher = Teacher.objects.create(
            email="newteacher@example.com",
            name="Jane Doe",
            passwordHash=self.user.password,
            has_completed_tutorial=False,
        )
        self.token = Token.objects.create(user=self.user)
        self.login_url = reverse("teacher-login")
        self.tutorial_url = reverse("teacher-tutorial-complete")

    def test_login_returns_has_completed_tutorial_false_for_new_teacher(self):
        response = self.client.post(
            self.login_url,
            {"email": "newteacher@example.com", "password": "securepassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("teacher", response.data)
        self.assertIn("has_completed_tutorial", response.data["teacher"])
        self.assertFalse(response.data["teacher"]["has_completed_tutorial"])

    def test_tutorial_complete_requires_authentication(self):
        response = self.client.post(self.tutorial_url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_tutorial_complete_updates_teacher_record(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.post(self.tutorial_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("has_completed_tutorial"))
        self.teacher.refresh_from_db()
        self.assertTrue(self.teacher.has_completed_tutorial)

    def test_login_returns_has_completed_tutorial_true_after_completion(self):
        self.teacher.has_completed_tutorial = True
        self.teacher.save()

        response = self.client.post(
            self.login_url,
            {"email": "newteacher@example.com", "password": "securepassword123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["teacher"]["has_completed_tutorial"])


class StudentProfileTimestampTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="timestamptest@example.com",
            email="timestamptest@example.com",
            password="securepassword123",
        )
        self.teacher = Teacher.objects.create(
            email="timestamptest@example.com",
            name="Timestamp Teacher",
            passwordHash=self.user.password,
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_student_profile_created_at_and_updated_at_populated(self):
        student = StudentProfile.objects.create(
            name="Timmy Test",
            age=8,
            grade=2,
            teacher=self.teacher,
            diagnosis="ASD",
        )
        self.assertIsNotNone(student.created_at)
        self.assertIsNotNone(student.updated_at)

        orig_updated_at = student.updated_at
        student.grade = 3
        student.save()
        student.refresh_from_db()
        self.assertGreaterEqual(student.updated_at, orig_updated_at)

    def test_student_profile_serializer_exposes_timestamps(self):
        student = StudentProfile.objects.create(
            name="Serializer Test",
            age=9,
            grade=3,
            teacher=self.teacher,
        )
        response = self.client.get(f"/api/users/students/{student.studentID}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("created_at", response.data)
        self.assertIn("updated_at", response.data)


class ConsentCertificatePdfViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="consentsped@example.com",
            email="consentsped@example.com",
            password="securepassword123",
            first_name="SPED",
            last_name="Teacher",
        )
        self.teacher = Teacher.objects.create(
            email="consentsped@example.com",
            name="SPED Teacher",
            passwordHash=self.user.password,
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.student = StudentProfile.objects.create(
            name="Lucas Garcia",
            age=7,
            grade=1,
            teacher=self.teacher,
            guardian_name="Elena Garcia",
            guardian_relationship="Mother",
            parental_consent_obtained=True,
            consent_date="2025-01-10",
            profileDetails={
                "school": "DepEd SPED Center Cebu",
                "schoolYear": "2024-2025",
            },
        )

        self.other_user = User.objects.create_user(
            username="otherteacher@example.com",
            email="otherteacher@example.com",
            password="securepassword123",
        )
        self.other_teacher = Teacher.objects.create(
            email="otherteacher@example.com",
            name="Other Teacher",
            passwordHash=self.other_user.password,
        )
        self.other_student = StudentProfile.objects.create(
            name="Other Student",
            teacher=self.other_teacher,
        )

    def test_get_consent_pdf_for_own_student_success(self):
        url = reverse("student-consent-pdf", kwargs={"pk": self.student.studentID})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment; filename=", response["Content-Disposition"])
        self.assertIn("Lucas_Garcia", response["Content-Disposition"])
        self.assertTrue(len(response.content) > 1000)

    def test_get_consent_pdf_for_other_teacher_student_returns_404(self):
        url = reverse("student-consent-pdf", kwargs={"pk": self.other_student.studentID})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_post_consent_pdf_with_payload_success(self):
        url = reverse("generate-consent-pdf")
        payload = {
            "learnerName": "Maria Santos",
            "guardianName": "Juan Santos",
            "guardianRelationship": "Father",
            "school": "Manila Central SPED",
            "schoolYear": "2024-2025",
            "grade": "Grade 2",
            "consentDate": "2025-02-15",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment; filename=", response["Content-Disposition"])
        self.assertIn("Maria_Santos", response["Content-Disposition"])
        self.assertTrue(len(response.content) > 1000)

    def test_consent_pdf_requires_authentication(self):
        self.client.credentials()  # Unset auth
        url = reverse("student-consent-pdf", kwargs={"pk": self.student.studentID})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetTests(APITestCase):
    """Test suite for POST /api/users/password-reset/ and POST /api/users/password-reset/confirm/."""

    def setUp(self):
        self.email = "sped.educator@example.com"
        self.password = "ValidPass123!"
        self.user = User.objects.create_user(
            username=self.email,
            email=self.email,
            password=self.password,
            first_name="Jane",
            last_name="Doe",
        )
        self.teacher = Teacher.objects.create(
            name="Jane Doe",
            email=self.email,
            passwordHash=self.user.password,
        )
        self.token = Token.objects.create(user=self.user)
        self.reset_request_url = reverse("password-reset-request")
        self.reset_confirm_url = reverse("password-reset-confirm")

    def test_password_reset_request_valid_email_sends_email(self):
        response = self.client.post(
            self.reset_request_url,
            {"email": self.email},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]
        self.assertIn("Reset your NeuroPath password", sent_email.subject)
        self.assertEqual(sent_email.to, [self.email])
        self.assertIn("/reset-password?uid=", sent_email.body)
        self.assertIn("token=", sent_email.body)

    def test_password_reset_request_case_insensitive_email(self):
        response = self.client.post(
            self.reset_request_url,
            {"email": "  SPED.EDUCATOR@EXAMPLE.COM  "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.email])

    def test_password_reset_request_nonexistent_email_safe_generic_response(self):
        response = self.client.post(
            self.reset_request_url,
            {"email": "unknown.user@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_invalid_email_format(self):
        for invalid_email in ["", "   ", "not-an-email", "missing-at-sign.com"]:
            response = self.client.post(
                self.reset_request_url,
                {"email": invalid_email},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("error", response.data)

    @mock.patch("users.views.send_mail")
    def test_password_reset_request_send_mail_failure_returns_500(self, mock_send_mail):
        mock_send_mail.side_effect = Exception("SMTP server connection timeout")
        response = self.client.post(
            self.reset_request_url,
            {"email": self.email},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
        self.assertIn("Failed to send reset email", response.data["error"])

    def test_password_reset_confirm_successful_flow(self):
        # 1. Generate valid token & uid
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        new_pass = "NewSecurePassword456!"

        # 2. Confirm password reset
        response = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": new_pass,
                "new_password_confirm": new_pass,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("successfully reset", response.data["message"])

        # 3. Verify user can log in with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_pass))
        self.assertFalse(self.user.check_password(self.password))

        login_url = reverse("teacher-login")
        login_res = self.client.post(
            login_url,
            {"email": self.email, "password": new_pass},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn("token", login_res.data)

        # 4. Verify previous auth token was deleted upon password change
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())

        # 5. Verify Teacher mirror row passwordHash is updated
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.passwordHash, self.user.password)

    def test_password_reset_confirm_with_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": "invalid-token-12345",
                "new_password": "NewSecurePassword456!",
                "new_password_confirm": "NewSecurePassword456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", response.data["error"])

    def test_password_reset_confirm_with_invalid_uid(self):
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            self.reset_confirm_url,
            {
                "uid": "invalid-base64-uid",
                "token": token,
                "new_password": "NewSecurePassword456!",
                "new_password_confirm": "NewSecurePassword456!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", response.data["error"])

    def test_password_reset_confirm_password_mismatch(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewSecurePassword456!",
                "new_password_confirm": "DifferentPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Passwords do not match", response.data["error"])

    def test_password_reset_confirm_weak_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "123",  # Too short and numeric
                "new_password_confirm": "123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errors", response.data)
        self.assertIn("password", response.data["errors"])

    def test_password_reset_token_cannot_be_reused(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        new_pass_1 = "FirstResetPassword123!"

        # First reset succeeds
        res1 = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": new_pass_1,
                "new_password_confirm": new_pass_1,
            },
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second reset with identical token must fail
        res2 = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "SecondResetPassword123!",
                "new_password_confirm": "SecondResetPassword123!",
            },
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", res2.data["error"])
