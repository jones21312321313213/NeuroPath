# Production Deployment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform NeuroPath from a local development configuration into a hardened, production-ready system with Gunicorn WSGI process supervision, WhiteNoise static asset delivery, production SSL reverse-proxy security headers, multi-stage Nginx frontend containerization, cloud database connection pooling, and health check monitoring.

**Architecture:** 
1. **Backend**: Django is hardened with `gunicorn` WSGI workers, `whitenoise` compressed static asset delivery, dynamic `DATABASE_URL` parsing with SSL enforcement, automated production security headers via `check --deploy`, structured logging, and an unauthenticated `/api/health/` liveness endpoint.
2. **Frontend**: Vite SPA is compiled into static assets and served via an alpine Nginx multi-stage container with client-side routing fallback (`try_files`), long-term caching (`immutable`), and build-time `VITE_API_URL` injection.
3. **Orchestration**: A production-grade `docker-compose.prod.yml` and `.env.production.example` orchestrate health checks, restart policies, and network isolation without exposing dev servers.

**Tech Stack:** Python 3.12, Django 6.0+, Gunicorn 23.0+, WhiteNoise 6.8+, PostgreSQL 15, Node 20, Vite 8, Nginx Alpine, Docker.

## Global Constraints

- Never use `python manage.py runserver` or `npm run dev` in production or staging containers.
- Zero secret leakage: No hardcoded credentials or keys in tracked files; all secrets injected via environment variables.
- Maintain 100% backward compatibility with existing tests; Vitest (539 tests) and Django tests (64+ tests) must remain green.
- Django `python manage.py check --deploy` must exit with 0 warnings when `DEBUG=False`.
- Nginx must support client-side HTML5 History API routing (direct URLs to `/dashboard/iep` must not 404).

---

### Task 1: Backend Production Dependencies (`gunicorn` & `whitenoise`)

**Files:**
- Modify: `neuropath-backend/requirements.txt`

**Interfaces:**
- Consumes: Existing Python dependencies in `requirements.txt`.
- Produces: `gunicorn` package for WSGI serving and `whitenoise` for static asset compression.

- [ ] **Step 1: Add gunicorn and whitenoise to requirements.txt**

Append `gunicorn==23.0.0` and `whitenoise==6.8.2` to `neuropath-backend/requirements.txt`:

```text
asgiref==3.11.1
certifi==2026.5.20
charset-normalizer==3.4.7
Django==6.0.5
django-cors-headers==4.9.0
django-environ==0.13.0
djangorestframework==3.17.1
idna==3.16
psycopg2-binary==2.9.12
requests==2.34.2
sqlparse==0.5.5
tzdata==2026.2
urllib3==2.7.0
ollama==0.6.2
reportlab==4.4.1
pypdf==5.7.0
huggingface-hub>=0.20.0
Pillow>=10.0.0
gunicorn==23.0.0
whitenoise==6.8.2
```

- [ ] **Step 2: Verify package installation**

Run: `pip install -r neuropath-backend/requirements.txt`
Expected: Successfully installed gunicorn and whitenoise (or requirement already satisfied).

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/requirements.txt
git commit -m "build(backend): add gunicorn and whitenoise for production WSGI and static serving"
```

---

### Task 2: Static Asset Pipeline & WhiteNoise Middleware

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py`

**Interfaces:**
- Consumes: `whitenoise` package.
- Produces: Static file handling for admin and API UI when `DEBUG=False`.

- [ ] **Step 1: Configure WhiteNoise middleware and storages in settings.py**

In `neuropath-backend/neuropath_core/settings.py`:
1. Insert `whitenoise.middleware.WhiteNoiseMiddleware` immediately after `django.middleware.security.SecurityMiddleware`.
2. Configure `STORAGES` dictionary for staticfiles with `whitenoise.storage.CompressedManifestStaticFilesStorage`.

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

# Static files (CSS, JavaScript, Images)
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

- [ ] **Step 2: Test collectstatic command**

Run: `python neuropath-backend/manage.py collectstatic --noinput`
Expected: Static files copied and post-processed into `neuropath-backend/staticfiles/` without error.

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/neuropath_core/settings.py
git commit -m "feat(backend): configure WhiteNoise middleware and compressed manifest static storage"
```

---

### Task 3: Production Security Hardening & SSL Reverse-Proxy Headers

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py`

**Interfaces:**
- Consumes: `DEBUG`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS` from environment variables.
- Produces: 0 warnings on `python manage.py check --deploy`.

- [ ] **Step 1: Write production security settings block**

In `neuropath-backend/neuropath_core/settings.py`, add conditional security configuration when `not DEBUG`:

```python
# ── Production Security Hardening ───────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # Essential when running behind AWS ALB, Cloudflare, Render, or Nginx reverse proxy:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

- [ ] **Step 2: Run deploy check to verify security settings**

Run: `python neuropath-backend/manage.py check --deploy`
Expected: 0 critical issues and 0 warnings (except when DEBUG=True locally, which is bypassed when DEBUG=False).

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/neuropath_core/settings.py
git commit -m "feat(security): enforce SSL redirect, secure cookies, and HSTS when DEBUG is False"
```

---

### Task 4: Database Connection Flexibility & Cloud SSL Mode

**Files:**
- Modify: `neuropath-backend/neuropath_core/settings.py`

**Interfaces:**
- Consumes: `DATABASE_URL` (optional) or `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- Produces: Standardized Django `DATABASES` dictionary compatible with Supabase, AWS RDS, Railway, and local Postgres.

- [ ] **Step 1: Update DATABASES configuration in settings.py**

In `neuropath-backend/neuropath_core/settings.py`:

```python
# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases
db_url = env('DATABASE_URL', default=None)
if db_url:
    DATABASES = {
        'default': env.db('DATABASE_URL')
    }
else:
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

# Require SSL connection when connecting to Supabase / cloud DBs in production
db_host = str(DATABASES['default'].get('HOST', ''))
if not DEBUG and ('supabase' in db_host or 'aws' in db_host or 'pooler' in db_host):
    DATABASES['default'].setdefault('OPTIONS', {})['sslmode'] = 'require'
```

- [ ] **Step 2: Run migrations check to verify database configuration**

Run: `python neuropath-backend/manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/neuropath_core/settings.py
git commit -m "feat(db): support DATABASE_URL connection string and automatic cloud SSL enforcement"
```

---

### Task 5: Lightweight Unauthenticated Health Check Endpoint

**Files:**
- Create: `neuropath-backend/neuropath_core/views.py`
- Modify: `neuropath-backend/neuropath_core/urls.py`
- Create: `neuropath-backend/neuropath_core/tests.py`

**Interfaces:**
- Consumes: HTTP GET `/api/health/`.
- Produces: HTTP 200 JSON `{"status": "ok", "app": "neuropath-backend"}` without hitting DB or requiring auth.

- [ ] **Step 1: Write the failing health check test**

Create `neuropath-backend/neuropath_core/tests.py`:

```python
from django.test import SimpleTestCase

class HealthCheckTests(SimpleTestCase):
    def test_health_check_returns_200_without_auth(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get('status'), 'ok')
        self.assertIn('app', response.json())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python neuropath-backend/manage.py test neuropath_core --keepdb`
Expected: FAIL with 404 Not Found.

- [ ] **Step 3: Implement health check view and wire URL**

Create `neuropath-backend/neuropath_core/views.py`:

```python
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny

def health_check(request):
    """Lightweight health check endpoint for container orchestrators and load balancers."""
    return JsonResponse({
        "status": "ok",
        "app": "neuropath-backend"
    })
```

In `neuropath-backend/neuropath_core/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include
from .views import health_check

urlpatterns = [
    path('api/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/iep/', include('iep_management.urls')),
    path('api/resources/', include('resources.urls')),
    path('api/tracking/', include('tracking.urls')),
    path('api-auth/', include('rest_framework.urls')),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python neuropath-backend/manage.py test neuropath_core --keepdb`
Expected: `Ran 1 test ... OK`.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/neuropath_core/views.py neuropath-backend/neuropath_core/urls.py neuropath-backend/neuropath_core/tests.py
git commit -m "feat(health): add lightweight unauthenticated /api/health/ endpoint"
```

---

### Task 6: Multi-Stage Production Frontend Container & Nginx

**Files:**
- Create: `neuropath-frontend/nginx.conf`
- Modify: `neuropath-frontend/Dockerfile`
- Create: `neuropath-frontend/Dockerfile.dev`

**Interfaces:**
- Consumes: Node 20 build stage with `ARG VITE_API_URL`.
- Produces: Nginx alpine image serving static assets on port 80 with SPA fallback.

- [ ] **Step 1: Create Nginx configuration file**

Create `neuropath-frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Vite hashed assets (immutable caching for 1 year)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # HTML5 History API fallback (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check for reverse proxy
    location = /healthz {
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}
```

- [ ] **Step 2: Create Dockerfile.dev for local hot-reload**

Create `neuropath-frontend/Dockerfile.dev`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 3: Refactor neuropath-frontend/Dockerfile to multi-stage production build**

In `neuropath-frontend/Dockerfile`:

```dockerfile
# Stage 1: Build Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build-time API URL argument (defaults to relative /api if behind same reverse proxy)
ARG VITE_API_URL="http://localhost:8000/api"
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: Serve compiled assets with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Verify frontend build compiles cleanly**

Run: `npm --prefix neuropath-frontend run build`
Expected: `✓ built in ...` with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/nginx.conf neuropath-frontend/Dockerfile neuropath-frontend/Dockerfile.dev
git commit -m "build(frontend): implement multi-stage production Dockerfile and Nginx SPA configuration"
```

---

### Task 7: Production Entrypoint Script & Gunicorn Supervisor

**Files:**
- Modify: `neuropath-backend/entrypoint.sh`
- Create: `neuropath-backend/entrypoint.dev.sh`

**Interfaces:**
- Consumes: Django management commands and environment variables (`GUNICORN_WORKERS`, `GUNICORN_THREADS`, `GUNICORN_TIMEOUT`).
- Produces: Supervised Gunicorn process listening on `0.0.0.0:8000`.

- [ ] **Step 1: Create entrypoint.dev.sh for local development**

Create `neuropath-backend/entrypoint.dev.sh`:

```bash
#!/bin/bash
set -e

echo "Running migrations (development)..."
python manage.py migrate

echo "Starting Django development server..."
exec python manage.py runserver 0.0.0.0:8000
```

- [ ] **Step 2: Update entrypoint.sh for production Gunicorn execution**

In `neuropath-backend/entrypoint.sh`:

```bash
#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files for WhiteNoise..."
python manage.py collectstatic --noinput

WORKERS=${GUNICORN_WORKERS:-3}
THREADS=${GUNICORN_THREADS:-2}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

echo "Starting Gunicorn WSGI server ($WORKERS workers, $THREADS threads, timeout ${TIMEOUT}s)..."
exec gunicorn neuropath_core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "$WORKERS" \
    --threads "$THREADS" \
    --timeout "$TIMEOUT" \
    --access-logfile - \
    --error-logfile -
```

- [ ] **Step 3: Commit**

```bash
git add neuropath-backend/entrypoint.sh neuropath-backend/entrypoint.dev.sh
git commit -m "feat(backend): configure entrypoint.sh to run migrations, collectstatic, and gunicorn"
```

---

### Task 8: Production Docker Compose & Environment Templates

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `neuropath-backend/.env.production.example`
- Create: `neuropath-frontend/.env.production.example`
- Modify: `docker-compose.yml` (point to dev Dockerfiles for zero local friction)

**Interfaces:**
- Consumes: `.env` and `.env.production` files.
- Produces: Self-contained production container stack with health checks.

- [ ] **Step 1: Create docker-compose.prod.yml**

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: ./neuropath-backend
      dockerfile: Dockerfile
    container_name: neuropath_backend_prod
    restart: always
    ports:
      - "8000:8000"
    env_file:
      - ./neuropath-backend/.env
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/')\""]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s

  frontend:
    build:
      context: ./neuropath-frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:8000/api}
    container_name: neuropath_frontend_prod
    restart: always
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
```

- [ ] **Step 2: Create production environment examples**

Create `neuropath-backend/.env.production.example`:

```env
DEBUG=False
SECRET_KEY=replace-with-a-cryptographically-secure-random-50-character-key
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Database Connection (Supabase, AWS RDS, or Pooled URL)
DATABASE_URL=postgres://user:password@db.supabase.co:5432/postgres

# AI Services
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=NeuroPath Support <noreply@yourdomain.com>
FRONTEND_URL=https://yourdomain.com
```

Create `neuropath-frontend/.env.production.example`:

```env
# Build-time API Base URL (must include /api, no trailing slash)
VITE_API_URL=https://api.yourdomain.com/api
```

- [ ] **Step 3: Update dev docker-compose.yml to reference Dockerfile.dev**

In `docker-compose.yml`, ensure the frontend service references `dockerfile: Dockerfile.dev` or the dev CMD so local contributors keep hot-reloading.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml docker-compose.yml neuropath-backend/.env.production.example neuropath-frontend/.env.production.example
git commit -m "chore(deploy): add docker-compose.prod.yml and production environment templates"
```

---

### Task 9: Final Deployment Verification & Smoke Testing

**Files:**
- Test: All frontend and backend suites.

**Interfaces:**
- Consumes: Test runners for Vitest and Django.
- Produces: 100% test pass rate with zero regression.

- [ ] **Step 1: Run complete backend test suite**

Run: `python neuropath-backend/manage.py test --keepdb`
Expected: All tests pass cleanly (`OK`).

- [ ] **Step 2: Run complete frontend test suite**

Run: `npm --prefix neuropath-frontend run test`
Expected: All 55 test files pass (539+ tests passing).

- [ ] **Step 3: Run ESLint**

Run: `npm --prefix neuropath-frontend run lint`
Expected: 0 errors and 0 warnings.

- [ ] **Step 4: Run Django deployment check**

Run: `python neuropath-backend/manage.py check --deploy`
Expected: 0 critical issues.

- [ ] **Step 5: Final branch verification and commit**

```bash
git status
git commit -m "docs: finalize deployment hardening implementation verification" --allow-empty
```
