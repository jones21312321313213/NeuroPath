
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


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


class TeacherProfileUpdateControllerTests(APITestCase):
    """PATCH /api/users/profile/update/ may only ever edit the caller."""

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

    def test_anonymous_request_is_rejected(self):
        """Regression: an unauthenticated caller could rewrite any account."""
        response = self.client.patch(
            self.url,
            {
                "id": self.victim.id,
                "first_name": "Pwned",
                "last_name": "Two",
                "email": "victim@example.com",
                "password": "attacker-chosen-pw",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.victim.refresh_from_db()
        self.assertEqual(self.victim.first_name, "Victim")
        self.assertTrue(self.victim.check_password("victim-original-pw"))

    def test_body_id_cannot_target_another_account(self):
        """An authenticated caller must not edit someone else via body `id`."""
        self._authenticate()

        response = self.client.patch(
            self.url,
            {
                "id": self.victim.id,
                "first_name": "Pwned",
                "last_name": "Two",
                "email": "attacker-controlled@example.com",
                "password": "attacker-chosen-pw",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The victim is untouched...
        self.victim.refresh_from_db()
        self.assertEqual(self.victim.first_name, "Victim")
        self.assertEqual(self.victim.email, "victim@example.com")
        self.assertTrue(self.victim.check_password("victim-original-pw"))

        # ...and the edit landed on the authenticated caller instead.
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.first_name, "Pwned")
        self.assertEqual(self.owner.email, "attacker-controlled@example.com")
        self.assertTrue(self.owner.check_password("attacker-chosen-pw"))

    def test_updates_own_profile_without_password(self):
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
