# PR #196 Review Remediation & Staging Pre-Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 12 code review comments on PR #196 by eliminating real database credentials, parameterizing Docker Compose, removing root binary and scratch files, and harmonizing RAG specification documentation.

**Architecture:** 
1. Security & Configuration: Scrub live credentials from `.env.staging.example` and parameterize `docker-compose.yml` with environment variable substitution.
2. Repository Hygiene: Remove binary `.docx` files and root scratch text files, adding `.docx` to root `.gitignore`.
3. Contributor & Documentation: Update PR template with standard placeholder (`Closes #123`) and label RAG documentation as future architectural specifications with target-based latency budgets.

**Tech Stack:** Docker Compose, Django 6.0, Vite/React, Git, Markdown.

## Global Constraints
- Do not break existing Django settings or environment variable contracts (`DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`).
- All 199 backend tests and 343 frontend tests must remain 100% green.
- PR validation workflow (`.github/workflows/pr-template-lint.yml`) and CI (`ci.yml`) must pass cleanly.

---

### Task 1: Sanitize Supabase Credentials in `.env.staging.example` & Local Configurations

**Files:**
- Modify: `neuropath-backend/.env.staging.example:19-21`
- Modify: `neuropath-backend/.env.staging:14-16`

**Interfaces:**
- Consumes: Django `django-environ` schema in `neuropath_core/settings.py`
- Produces: Safe template placeholders with zero exposed secrets

- [ ] **Step 1: Replace live Supabase pooler credentials with safe placeholders in `neuropath-backend/.env.staging.example`**

```ini
# ── Database (PostgreSQL / Supabase) ──────────────────────────────────────────
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=your-staging-db-user
DB_PASSWORD=your-staging-db-password
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
```

- [ ] **Step 2: Verify no live passwords remain in `.env.staging.example`**

Run: `git diff neuropath-backend/.env.staging.example`
Expected: Diff shows replacement of `NeuroPathCS342-14` and live pooler user with placeholders.

- [ ] **Step 3: Commit Task 1**

```bash
git add neuropath-backend/.env.staging.example
git commit -m "fix(security): sanitize database credentials in staging env example"
```

---

### Task 2: Parameterize `docker-compose.yml` Credentials and Port Mapping

**Files:**
- Modify: `docker-compose.yml:8-14, 32-38`

**Interfaces:**
- Consumes: Environment variables from shell / `.env`
- Produces: Parameterized database service and backend connection definitions with development defaults

- [ ] **Step 1: Parameterize database credentials and port in `docker-compose.yml`**

Update `db` service:
```yaml
    ports:
      - "${DB_HOST_PORT:-5432}:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-postgres}
```

Update `backend` service:
```yaml
    environment:
      DB_HOST: ${DB_HOST:-db}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres}
      DB_NAME: ${DB_NAME:-postgres}
      DB_PORT: ${DB_PORT:-5432}
```

- [ ] **Step 2: Validate docker-compose syntax**

Run: `docker compose config` (or verify YAML structure with python/yaml parser)
Expected: Clean YAML without syntax errors, defaults resolving correctly.

- [ ] **Step 3: Commit Task 2**

```bash
git add docker-compose.yml
git commit -m "fix(docker): parameterize compose credentials and standardize port mapping"
```

---

### Task 3: Remove Root Scratch Files & Relocate/Ignore Binary `.docx` Documents

**Files:**
- Remove: `steps-torun.txt`
- Remove: `Github-templates.md`
- Remove: `NeuroPath_SDD.docx`
- Remove: `SRS_NeuroPath.docx`
- Modify: `.gitignore:6-10`

**Interfaces:**
- Consumes: Git index
- Produces: Clean root repository directory with binary `.docx` files ignored

- [ ] **Step 1: Add `*.docx` and root scratch file patterns to root `.gitignore`**

```gitignore
# Binary documents & scratch files
*.docx
steps-torun.txt
Github-templates.md
```

- [ ] **Step 2: Remove tracked binary files and scratch files from Git**

```bash
git rm NeuroPath_SDD.docx SRS_NeuroPath.docx steps-torun.txt Github-templates.md
```

- [ ] **Step 3: Verify git status**

Run: `git status`
Expected: 4 deleted files in staged changes, `.gitignore` modified.

- [ ] **Step 4: Commit Task 3**

```bash
git add .gitignore
git commit -m "chore(repo): remove root scratch files and ignore binary Word documents"
```

---

### Task 4: Standardize `.github/pull_request_template.md` with Clear Issue Placeholder

**Files:**
- Modify: `.github/pull_request_template.md:1-4`

**Interfaces:**
- Consumes: GitHub PR creation UI & `.github/workflows/pr-template-lint.yml`
- Produces: Canonical template with clear `Closes #123` guidance

- [ ] **Step 1: Update PR template with explicit placeholder**

```markdown
## 🔗 Linked Issue
Closes #123
```

- [ ] **Step 2: Verify against PR template linter regex**

Verify that `Closes #123` matches `(closes|fixes|resolves)\s*#[0-9]+` from `pr-template-lint.yml`.

- [ ] **Step 3: Commit Task 4**

```bash
git add .github/pull_request_template.md
git commit -m "docs(github): add explicit issue placeholder to pull request template"
```

---

### Task 5: Harmonize `docs/rag/` Specifications

**Files:**
- Modify: `docs/rag/README.md:1-25, 45-60`
- Modify: `docs/rag/third_party_services.md:10-25`
- Modify: `docs/rag/architecture.md:185-204`

**Interfaces:**
- Consumes: Architecture documentation
- Produces: Accurately scoped future roadmap specification with estimated latency targets

- [ ] **Step 1: Add specification banner to `docs/rag/README.md`**

Add header callout:
```markdown
> [!NOTE]
> **Specification & Roadmap Status:** This document details the planned RAG architecture and knowledge base design for future integration. Runtime models, pgvector migrations, and retrieval services are scheduled under Sprint roadmap item KAN-8 and are not part of the active production runtime.
```

Consolidate env var references to match active codebase:
Replace `OPENAI_API_KEY` and `OLLAMA_BASE_URL` with:
- `GEMINI_API_KEY` (Primary AI generation)
- `GROQ_API_KEY` (Fallback AI generation)
- `OLLAMA_HOST` (Optional local Ollama host, default: `http://localhost:11434`)

- [ ] **Step 2: Update compliance claims and PII boundary notes in `docs/rag/third_party_services.md`**

Clarify that statutory compliance and PII protection represent design policies and multi-tier filtering objectives, not contractual absolute zero-retention guarantees.

- [ ] **Step 3: Label latency numbers as design targets in `docs/rag/architecture.md`**

Update Section 5 heading and table:
- Heading: `## 5. Latency Budget Allocation (Target Design Estimates ≤ 10s)`
- Table notes: Explicitly state that latency figures represent architectural engineering design budgets subject to empirical validation upon KAN-8 deployment.

- [ ] **Step 4: Commit Task 5**

```bash
git add docs/rag/
git commit -m "docs(rag): clarify future specification scope, harmonize env vars, and label latency targets"
```

---

### Task 6: Full Verification & Remote Branch Synchronization

**Files:** None (Execution and remote push)

- [ ] **Step 1: Run Django system check**

Run: `python neuropath-backend/manage.py check`
Expected: System check identified no issues (0 silenced).

- [ ] **Step 2: Run Ruff linter on backend**

Run: `ruff check neuropath-backend/`
Expected: All checks passed.

- [ ] **Step 3: Run ESLint on frontend**

Run: `npm run lint` in `neuropath-frontend`
Expected: 0 lint errors.

- [ ] **Step 4: Verify frontend build**

Run: `npm run build` in `neuropath-frontend`
Expected: Vite build succeeds in < 3s.

- [ ] **Step 5: Push commits to `origin development`**

Run: `git push origin development`
Expected: Remote branch updated, PR #196 automatically reflects the remediation commits.
