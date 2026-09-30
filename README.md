<div align="center">

# 🧠 NeuroPath

**AI-Driven Adaptive Individualized Education Plan Generation and Instructional Support System**

*For Special Education Teachers Handling Elementary Students with Autism Spectrum Disorder in Region VII*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)

[Mission Overview](#-mission-overview) •
[System Architecture](#-system-architecture) •
[Tech Stack](#%EF%B8%8F-tech-stack) •
[Modules](#-system-modules) •
[Getting Started](#-getting-started) •
[Environment Variables](#-environment-variables) •
[Documentation](#-documentation) •
[Research Context](#-research-context) •
[License](#-license)

---

> *"IEP quality alone accounts for up to 25% of the variance in a student's actual outcomes."*
> — Ruble & McGrew, 2013

</div>

---

## 🛰️ Mission Overview

**NeuroPath** is a web-based, AI-powered platform engineered for special education (SPED) teachers handling elementary students with Autism Spectrum Disorder (ASD). It addresses a long-standing and critical problem in Philippine special education: the historical conflation of **procedural compliance** with **pedagogical efficacy** in IEP documentation.

Traditional educational technology treats an IEP as "complete" once required text fields are filled and signed. NeuroPath replaces this binary toggle with a **transactional, multi-layered Completeness and Quality Algorithm** — enforcing strict pedagogical thresholds at 20%, 59%, 80%, and 100% — to ensure every generated plan is not just formally complete, but genuinely useful for real-world instruction.

The system is designed to unify three critical workflows into one intelligent platform:

- **Teacher Competency Support** — Structured guidance through baseline data collection and PLAAFP formulation
- **Legally Defensible IEP Generation** — AI-driven goal creation validated against the R-GORI framework, targeting ≥ 65% expert compliance
- **Automated Instructional Translation** — Goals are automatically converted into localized lesson plans, visual aids, and classroom strategies

---

## 🏗️ System Architecture

Below is the complete structural schematic for the NeuroPath Django backend and the React frontend interface.

```text
📦 NeuroPath
│
├── 📂 neuropath-backend                        # Mission Control (Django Backend)
│   ├── 📄 .env.example                         # Environment variables template
│   ├── 📄 manage.py                            # Django management entry point
│   ├── 📄 requirements.txt                     # Production Python dependencies
│   ├── 📄 requirements-dev.txt                 # Development & test dependencies
│   │
│   ├── 📂 neuropath_core                       # Django project configuration & core settings
│   │   ├── 📄 settings.py                      # Core Django & PostgreSQL/Supabase config
│   │   ├── 📄 urls.py                          # Root URL dispatcher
│   │   ├── 📄 wsgi.py                          # WSGI entry point (production)
│   │   └── 📄 asgi.py                          # ASGI entry point (async support)
│   │
│   ├── 📂 users                                # Teacher authentication & user management
│   │   ├── 📄 models.py                        # Custom User model & Teacher profile
│   │   ├── 📄 serializers.py                   # Auth serializers & profile validation
│   │   ├── 📄 views.py                         # Registration, login, profile management
│   │   └── 📄 urls.py                          # Auth endpoints (/api/auth/)
│   │
│   ├── 📂 iep_management                       # Module 1 & 2 — Student Profiling & IEP Generation
│   │   ├── 📄 models.py                        # Student, IEPDocument, IEPGoal models
│   │   ├── 📄 serializers.py                   # Student profile & IEP goal serializers
│   │   ├── 📄 views.py                         # Student CRUD & AI goal generation endpoints
│   │   ├── 📄 urls.py                          # Student & IEP endpoints (/api/students/, /api/iep/)
│   │   └── 📂 services                         # AI goal generation & R-GORI validation engine
│   │
│   ├── 📂 resources                            # Module 3 — Instructional Support
│   │   ├── 📄 models.py                        # LessonPlan, VisualAid, TeachingStrategy models
│   │   ├── 📄 serializers.py                   # Resource generation & directory serializers
│   │   ├── 📄 views.py                         # Lesson plan, visual aid, & strategy endpoints
│   │   ├── 📄 urls.py                          # Resource endpoints (/api/resources/)
│   │   └── 📂 services                         # AI resource generation services
│   │
│   └── 📂 tracking                             # Module 4 — Outcome Monitoring & Analytics
│       ├── 📄 models.py                        # ProgressLog, BehavioralTally, Milestone models
│       ├── 📄 serializers.py                   # Progress tracking & analytics serializers
│       ├── 📄 views.py                         # Analytics dashboard & outcome monitoring views
│       ├── 📄 urls.py                          # Tracking endpoints (/api/tracking/)
│       └── 📂 services                         # Progress analytics & milestone services
│
└── 📂 neuropath-frontend                       # Flight Interface (React + Vite Frontend)
    ├── 📄 package.json                         # Node dependencies & build scripts
    ├── 📄 vite.config.js                       # Vite bundler configuration
    ├── 📄 eslint.config.js                     # ESLint configuration
    │
    └── 📂 src
        ├── 📄 App.jsx                          # Root router & layout component
        ├── 📄 main.jsx                         # Application mount entry point
        ├── 📄 index.css                        # Global design tokens & styling
        │
        ├── 📂 api                              # Centralized API client modules
        │   └── 📄 client.js                    # Unified REST client with interceptors
        ├── 📂 components                       # Reusable UI widgets & layout elements
        │   ├── 📄 Sidebar.jsx                  # Navigation sidebar
        │   └── 📄 ProtectedRoute.jsx           # Auth-guarded routes
        ├── 📂 context                          # Application state (AuthContext, etc.)
        ├── 📂 hooks                            # Custom React hooks
        ├── 📂 pages                            # Route-level views
        │   ├── 📄 DashboardPage.jsx            # Module 4 — Analytics overview
        │   ├── 📄 StudentProfileForm.jsx       # Module 1 — Student data entry
        │   ├── 📄 ViewStudentRecords.jsx       # Module 1 — Student records directory
        │   ├── 📄 IEPGoalsForm.jsx             # Module 2 — AI goal generation & scoring
        │   ├── 📄 GenerateLessonPlan.jsx       # Module 3 — Lesson plan generation
        │   ├── 📄 GenerateVisualAids.jsx       # Module 3 — Visual aid card generator
        │   ├── 📄 TeachingStrategiesDirectory.jsx # Module 3 — Teaching strategies
        │   ├── 📄 ViewProgressDashboard.jsx    # Module 4 — Progress analytics charts
        │   └── 📄 UserProfilePage.jsx          # Teacher profile & settings
        ├── 📂 styles                           # Modular CSS stylesheets
        └── 📂 test                             # Vitest test helpers & mocks
```

---

## ⚙️ Tech Stack

NeuroPath operates on a Python/Django backend with a React frontend, backed by a Supabase-hosted PostgreSQL database.

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React + Vite | Responsive UI with fast hot-module replacement |
| **Routing** | React Router v6 | Client-side navigation & protected routes |
| **State Management** | React Context + Custom Hooks | Auth state, student data, IEP generation state |
| **UI Components** | Custom CSS / Tailwind CSS | Component styling & responsive layout |
| **Charts & Analytics** | Recharts / Chart.js | Progress dashboards & goal attainment visualization |
| **Backend Framework** | Django + Django REST Framework (DRF) | RESTful API server & business logic |
| **Database** | PostgreSQL (via Supabase) | Relational storage for users, students, IEPs, and progress logs |
| **Database Host** | Supabase | Managed PostgreSQL instance |
| **ORM** | Django ORM | Database abstraction & migration management |
| **Authentication** | Django REST Framework TokenAuthentication (`rest_framework.authtoken`) + bcrypt | Secure teacher authentication & session management |
| **AI Engine** | Groq / Hugging Face / Ollama / Pollinations | Adaptive goal, lesson plan & visual aid generation |
| **Validation** | Custom R-GORI Scoring Engine | Automated pedagogical compliance checking at ≥ 65% threshold |
| **PDF Generation** | ReportLab / WeasyPrint | Printable IEP documents, lesson plans & visual aids |
| **Security** | Django Security Middleware + django-cors-headers | CSRF protection, secure headers & CORS policy |
| **Environment** | python-decouple / django-environ | Secure credential & configuration management |

---

## 🧩 System Modules

NeuroPath is built around four sequentially dependent modules, each corresponding to a sprint in the Agile development methodology.

### Module 1 — Student Profiling
> *Standardizes PLAAFP data collection into a structured, AI-ready format*

The foundation of every IEP is an accurate baseline. This module provides a structured web-based form that enforces objective data entry across behavioral, cognitive, and communication domains. Automatic formatting validation flags incomplete or subjective entries, keeping formatting errors at **≤ 5%** before data is passed to the AI engine.

**Key capabilities:**
- Structured PLAAFP data entry across all required assessment domains
- Auto-validation of required fields before IEP generation is unlocked
- Anonymized student profiles for data privacy compliance

---

### Module 2 — IEP Generation
> *Produces adaptive IEP goals aligned with R-GORI expert standards*

The core intelligence layer. Using the structured PLAAFP data from Module 1, the AI engine generates specific short-term and long-term goals. A custom **Completeness and Quality Algorithm** then evaluates each goal against four thresholds — **20%, 59%, 80%, and 100%** — enforcing SMART criteria and R-GORI compliance before the document can be finalized. The target compliance rate is **≥ 65% R-GORI expert agreement** validated through blind peer review.

**Key capabilities:**
- AI-generated goal drafts grounded in the student's individual PLAAFP data
- Real-time pedagogical quality scoring with threshold-gated document finalization
- Standardized, legally defensible IEP document output

---

### Module 3 — Instructional Support
> *Translates validated IEP goals into localized, print-ready classroom resources*

Once an IEP is finalized, the system automatically extracts goal parameters and populates adaptive lesson plan templates, targeting a **≥ 95% data integration and formatting success rate**. Additionally, culturally localized visual aids (picture cards and similar supports) are programmatically generated for immediate classroom use. Generalization gap mitigation strategies are also recommended to bridge documented goals with real-world application.

**Key capabilities:**
- Automated lesson plan template population from finalized IEP goals
- Ready-to-print, culturally localized visual aids and picture cards
- Real-world generalization strategy recommendations per goal

---

### Module 4 — Outcome Monitoring & Security
> *Tracks student progress, enforces privacy, and evaluates system adoption*

A secure, web-based database module that aggregates daily behavioral tallies and renders them into visual learning analytics dashboards, enabling teachers to monitor student progress toward IEP goals in real time. Data access accuracy is targeted at **≥ 85%**, and the system targets a **System Usability Scale (SUS) score of ≥ 70** in preliminary testing with SPED teachers.

**Key capabilities:**
- Progress dashboards with visual goal attainment forecasting
- Multi-version Student Records viewing and printing: choose independent IEP versions for Section B (Difficulties & Accommodations) and Section C (Learner Goals) for preview and official PDF export
- Secure data access with standard cryptographic protocols (DRF TokenAuthentication + bcrypt)
- SUS-validated usability interface
- Role-based access control (teacher, administrator)

---

## 🚀 Getting Started

Follow these steps to deploy a local instance of NeuroPath on your machine.

### Prerequisites

Ensure your local environment has the following:

- **Python** (v3.11 or higher) and **pip**
- **Node.js** (v18.0.0 or higher) and **npm**
- **Supabase Account** with a project set up (free tier works)
- **OpenAI API Key** with access to GPT-4o or GPT-4-turbo
- A modern browser (Chrome, Firefox, Edge)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/NeuroPath.git
cd NeuroPath
```

---

### 2. Backend Setup (Django)

Open a terminal and navigate to the backend directory:

```bash
cd neuropath-backend
```

Create and activate a virtual environment:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `neuropath-backend/` (see [Environment Variables](#-environment-variables) below for the full reference):

```bash
cp .env.example .env
# Then fill in your values
```

Run database migrations against your Supabase PostgreSQL instance:

```bash
python manage.py migrate
```

Create a superuser (admin account):

```bash
python manage.py createsuperuser
```

Start the Django development server:

```bash
# Development
python manage.py runserver

# The API will be running at http://localhost:8000
```

#### Running Tests

NeuroPath has comprehensive backend and frontend test suites.

**Backend Tests (Django):**
```bash
cd neuropath-backend

# Standard test run (CI-compatible, non-interactive)
python manage.py test --noinput

# Fast iterative testing (preserves test database between runs)
python manage.py test --noinput --keepdb

# Fast local testing with SQLite (no local PostgreSQL service required):
# Windows PowerShell:
$env:DB_ENGINE='django.db.backends.sqlite3'; $env:DB_NAME='test_db.sqlite3'; python manage.py test --noinput --keepdb

# macOS / Linux:
DB_ENGINE=django.db.backends.sqlite3 DB_NAME=test_db.sqlite3 python manage.py test --noinput --keepdb
```
> **Note on AI Services:** AI generation services (Groq, Hugging Face, Pollinations) are mocked or provide deterministic fallbacks in the test suite, allowing fast, offline, and quota-free automated test execution.

**Frontend Tests (Vitest):**
```bash
cd neuropath-frontend

# Run all Vitest suites
npm test -- --run

# Run ESLint check
npm run lint
```

---

### 3. Frontend Setup (React)

Open a **second terminal** and navigate to the frontend directory:

```bash
cd neuropath-frontend
npm install
```

Create a `.env` file in the `neuropath-frontend/` directory:

```bash
cp .env.example .env
# Fill in your VITE_ prefixed variables
```

Launch the Vite development server:

```bash
npm run dev
```

---

### 4. Liftoff 🌍

Open your browser and navigate to **`http://localhost:5173/`**

Register a teacher account, create a student profile, input your PLAAFP observations, and let NeuroPath generate your first adaptive IEP.

> The Django admin panel is accessible at **`http://localhost:8000/admin/`** using your superuser credentials.

---

## 🔐 Environment Variables

NeuroPath uses separate `.env` files for the backend and frontend. **Never commit either file to version control.** Both are covered by `.gitignore`.

---

### Backend — `neuropath-backend/.env`

```env
# ───────────────────────────────────────────
# DJANGO CORE
# ───────────────────────────────────────────
SECRET_KEY=your-secret-key-here
DEBUG=True

# ───────────────────────────────────────────
# DATABASE (PostgreSQL / Supabase)
# ───────────────────────────────────────────
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=db.<your-supabase-project-ref>.supabase.co
DB_PORT=5432

# ───────────────────────────────────────────
# HOSTS & ORIGINS
# ───────────────────────────────────────────
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173

# ───────────────────────────────────────────
# AI SERVICES
# ───────────────────────────────────────────
HF_TOKEN=your-huggingface-token
GROQ_API_KEY=your-groq-api-key
OLLAMA_HOST=http://localhost:11434
```

---

### Frontend — `neuropath-frontend/.env`

```env
# ───────────────────────────────────────────
# API
# ───────────────────────────────────────────
VITE_API_URL=http://localhost:8000/api

# ───────────────────────────────────────────
# FEATURE FLAGS
# ───────────────────────────────────────────
VITE_ENABLE_PDF_EXPORT=true
VITE_ENABLE_VISUAL_AIDS=true
VITE_ENABLE_ANALYTICS_DASHBOARD=true
```

> ⚠️ **Security Note:** Never expose backend secrets such as `DB_PASSWORD`, `HF_TOKEN`, or `GROQ_API_KEY` to the frontend. All sensitive keys must live exclusively in the backend `.env` file and be accessed only server-side.

---

## 📚 Documentation

Full technical documentation for NeuroPath is maintained in the `/docs` directory and linked below. *Documents will be available once finalized.*

| Document | Description | Status |
|---|---|---|
| [📄 Software Requirements Specification (SRS)](./docs/SRS.md) | Complete functional and non-functional requirements, use case diagrams, and data flow specifications | 🔜 Coming Soon |
| [📄 Software Design Document (SDD)](./docs/SDD.md) | System architecture, database schema, API endpoint reference, and UI wireframes | 🔜 Coming Soon |
| [📄 R-GORI Compliance Guide](./docs/RGORI_Guide.md) | Explanation of the R-GORI pedagogical framework and how NeuroPath's validation engine applies it | 🔜 Coming Soon |
| [📄 Completeness Algorithm Reference](./docs/CompletenessAlgorithm.md) | Technical specification of the 20/59/80/100% threshold quality engine | 🔜 Coming Soon |
| [📄 API Reference](./docs/API.md) | Full DRF API endpoint documentation with request/response schemas | 🔜 Coming Soon |

---

## 🔬 Research Context

NeuroPath is developed as part of a Capstone/Software Engineering project and is grounded in peer-reviewed literature on special education, AI-assisted intervention, and IEP quality frameworks.

**Team Code:** `cs342-14`

**Target Users:** Elementary-level SPED teachers in Region VII, Philippines

**Core Research Questions this system addresses:**

1. To what extent does an AI-driven quality assurance engine improve the alignment of generated IEP goals with expert pedagogical standards, specifically targeting ≥ 65% compliance on the R-GORI framework?
2. To what extent does the instructional support module improve time efficiency in daily lesson planning, targeting a reduction of at least 20% compared to current manual methods?
3. To what extent does the web-based learning analytics module provide a clear visualization of student progress toward identified IEP goals?
4. How effectively does the system maintain data security and accessibility, and what is the initial system usability as measured by the SUS?

**Evaluation Methodology:**

| Metric | Method | Target |
|---|---|---|
| IEP Pedagogical Quality | Blind peer review (R-GORI) | ≥ 65% expert agreement |
| PLAAFP Formatting Accuracy | Automated validation error rate | ≤ 5% error rate |
| Lesson Plan Integration | Data formatting success rate | ≥ 95% |
| Data Retrieval Accuracy | API integration testing | ≥ 85% |
| System Usability | System Usability Scale (SUS) | ≥ 70 |
| Lesson Planning Time Reduction | Pre/post teacher comparison | ≥ 20% reduction |

---

## 🗺️ Roadmap

- [x] Project scaffolding & repository setup
- [x] Module 1 — Student Profiling & PLAAFP Form (Sprint 1 - Complete)
- [x] Module 2 — AI-Driven IEP Generation & R-GORI Validator (Sprint 2 - Complete)
- [x] Module 3 — Lesson Plans, Visual Aids & Generalization Tools (Sprint 3 - Complete)
- [x] Module 4 — Progress Dashboard, Multi-Tenant Security & Analytics (Sprint 4 - Complete)
- [x] Multi-tenant teacher data isolation & backend authentication hardening
- [x] Client reliability, deduplicated API queries & dual ID parameter compatibility
- [ ] Pilot testing with Region VII SPED teachers
- [ ] Production deployment

---

## 🤝 Contributing

This is an academic Capstone project. Contributions, code reviews, and issue reports from collaborators and advisers are welcome.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the existing code style and include relevant test coverage for any new features.

---

<div align="center">

**NeuroPath** — *Bridging the Gap Between Documentation and Genuine Learning*

Built with purpose for Philippine SPED educators and the students they champion. 🇵🇭

Team `cs342-14`

</div>
