from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import resolve


class NeuropathCoreSettingsTests(TestCase):
    """Test core settings configuration and security defaults."""

    def test_installed_apps_contains_required_apps(self):
        required_apps = [
            'rest_framework',
            'rest_framework.authtoken',
            'corsheaders',
            'users',
            'iep_management',
            'tracking',
            'resources',
        ]
        for app in required_apps:
            self.assertIn(app, settings.INSTALLED_APPS)

    def test_default_authentication_and_permissions(self):
        drf_settings = getattr(settings, 'REST_FRAMEWORK', {})
        auth_classes = drf_settings.get('DEFAULT_AUTHENTICATION_CLASSES', [])
        perm_classes = drf_settings.get('DEFAULT_PERMISSION_CLASSES', [])

        self.assertIn('rest_framework.authentication.TokenAuthentication', auth_classes)
        self.assertIn('rest_framework.permissions.IsAuthenticated', perm_classes)

    def test_password_validators_configured(self):
        validators = [v['NAME'] for v in settings.AUTH_PASSWORD_VALIDATORS]
        self.assertIn('django.contrib.auth.password_validation.MinimumLengthValidator', validators)
        self.assertIn('django.contrib.auth.password_validation.NumericPasswordValidator', validators)

        with self.assertRaises(ValidationError):
            validate_password('123')


class NeuropathCoreUrlRoutingTests(TestCase):
    """Test root URL dispatch and application namespace routing."""

    def test_admin_url_resolves(self):
        match = resolve('/admin/')
        self.assertEqual(match.app_name, 'admin')

    def test_api_apps_urls_registered(self):
        # Verify routes for each app mount cleanly under /api/
        self.assertIsNotNone(resolve('/api/users/login/'))
        self.assertIsNotNone(resolve('/api/iep/generate-iep/'))
        self.assertIsNotNone(resolve('/api/resources/lesson-plans/'))
        self.assertIsNotNone(resolve('/api/tracking/student-records/'))
