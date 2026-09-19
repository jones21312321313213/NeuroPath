# Issue #67 — Remove Hardcoded Secrets, Insecure Settings & Enforce Account Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all committed secrets and leaked infrastructure hostnames from `settings.py`, make `DEBUG=False` the safe default, update `.env.example`, enforce Django's `AUTH_PASSWORD_VALIDATORS` during user registration/updates, and guarantee strict email uniqueness to prevent cross-tenant student roster sharing.

**Architecture:** 
1. `neuropath_core/settings.py` is made strictly environment-driven via `django-environ` with safe, generic development/production defaults (`DEBUG=False` default, generic localhost/5432 database defaults with no Supabase hostnames or pooler usernames committed).
2. `users/serializers.py` (`TeacherSerializer`) is updated to run Django's `validate_password` from `AUTH_PASSWORD_VALIDATORS` during registration, validate case-insensitive email uniqueness across both `User` and `Teacher` models, and construct the `Teacher` record directly without silent tenant sharing (`get_or_create`).
3. `users/views.py` (`TeacherProfileUpdateController`) is updated to run `validate_password` and correctly sync email updates to the `Teacher` mirror model.
4. Comprehensive automated unit & integration tests are added to `users/tests.py` covering weak password rejection, duplicate email registration rejection, profile update password validation, and tenant isolation.

**Tech Stack:** Python 3.12/3.13, Django 6.0+, Django REST Framework (DRF), django-environ, psycopg2.

## Global Constraints

- **No committed secrets or infra hostnames**: `settings.py` must contain no real database hostnames (e.g., `aws-1-ap-southeast-1.pooler.supabase.com`), no project reference strings (`mdlsncdlpgbfjcccavuv`), and no hardcoded secret keys.
- **Safe defaults**: `DEBUG` must default to `False`. Database port must default to standard `5432` (not Supabase pooler `6543`), host to `localhost`, user to `postgres`.
- **DRF / Django validation**: Weak passwords failing any configured `AUTH_PASSWORD_VALIDATORS` must return HTTP `400 Bad Request` with field error under `password`.
- **Email uniqueness**: Duplicate emails (case-insensitive) on registration must return HTTP `400 Bad Request` with field error under `email`.
- **Preserve existing contracts**: `POST /api/users/register/` and `PATCH /api/users/profile/update/` response shapes and existing status codes for valid requests must be preserved.
- **Lint & System checks**: Verification requires `ruff check .` and `python manage.py check` to pass cleanly.
- Commit after each task.

---

## File Structure

| File | Responsibility after this change |
| --- | --- |
| `neuropath-backend/neuropath_core/settings.py` | **Modify.** Read `SECRET_KEY`, `DEBUG` (default `False`), `ALLOWED_HOSTS`, `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` (default `localhost`), `DB_PORT` (default `5432`) from environment. Remove hardcoded Supabase pooler host and user strings. |
| `neuropath-backend/.env.example` | **Modify.** Document all environment variables: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `HF_TOKEN`, `GROQ_API_KEY`. |
| `neuropath-backend/users/serializers.py` | **Modify.** In `TeacherSerializer`: enforce required email, add `validate_password` calling `django.contrib.auth.password_validation.validate_password`, add `validate_email` rejecting duplicate emails against `User` and `Teacher`, and create `Teacher` directly in `create()` instead of `get_or_create()`. |
| `neuropath-backend/users/views.py` | **Modify.** In `TeacherProfileUpdateController`: use `validate_password` for password changes; fix Teacher mirror-row update when email changes. |
| `neuropath-backend/users/tests.py` | **Modify.** Add tests for weak password rejection on registration/update, duplicate email registration rejection (case-insensitive), and tenant isolation. |

---

## Task 1: Environment-driven settings and clean defaults

Remove all hardcoded secrets, remove Supabase pooler defaults from `settings.py`, make `DEBUG=False` the default, and update `.env.example`.

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py`
- Modify: `neuropath-backend/.env.example`

**Interfaces:**
- `SECRET_KEY`: read via `env('SECRET_KEY', default=...)` with a dummy fallback in dev only if `DEBUG=True` or strictly required.
- `DEBUG`: read via `env.bool('DEBUG', default=False)`.
- `DATABASES['default']`: generic `localhost:5432` defaults with `DB_ENGINE` configurability.

- [ ] **Step 1: Update `neuropath_core/settings.py`**

Modify lines ~27-40 and ~94-103 of `neuropath-backend/neuropath_core/settings.py`:

```python
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production-environment')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool('DEBUG', default=False)

# Hosts this backend will answer for. Defaults match what DEBUG mode allowed
# implicitly; set ALLOWED_HOSTS in .env to serve a non-localhost deployment
# without editing this file.
ALLOWED_HOSTS = env.list(
    'ALLOWED_HOSTS',
    default=['localhost', '127.0.0.1', '[::1]'] if DEBUG else [],
)
```

And update `DATABASES`:

```python
# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', default='django.db.backends.postgresql'),
        'NAME': env('DB_NAME', default='postgres'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default=''),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
    }
}
```

- [ ] **Step 2: Update `neuropath-backend/.env.example`**

Update `neuropath-backend/.env.example` to document `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, and all database settings:

```ini
# Copy this file to .env in this directory (neuropath-backend/.env) and fill in real values.
# Django reads this via django-environ (see neuropath_core/settings.py).

# ── Django Core ───────────────────────────────────────────────────────────────
# In production, generate a secure random key (e.g. `python -c "import secrets; print(secrets.token_urlsafe(50))"`)
SECRET_KEY=
DEBUG=True

# ── Database ──────────────────────────────────────────────────────────────────
# Database engine (e.g. django.db.backends.postgresql or django.db.backends.sqlite3)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# ── Hosts & origins ───────────────────────────────────────────────────────────
# Comma-separated.
ALLOWED_HOSTS=localhost,127.0.0.1,[::1]
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ── AI services ───────────────────────────────────────────────────────────────
HF_TOKEN=
GROQ_API_KEY=
# OLLAMA_HOST=http://localhost:11434
```

- [ ] **Step 3: Verify with `python manage.py check` and `ruff check .`**

Run:
```bash
ruff check neuropath-backend/
python neuropath-backend/manage.py check
```
Expected: `ruff check` passes with no errors, `manage.py check` reports 0 issues.

- [ ] **Step 4: Commit**

```bash
git add neuropath-backend/neuropath_core/settings.py neuropath-backend/.env.example
git commit -m "sec(settings): remove hardcoded secrets and Supabase infra defaults"
```

---

## Task 2: Password strength validation & email uniqueness in TeacherSerializer

Enforce `AUTH_PASSWORD_VALIDATORS` during registration and validate email uniqueness across `User` and `Teacher` models to prevent cross-tenant sharing.

**Files:**
- Modify: `neuropath-backend/users/serializers.py`
- Modify: `neuropath-backend/users/views.py`

**Interfaces:**
- Consumes: `django.contrib.auth.password_validation.validate_password`
- Produces: `TeacherSerializer` validating `password` against Django password validators, `email` format & uniqueness, and creating single-tenant `Teacher` rows.

- [ ] **Step 1: Write failing test in `neuropath-backend/users/tests.py`**

Add tests to `neuropath-backend/users/tests.py`:

```python
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
        self.client.post('/api/users/register/', {
            'username': 'teacher@example.com',
            'email': 'teacher@example.com',
            'password': 'StrongPass123!@#',
            'first_name': 'Original',
            'last_name': 'Teacher',
        }, format='json')

        # Attempt to register second account with same email (different case)
        response = self.client.post('/api/users/register/', {
            'username': 'teacher2',
            'email': 'Teacher@example.com',
            'password': 'StrongPass123!@#',
            'first_name': 'Imposter',
            'last_name': 'Teacher',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data.get('errors', {}))
```

- [ ] **Step 2: Implement password validation and email uniqueness in `users/serializers.py`**

In `neuropath-backend/users/serializers.py`:

```python
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class TeacherSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {'required': False},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists() or Teacher.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        # Ensure username defaults to email if not explicitly provided
        if not validated_data.get('username'):
            validated_data['username'] = email

        user = User.objects.create_user(**validated_data)
        first = validated_data.get('first_name', '')
        last = validated_data.get('last_name', '')
        full_name = f'{first} {last}'.strip() if first or last else user.username

        Teacher.objects.create(
            email=email,
            name=full_name,
            passwordHash=user.password,
        )
        return user
```

- [ ] **Step 3: Update `TeacherProfileUpdateController` in `users/views.py`**

In `neuropath-backend/users/views.py`:
- Use `validate_password` instead of `len(password) < 6`.
- Save `old_email = user.email` before changing `user.email` to correctly sync `Teacher` row.

```python
        if password:
            try:
                validate_password(password, user=user)
            except DjangoValidationError as exc:
                errors["password"] = list(exc.messages)

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Check email uniqueness (exclude the current user and teacher)
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists() or \
           Teacher.objects.filter(email__iexact=email).exclude(email__iexact=user.email).exists():
            return Response(
                {"errors": {"email": "This email is already in use."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_email = user.email

        # Update the Django User row
        user.first_name = first_name
        user.last_name  = last_name
        user.email      = email
        user.username   = email
        if password:
            user.set_password(password)
        user.save()

        # Keep the Teacher mirror-row in sync
        from .models import Teacher
        Teacher.objects.filter(email__iexact=old_email).update(
            name=f"{first_name} {last_name}".strip(),
            email=email,
        )
```

- [ ] **Step 4: Verify with `ruff check .` and tests**

Run:
```bash
ruff check neuropath-backend/
python neuropath-backend/manage.py check
```

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/users/serializers.py neuropath-backend/users/views.py neuropath-backend/users/tests.py
git commit -m "feat(users): enforce password strength validators and email uniqueness"
```

---

## Task 3: Comprehensive Test Suite & Schema Verification

Verify that all tests, linter, and database migration checks pass without regression.

**Files:**
- Modify: `neuropath-backend/users/tests.py`

**Interfaces:**
- Verifies registration, profile update, tenant isolation, and security constraints.

- [ ] **Step 1: Add profile update password validation test**

In `neuropath-backend/users/tests.py`, add test checking weak password rejection in `TeacherProfileUpdateFieldRulesTests`:

```python
    def test_profile_update_rejects_weak_password(self):
        self._authenticate()
        response = self.client.patch(
            self.url,
            {
                "first_name": "Owner",
                "last_name": "One",
                "email": self.owner.email,
                "password": "123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data["errors"])
```

- [ ] **Step 2: Run linter and verify migrations**

Run:
```bash
ruff check neuropath-backend/
python neuropath-backend/manage.py makemigrations --check
```

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/users/tests.py
git commit -m "test(users): add full test coverage for password validation and duplicate email rejection"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-21-issue-67-remove-hardcoded-secrets.md`.
Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.
