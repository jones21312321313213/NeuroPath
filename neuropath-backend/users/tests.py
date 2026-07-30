
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
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.post(self.url)

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
