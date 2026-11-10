# 🐍 NeuroPath Backend (Django REST Framework)

The core API server and pedagogical AI engine for **NeuroPath** — an AI-driven adaptive IEP generation and instructional support system for elementary Special Education (SPED) teachers in Region VII, Philippines.

[![Django 6](https://img.shields.io/badge/Django-6.0-092E20?style=flat&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.17-red?style=flat&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Ruff](https://img.shields.io/badge/Linter-Ruff-orange?style=flat)](https://docs.astral.sh/ruff/)
[![RA 10173 Compliant](https://img.shields.io/badge/Compliance-RA%2010173%20AES--256-green?style=flat)](https://www.privacy.gov.ph/data-privacy-act/)

---

## 🛠️ Quick Start

```powershell
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows
# source venv/bin/activate    # On macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment variables
cp .env.example .env
# Edit .env and configure your Supabase DB, Gemini/Groq keys, and Fernet encryption key

# 4. Run migrations and start server
python manage.py migrate
python manage.py runserver
# Running at http://localhost:8000
```

---

## 🧪 Development, Testing & Migration Scripts

| Command | Action |
| :--- | :--- |
| `python manage.py test -v 2` | Runs all Django unit test suites |
| `python manage.py test iep_management -v 2` | Runs tests for a specific app |
| `python -m ruff check .` | Runs Ruff linter checks across all Python files |
| `python -m ruff check --fix .` | Automatically fixes safe Python formatting issues |
| `python manage.py check` | Verifies Django system settings and model integrity |
| `python manage.py check --deploy` | Inspects production security flags (HSTS, SSL, CSRF) |
| `python manage.py showmigrations` | Shows applied and unapplied migrations |
| `python manage.py makemigrations --dry-run --check` | Fails if uncreated model changes exist (CI check) |
| `python manage.py migrate` | Applies pending database migrations |
| `python manage.py reencrypt_student_pii` | Rotates AES-256 Fernet keys for student PII (RA 10173) |

---

## 🏗️ Django Applications

```text
neuropath-backend/
├── neuropath_core/   # Core settings, WSGI/ASGI, URLs, & /api/health/ keepalive
├── users/            # Teacher auth, StudentProfile with AES-256 Fernet PII, RA 10173 consent
├── iep_management/   # IEP generation, Section B & C models, R-GORI scoring engine, AI failover
├── resources/        # Lesson plans, 3-step visual aids (Pollinations.ai), teaching strategies
└── tracking/         # StudentProgress, behavioral tallies, Recharts analytics, & activity logs
```

For complete system architecture, deployment details, and frontend configuration, refer to the [Root README.md](../README.md).
