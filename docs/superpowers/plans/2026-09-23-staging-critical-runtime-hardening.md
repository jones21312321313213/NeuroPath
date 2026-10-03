# Staging Critical Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate single-threaded process blocking, missing static asset rendering, reverse-proxy SSL misconfigurations, and frontend build-time fallback vulnerabilities to ensure a flawless and stable staging deployment for NeuroPath.

**Architecture:** 
1. Replace development `runserver` in the backend container with `gunicorn` configured with multi-worker threads and a 120-second timeout to accommodate long-running AI fallbacks (Gemini $\rightarrow$ Groq $\rightarrow$ OpenRouter) without worker termination or request locking.
2. Integrate `whitenoise` into Django's middleware and storage pipeline so Django Admin and DRF browsable UI static assets are automatically compressed, hashed, and served directly when `DEBUG=False`.
3. Configure `SECURE_PROXY_SSL_HEADER`, `SESSION_COOKIE_SECURE`, and `CSRF_COOKIE_SECURE` in `settings.py` to prevent CSRF origin mismatches and HTTPS-to-HTTP redirect loops behind staging reverse proxies (Nginx, Cloudflare, ALB).
4. Harden the frontend containerization and build configuration to guarantee `VITE_API_URL` is baked into production builds rather than falling back to `localhost:8000`.

**Tech Stack:** Python 3.12, Django 6.0, Gunicorn 23.0, WhiteNoise 6.8, Docker, Vite 8, React 19.

## Global Constraints
- Do not break local development workflow (`DEBUG=True` must continue working seamlessly with hot-reloading).
- Maintain 100% test pass rate across all 199 Django tests and 343 Vitest tests.
- Zero hardcoded secrets or credentials in any configuration or template file.
- Gunicorn timeout must be at least 120 seconds to prevent killing worker processes during multi-tier LLM cascade calls.

---

### Task 1: Production WSGI Server (Gunicorn) with AI Timeout Configuration

**Files:**
- Modify: `neuropath-backend/requirements.txt`
- Modify: `neuropath-backend/entrypoint.sh`
- Modify: `docker-compose.yml:22-43`
- Create: `neuropath-backend/users/tests/test_wsgi_config.py`

**Interfaces:**
- Consumes: `neuropath_core.wsgi:application`
- Produces: Multi-worker WSGI entrypoint with concurrency and 120s worker timeout

- [ ] **Step 1: Write tests for WSGI application import and settings validation**

Create `neuropath-backend/users/tests/test_wsgi_config.py`:
```python
import importlib
from django.test import SimpleTestCase
from django.conf import settings


class WSGIConfigurationTest(SimpleTestCase):
    def test_wsgi_application_is_importable(self):
        """Verify neuropath_core.wsgi.application can be cleanly loaded by Gunicorn."""
        mod = importlib.import_module("neuropath_core.wsgi")
        self.assertTrue(hasattr(mod, "application"))
        self.assertIsNotNone(mod.application)

    def test_wsgi_setting_matches_module(self):
        """Verify WSGI_APPLICATION setting matches actual callable path."""
        self.assertEqual(settings.WSGI_APPLICATION, "neuropath_core.wsgi.application")
```

- [ ] **Step 2: Run test to verify it passes against current WSGI module**

Run:
```bash
python manage.py test users.tests.test_wsgi_config -v 2
```
Expected: PASS (2 tests passed)

- [ ] **Step 3: Add `gunicorn` to `neuropath-backend/requirements.txt`**

Append `gunicorn==23.0.0` to `neuropath-backend/requirements.txt`:
```text
gunicorn==23.0.0
```

- [ ] **Step 4: Update `neuropath-backend/entrypoint.sh` for production WSGI server execution**

Update `neuropath-backend/entrypoint.sh` to branch based on `DEBUG`:
```bash
#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

if [ "$DEBUG" = "True" ] || [ "$DEBUG" = "1" ] || [ "$DEBUG" = "true" ]; then
    echo "Starting Django development server (DEBUG=True)..."
    exec python manage.py runserver 0.0.0.0:8000
else
    echo "Collecting static files for production..."
    python manage.py collectstatic --noinput

    echo "Starting Gunicorn production WSGI server..."
    exec gunicorn neuropath_core.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers ${GUNICORN_WORKERS:-3} \
        --threads ${GUNICORN_THREADS:-2} \
        --timeout ${GUNICORN_TIMEOUT:-120} \
        --access-logfile - \
        --error-logfile -
fi
```

- [ ] **Step 5: Verify requirements and entrypoint syntax**

Run:
```bash
python -m py_compile neuropath-backend/neuropath_core/wsgi.py
bash -n neuropath-backend/entrypoint.sh
```
Expected: Clean compilation, no syntax errors.

- [ ] **Step 6: Commit Task 1 changes**

```bash
git add neuropath-backend/requirements.txt neuropath-backend/entrypoint.sh neuropath-backend/users/tests/test_wsgi_config.py
git commit -m "feat(backend): configure gunicorn wsgi server with 120s ai worker timeout"
```

---

### Task 2: Static Asset Serving via WhiteNoise for `DEBUG=False`

**Files:**
- Modify: `neuropath-backend/requirements.txt`
- Modify: `neuropath-backend/neuropath_core/settings.py:60-70,140-142`
- Create: `neuropath-backend/users/tests/test_whitenoise_config.py`

**Interfaces:**
- Consumes: `STATIC_ROOT = BASE_DIR / 'staticfiles'`, `STATIC_URL = 'static/'`
- Produces: Direct static file serving through WSGI without external web server 404s

- [ ] **Step 1: Write test for WhiteNoise middleware and storage configuration**

Create `neuropath-backend/users/tests/test_whitenoise_config.py`:
```python
from django.test import SimpleTestCase
from django.conf import settings


class WhiteNoiseConfigurationTest(SimpleTestCase):
    def test_whitenoise_middleware_present_after_security(self):
        """WhiteNoiseMiddleware must be installed immediately after SecurityMiddleware."""
        middleware = list(settings.MIDDLEWARE)
        self.assertIn("whitenoise.middleware.WhiteNoiseMiddleware", middleware)
        sec_idx = middleware.index("django.middleware.security.SecurityMiddleware")
        wn_idx = middleware.index("whitenoise.middleware.WhiteNoiseMiddleware")
        self.assertEqual(wn_idx, sec_idx + 1)

    def test_static_root_and_url_configured(self):
        """STATIC_ROOT and STATIC_URL must be defined for collectstatic."""
        self.assertTrue(bool(settings.STATIC_ROOT))
        self.assertEqual(settings.STATIC_URL, "static/")
```

- [ ] **Step 2: Run test to verify it fails before modification**

Run:
```bash
python manage.py test users.tests.test_whitenoise_config -v 2
```
Expected: FAIL with `AssertionError: 'whitenoise.middleware.WhiteNoiseMiddleware' not found in [...]`

- [ ] **Step 3: Add `whitenoise` to `neuropath-backend/requirements.txt`**

Append `whitenoise==6.8.2` to `neuropath-backend/requirements.txt`:
```text
whitenoise==6.8.2
```

- [ ] **Step 4: Configure WhiteNoise in `neuropath-backend/neuropath_core/settings.py`**

In `neuropath-backend/neuropath_core/settings.py`:
1. Add `'whitenoise.middleware.WhiteNoiseMiddleware'` to `MIDDLEWARE` directly after `'django.middleware.security.SecurityMiddleware'`:
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```
2. Configure `STORAGES` right below `STATIC_ROOT`:
```python
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
```

- [ ] **Step 5: Run tests and collectstatic to verify pass**

Run:
```bash
python manage.py test users.tests.test_whitenoise_config -v 2
python manage.py collectstatic --noinput --dry-run
```
Expected: PASS (2 tests pass, dry-run collectstatic succeeds without error).

- [ ] **Step 6: Commit Task 2 changes**

```bash
git add neuropath-backend/requirements.txt neuropath-backend/neuropath_core/settings.py neuropath-backend/users/tests/test_whitenoise_config.py
git commit -m "feat(backend): configure whitenoise for production static asset serving"
```

---

### Task 3: Reverse Proxy SSL & Security Header Configuration

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py:160-175`
- Modify: `neuropath-backend/.env.staging.example`
- Create: `neuropath-backend/users/tests/test_security_headers.py`

**Interfaces:**
- Consumes: Inbound `X-Forwarded-Proto` header from Nginx/Cloudflare/ALB
- Produces: Correct HTTPS scheme detection, secure cookie flags, and CSRF protection in staging

- [ ] **Step 1: Write test for staging security settings**

Create `neuropath-backend/users/tests/test_security_headers.py`:
```python
from django.test import TestCase, override_settings
from django.conf import settings


class SecurityHeadersConfigurationTest(TestCase):
    def test_default_development_cookie_security(self):
        """In development (DEBUG=True), cookies do not require HTTPS so local dev works."""
        if settings.DEBUG:
            self.assertFalse(settings.SESSION_COOKIE_SECURE)
            self.assertFalse(settings.CSRF_COOKIE_SECURE)

    def test_proxy_ssl_header_defined(self):
        """SECURE_PROXY_SSL_HEADER must be configured to recognize reverse-proxy SSL termination."""
        self.assertEqual(
            settings.SECURE_PROXY_SSL_HEADER,
            ('HTTP_X_FORWARDED_PROTO', 'https')
        )
```

- [ ] **Step 2: Run test to verify it fails before modification**

Run:
```bash
python manage.py test users.tests.test_security_headers -v 2
```
Expected: FAIL with `AttributeError: 'Settings' object has no attribute 'SECURE_PROXY_SSL_HEADER'`

- [ ] **Step 3: Update `neuropath-backend/neuropath_core/settings.py`**

Add reverse proxy and cookie security settings after CORS/CSRF settings in `neuropath-backend/neuropath_core/settings.py`:
```python
# ── SSL & REVERSE PROXY SETTINGS ──────────────────────────
# Staging and production reverse proxies terminate SSL and forward HTTP.
# This informs Django to recognize the forwarded protocol as HTTPS.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
```

- [ ] **Step 4: Update `neuropath-backend/.env.staging.example`**

Add documentation for `SECURE_SSL_REDIRECT` in `neuropath-backend/.env.staging.example`:
```ini
# Optional: Set to True if the reverse proxy does not already enforce HTTPS redirection
SECURE_SSL_REDIRECT=False
```

- [ ] **Step 5: Run tests and deployment security check**

Run:
```bash
python manage.py test users.tests.test_security_headers -v 2
```
Expected: PASS (2 tests pass).

- [ ] **Step 6: Commit Task 3 changes**

```bash
git add neuropath-backend/neuropath_core/settings.py neuropath-backend/.env.staging.example neuropath-backend/users/tests/test_security_headers.py
git commit -m "feat(security): configure reverse proxy ssl header and secure cookie flags"
```

---

### Task 4: Frontend Production Containerization & Build-Time URL Baking

**Files:**
- Modify: `neuropath-frontend/Dockerfile`
- Modify: `neuropath-frontend/.env.staging.example`
- Modify: `docker-compose.yml:44-57`
- Test: Build verification with explicit `VITE_API_URL`

**Interfaces:**
- Consumes: `VITE_API_URL` build argument / environment variable
- Produces: Verified production build artifact serving without localhost fallback

- [ ] **Step 1: Test frontend build with explicit staging API URL**

Run:
```bash
cd neuropath-frontend
$env:VITE_API_URL="https://staging-api.neuropath.app/api"
npm run build
```
Verify `dist/assets/index-*.js` contains `https://staging-api.neuropath.app/api` and does not fall back to `localhost:8000`.

- [ ] **Step 2: Update `neuropath-frontend/Dockerfile` to support multi-stage production build**

Update `neuropath-frontend/Dockerfile` to allow either dev server (default) or production build:
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Optional production stage for static serving via Nginx
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Update `docker-compose.yml` to pass `VITE_API_URL` as build arg and env**

In `docker-compose.yml`:
```yaml
  frontend:
    build:
      context: ./neuropath-frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:8000/api}
    container_name: neuropath_frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    env_file:
      - ./neuropath-frontend/.env
    volumes:
      - ./neuropath-frontend:/app
      - /app/node_modules
```

- [ ] **Step 4: Run full CI test suite locally**

Run:
```bash
python manage.py test
cd ../neuropath-frontend && npm test
```
Expected: 199+ backend tests PASS, 343 frontend tests PASS.

- [ ] **Step 5: Commit Task 4 changes**

```bash
git add neuropath-frontend/Dockerfile docker-compose.yml
git commit -m "feat(docker): add production build stage and parameterize vite api url"
```

---

## Plan Verification Checklist
1. **Spec Coverage:** Covers WSGI server concurrency (A.1), static file serving (A.2), reverse-proxy SSL termination (B.1), and frontend build URL baking (A.3).
2. **No Placeholders:** All commands, test cases, code diffs, and settings are fully articulated.
3. **Clean Teardown:** Local development (`DEBUG=True`) preserves `runserver` and hot-reloading.
