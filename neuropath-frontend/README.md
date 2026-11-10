# ⚛️ NeuroPath Frontend (Web Client)

The React 18 + Vite client interface for **NeuroPath** — an AI-driven adaptive IEP generation and instructional support system for elementary Special Education (SPED) teachers in Region VII, Philippines.

[![React 18](https://img.shields.io/badge/React-18.3-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite 5](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-FCC72B?style=flat&logo=vitest&logoColor=black)](https://vitest.dev/)
[![TanStack Query](https://img.shields.io/badge/State-TanStack%20Query%20v5-FF4154?style=flat)](https://tanstack.com/query)

---

## 🛠️ Quick Start

```powershell
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start local development server
npm run dev
# Running at http://localhost:5173
```

---

## 🧪 Development & Testing Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launches local Vite dev server with HMR |
| `npm run test` *(or `npx vitest run`)* | Runs all unit and component tests once |
| `npm run test:watch` *(or `npx vitest`)*| Runs tests in interactive watch mode |
| `npm run lint` *(or `npx eslint .`)* | Checks for syntax errors and ESLint rule violations |
| `npx eslint . --fix` | Automatically fixes autofixable ESLint errors |
| `npm run build` | Compiles production bundle with type validation to `dist/` |
| `npm run preview` | Locally serves the production `dist/` build |

---

## 🏗️ Architecture & Core Pages

```text
src/
├── App.jsx                     # Nested routes, auth wrappers, and layout shell
├── api/client.js               # Centralized Axios client with Bearer auth token injection
├── queryClient.js              # TanStack Query client & cache configuration
├── context/                    # AuthContext, ToastContext, UnsavedChangesContext
├── components/                 # Modals (RA 10173 consent, progress logging, signature), layout & UI primitives
└── pages/
    ├── landingPage.jsx         # Public landing showcase
    ├── loginPage.jsx           # Teacher authentication
    ├── registerPage.jsx        # Teacher registration with password meter
    ├── Overview.jsx            # Teacher dashboard & stats
    ├── CreateStudentProfile.jsx# Module 1: Student profiling & consent
    ├── IepGenerationPage.jsx   # Module 2: 3-step IEP wizard & R-GORI audit
    ├── ManageLessonPlans.jsx   # Module 3: IEP-linked lesson plans
    ├── ManageVisualAids.jsx    # Module 3: 3-step visual schedules (Pollinations.ai)
    ├── ManageTeachingStrategies.jsx # Module 3: Evidence-based strategies (TEACCH, PECS)
    ├── ViewStudentRecords.jsx  # Module 4: Multi-version Section B/C preview & PDF export
    └── ViewProgressDashboard.jsx # Module 4: Real-time progress analytics (Recharts)
```

---

## 🔐 Environment Variables (`.env`)

```env
# URL pointing to the running Django REST API
VITE_API_URL=http://localhost:8000/api

# Feature flags
VITE_ENABLE_PDF_EXPORT=true
VITE_ENABLE_VISUAL_AIDS=true
VITE_ENABLE_ANALYTICS_DASHBOARD=true
```

For complete system architecture, deployment details, and backend configuration, refer to the [Root README.md](../README.md).
