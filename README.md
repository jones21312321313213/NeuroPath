<div align="center">

# 🧠 NeuroPath

**AI-Driven Adaptive Individualized Education Plan Generation and Instructional Support System**

*For Special Education Teachers Handling Elementary Students with Autism Spectrum Disorder in Region VII*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)

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

Below is the complete structural schematic for the NeuroPath backend API and the frontend interface.

```text
📦 NeuroPath
│
├── 📂 neuropath-backend                  # Mission Control (Backend API)
│   ├── 📄 .env                           # Environment variables (never commit)
│   ├── 📄 .gitignore
│   ├── 📄 package.json
│   ├── 📄 package-lock.json
│   ├── 📄 server.js                      # Primary Express/Node entry point
│   │
│   ├── 📂 config                         # Configuration & DB connection
│   │   └── 📄 db.js
│   │
│   ├── 📂 models                         # MongoDB Schemas (Mongoose)
│   │   ├── 📄 User.js                    # Teacher/user accounts
│   │   ├── 📄 Student.js                 # Student profiles & PLAAFP data
│   │   ├── 📄 IEP.js                     # IEP documents & generated goals
│   │   ├── 📄 LessonPlan.js              # Auto-generated lesson plan templates
│   │   └── 📄 ProgressLog.js             # Behavioral tally & outcome tracking
│   │
│   ├── 📂 routes                         # RESTful API Endpoints
│   │   ├── 📄 auth.js                    # Registration, login, token refresh
│   │   ├── 📄 students.js                # Student profile CRUD
│   │   ├── 📄 iep.js                     # IEP generation & retrieval
│   │   ├── 📄 instructional.js           # Lesson plans & visual aid generation
│   │   └── 📄 progress.js               # Analytics & progress monitoring
│   │
│   ├── 📂 controllers                    # Business logic layer
│   │   ├── 📄 authController.js
│   │   ├── 📄 studentController.js
│   │   ├── 📄 iepController.js
│   │   ├── 📄 instructionalController.js
│   │   └── 📄 progressController.js
│   │
│   ├── 📂 middleware                     # Express middleware
│   │   ├── 📄 authMiddleware.js          # JWT verification
│   │   ├── 📄 errorHandler.js
│   │   └── 📄 validator.js              # Input validation & PLAAFP schema checks
│   │
│   └── 📂 services                       # External API integrations
│       ├── 📄 aiService.js               # OpenAI / LLM integration for IEP generation
│       ├── 📄 rgoriValidator.js          # R-GORI compliance scoring engine
│       └── 📄 completenessAlgorithm.js  # Multi-threshold quality algorithm (20/59/80/100%)
│
└── 📂 src                                # Flight Interface (Frontend UI)
    ├── 📄 index.css                      # Global styles & design tokens
    ├── 📄 main.jsx                       # React DOM entry point
    │
    ├── 📂 components                     # UI Modules
    │   ├── 📄 App.jsx                    # Root component & routing
    │   ├── 📄 Header.jsx
    │   ├── 📄 Sidebar.jsx
    │   ├── 📄 ProtectedRoute.jsx         # Auth-guarded routes
    │   │
    │   ├── 📂 auth                       # Authentication screens
    │   │   ├── 📄 Login.jsx
    │   │   └── 📄 Register.jsx
    │   │
    │   ├── 📂 dashboard                  # Module 4 — Analytics & monitoring
    │   │   ├── 📄 Dashboard.jsx
    │   │   ├── 📄 ProgressChart.jsx
    │   │   └── 📄 GoalAttainmentWidget.jsx
    │   │
    │   ├── 📂 students                   # Module 1 — Student profiling
    │   │   ├── 📄 StudentList.jsx
    │   │   ├── 📄 StudentProfile.jsx
    │   │   └── 📄 PLAAFPForm.jsx         # Structured PLAAFP data entry form
    │   │
    │   ├── 📂 iep                        # Module 2 — IEP Generation
    │   │   ├── 📄 IEPGenerator.jsx
    │   │   ├── 📄 IEPGoalEditor.jsx
    │   │   ├── 📄 CompletenessIndicator.jsx  # Visual 20/59/80/100% threshold gauge
    │   │   └── 📄 IEPDocument.jsx        # Printable IEP output
    │   │
    │   └── 📂 instructional              # Module 3 — Instructional support
    │       ├── 📄 LessonPlanView.jsx
    │       ├── 📄 VisualAidGenerator.jsx # Printable picture cards & visual supports
    │       └── 📄 GeneralizationTips.jsx # Real-world transfer strategy recommendations
    │
    └── 📂 hooks                          # Custom React Hooks
        ├── 📄 useAuth.js                 # Auth state & token management
        ├── 📄 useStudent.js              # Student data fetching & mutations
        ├── 📄 useIEP.js                  # IEP generation & quality score state
        └── 📄 useProgress.js            # Progress tracking & analytics data
```

---

## ⚙️ Tech Stack

NeuroPath operates on a modern JavaScript full-stack with AI and data visualization layers:

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React + Vite | Responsive UI with fast hot-module replacement |
| **Routing** | React Router v6 | Client-side navigation & protected routes |
| **State Management** | React Context + Custom Hooks | Auth state, student data, IEP generation state |
| **UI Components** | Custom CSS / Tailwind CSS | Component styling & responsive layout |
| **Charts & Analytics** | Recharts / Chart.js | Progress dashboards & goal attainment visualization |
| **Backend Runtime** | Node.js + Express | RESTful API server & business logic |
| **Database** | MongoDB + Mongoose | NoSQL storage for users, students, IEPs, and progress logs |
| **Authentication** | JSON Web Tokens (JWT) + bcrypt | Secure teacher authentication & session management |
| **AI Engine** | OpenAI API (GPT-4o) | Adaptive IEP goal generation from PLAAFP baseline data |
| **Validation** | Custom R-GORI Scoring Engine | Automated pedagogical compliance checking at ≥ 65% threshold |
| **PDF Generation** | jsPDF / Puppeteer | Printable IEP documents, lesson plans & visual aids |
| **Security** | Helmet.js + express-rate-limit | HTTP header hardening & API abuse prevention |
| **Environment** | dotenv | Secure credential & configuration management |

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
- Secure data access with standard cryptographic protocols (JWT + bcrypt)
- SUS-validated usability interface
- Role-based access control (teacher, administrator)

---

## 🚀 Getting Started

Follow these steps to deploy a local instance of NeuroPath on your machine.

### Prerequisites

Ensure your local environment has the following:

- **Node.js** (v18.0.0 or higher) and **npm**
- **MongoDB** (Local instance or a MongoDB Atlas URI)
- **OpenAI API Key** with access to GPT-4o or GPT-4-turbo
- A modern browser (Chrome, Firefox, Edge)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/NeuroPath.git
cd NeuroPath
```

---

### 2. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd neuropath-backend
npm install
```

Create a `.env` file inside `neuropath-backend/` (see [Environment Variables](#-environment-variables) below for the full reference):

```bash
cp .env.example .env
# Then fill in your values
```

Start the backend server:

```bash
# Development (with auto-reload via nodemon)
npm run dev

# Production
npm start
```

The API will be running at `http://localhost:5000`.

---

### 3. Frontend Setup

Open a **second terminal** and navigate to the root directory:

```bash
# From the root NeuroPath/ folder
npm install
```

Create a `.env` file in the root directory:

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

---

## 🔐 Environment Variables

NeuroPath uses separate `.env` files for the backend and frontend. **Never commit either file to version control.** Both are covered by `.gitignore`.

---

### Backend — `neuropath-backend/.env`

```env
# ───────────────────────────────────────────
# SERVER
# ───────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ───────────────────────────────────────────
# DATABASE
# ───────────────────────────────────────────
DB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/neuropath?retryWrites=true&w=majority

# ───────────────────────────────────────────
# AUTHENTICATION
# ───────────────────────────────────────────
JWT_SECRET=TOKEN
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# ───────────────────────────────────────────
# AI ENGINE (OpenAI)
# ───────────────────────────────────────────
OPENAI_API_KEY=TOKEN
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2048

# ───────────────────────────────────────────
# COMPLETENESS ALGORITHM THRESHOLDS
# (Customize if needed — defaults are pedagogically validated)
# ───────────────────────────────────────────
THRESHOLD_INITIAL=20
THRESHOLD_DEVELOPING=59
THRESHOLD_PROFICIENT=80
THRESHOLD_COMPLETE=100

# ───────────────────────────────────────────
# CORS
# ───────────────────────────────────────────
CLIENT_ORIGIN=http://localhost:5173

# ───────────────────────────────────────────
# RATE LIMITING
# ───────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

### Frontend — `.env` (root directory)

```env
# ───────────────────────────────────────────
# API
# ───────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:5000/api

# ───────────────────────────────────────────
# AUTHENTICATION
# ───────────────────────────────────────────
VITE_JWT_STORAGE_KEY=TOKEN

# ───────────────────────────────────────────
# FEATURE FLAGS
# ───────────────────────────────────────────
VITE_ENABLE_PDF_EXPORT=true
VITE_ENABLE_VISUAL_AIDS=true
VITE_ENABLE_ANALYTICS_DASHBOARD=true
```

> ⚠️ **Security Note:** Never expose your `OPENAI_API_KEY`, `JWT_SECRET`, or `DB_URI` to the frontend. All sensitive keys must live exclusively in the backend `.env` file and be accessed only server-side.

---

## 📚 Documentation

Full technical documentation for NeuroPath is maintained in the `/docs` directory and linked below. *Documents will be available once finalized.*

| Document | Description | Status |
|---|---|---|
| [📄 Software Requirements Specification (SRS)](./docs/SRS.md) | Complete functional and non-functional requirements, use case diagrams, and data flow specifications | 🔜 Coming Soon |
| [📄 Software Design Document (SDD)](./docs/SDD.md) | System architecture, database schema, API endpoint reference, and UI wireframes | 🔜 Coming Soon |
| [📄 R-GORI Compliance Guide](./docs/RGORI_Guide.md) | Explanation of the R-GORI pedagogical framework and how NeuroPath's validation engine applies it | 🔜 Coming Soon |
| [📄 Completeness Algorithm Reference](./docs/CompletenessAlgorithm.md) | Technical specification of the 20/59/80/100% threshold quality engine | 🔜 Coming Soon |
| [📄 API Reference](./docs/API.md) | Full REST API endpoint documentation with request/response schemas | 🔜 Coming Soon |

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
- [ ] Module 1 — Student Profiling & PLAAFP Form (Sprint 1)
- [ ] Module 2 — AI-Driven IEP Generation & R-GORI Validator (Sprint 2)
- [ ] Module 3 — Lesson Plans, Visual Aids & Generalization Tools (Sprint 3)
- [ ] Module 4 — Progress Dashboard, Security & SUS Testing (Sprint 4)
- [ ] SRS & SDD Documentation
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

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**NeuroPath** — *Bridging the Gap Between Documentation and Genuine Learning*

Built with purpose for Philippine SPED educators and the students they champion. 🇵🇭

Team `cs342-14`

</div>
