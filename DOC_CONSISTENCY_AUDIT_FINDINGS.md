# NeuroPath SDD / SRS / SPMP Consistency Audit Findings

**Date:** 2026-10-17  
**Purpose:** Actionable remediation brief for aligning `Updated_NeuroPath_SDD.docx`, `Updated_SRS_Neuropath.docx`, and `Updated_NeuroPath_SPMP.docx` (also `Updated_NeuroPath_SPMP.doc` / `scratch/Updated_NeuroPath_SPMP.docx`) with the live codebase and with each other.  
**Scope of review:** Cross-document consistency + verification against `neuropath-backend` and `neuropath-frontend`.  
**Do not** invent new product features; update documentation to match code (unless a code fix is explicitly chosen below).

---

## Documents under review

| Doc | Path |
|-----|------|
| SDD | `Updated_NeuroPath_SDD.docx` |
| SRS | `Updated_SRS_Neuropath.docx` |
| SPMP | `scratch/Updated_NeuroPath_SPMP.docx` (export also as root `Updated_NeuroPath_SPMP.doc`) |
| CSV mirrors | `docs/tables/table1_change_history.csv`, `docs/tables/table2_traceability_matrix.csv` |

Related sync helpers (optional): `scratch/synchronize_all_docs.py`, `scratch/build_master_spmp.py`.

---

## What is already consistent (do not break)

- Module map M1–M4 is aligned across SRS / SDD / SPMP.
- All **37 REQ IDs** match between SRS Table 27, SDD Table 2, and `docs/tables/table2_traceability_matrix.csv`.
- Product change history (**13 rows**, v1.0.0 → v2.1.0) matches between SRS ↔ SDD ↔ CSV.
- Many features are correctly documented and verified in code:
  - RA 10173 consent modal gating
  - TanStack Query `staleTime: 5 * 60 * 1000`
  - 30-min inactivity + 60s warning + BroadcastChannel
  - ReportLab IEP / visual-aid / consent PDFs
  - SMART ABCD goal formulation (primary)
  - IEP archiving, multi-version Section B/C records
  - Lesson plan phase editing (`LessonPlanUpdateService`)
  - Visual-aid **image** cascade: Imagen 3 → HF FLUX.1-schnell → Pollinations
  - Supabase-hosted PostgreSQL (DB hosting claim is OK)
  - Teacher-scoped multi-tenant query filtering (app-layer)

---

## Priority 0 — Must fix (docs contradict code)

### P0-1. AI text fallback cascade is wrong everywhere

**Documented (SRS / SDD / SPMP / RTM REQ-M2-06 / change history):**  
`Google Gemini 1.5 Flash → Groq Cloud API → Deterministic Rule-Based Template Generator`  
Claims “100% uptime” / “zero 500/503 crashes.”

**Actual code** (`neuropath-backend/iep_management/ai_engine.py` → `AIEngineService.generate_text`):

1. Tier 1: Gemini (default `gemini-1.5-flash`; also tries `gemini-2.5-flash`, `gemini-flash-latest`)
2. Tier 2: Groq (default `llama-3.3-70b-versatile`)
3. Tier 3: **OpenRouter** (default `meta-llama/llama-3.3-70b-instruct:free`)
4. If all fail → raises `RuntimeError` (IEP endpoints can return **503**)

**Evidence of intentional removal of deterministic tier:**

```python
# iep_management/tests/test_ai_engine.py
def test_deterministic_fallback_is_completely_removed(self):
    self.assertFalse(hasattr(AIEngineService, '_deterministic_fallback'))
```

**Note:** `_call_ollama` exists as a helper but is **not** in the live `generate_text()` cascade. Do not document Ollama as an active cascade tier unless code is changed.

**SRS internal inconsistency:** one software-interfaces bullet mentions “OpenRouter / deterministic”; NFRs still say Deterministic Tier 3. Unify.

**Remediation (docs):** Rewrite cascade to **Gemini → Groq → OpenRouter** in:
- SRS Introduction / Product perspective / Software interfaces / Functional REQ-M2-06 / Reliability NFR
- SDD Architectural Design / Definitions (“3-Tier AI Cascade”) / Module 2 body / RTM REQ-M2-06
- SPMP definitions / methods / risk mitigation / AI service deliverables
- Change-history wording for v1.3.0 if it still says Deterministic as Tier 3
- CSV `table2_traceability_matrix.csv` REQ-M2-06 row
- Soften or remove “100% uptime / zero 500 crashes” unless code restores an offline deterministic path

**Alternative (code):** Restore a real deterministic Tier 3 and keep docs — only if product owners choose that. Default for this brief: **docs follow code**.

---

### P0-2. Authentication claims are wrong (SRS especially)

**Documented:** TokenAuthentication with **HTTP-only cookies**; sometimes conflated with **JWT**.

**Actual:**
- DRF `TokenAuthentication` (`neuropath_core/settings.py`)
- Token stored in **`localStorage`** (`neuropath-frontend/src/context/AuthContext.jsx`)
- Header: `Authorization: Token <key>`
- Tests reject Bearer/JWT scheme

**Remediation:** Replace JWT / HTTP-only cookie claims with DRF Token + localStorage (and note XSS residual risk if desired). Update SRS Overall Description + Security NFR. SPMP/SDD if they imply cookie JWT.

---

### P0-3. “AES-256” crypto label is incorrect

**Documented:** Application-layer AES-256 (Fernet) everywhere (SRS / SDD / SPMP / RTM REQ-SEC-01 / definitions).

**Actual:** Fernet = **AES-128-CBC + HMAC-SHA256** (`users/fields.py` uses `cryptography.fernet.Fernet`). Field encryption **does** exist on student PII.

**Remediation options (pick one consistently across all docs + CSV):**
- A (preferred for accuracy): “Fernet (AES-128-CBC + HMAC-SHA256) field-level encryption at rest”
- B: Keep “AES-256” only if code is migrated to a true AES-256 scheme (out of scope unless requested)

Also fix NIST SP 800-38D citations if they were attached specifically to justify AES-256-GCM; Fernet is not GCM.

---

### P0-4. R-GORI “purged” claim overstates reality

**Documented (v2.1.0 change history):** Experimental R-GORI scoring purged; focus on SMART ABCD.

**Actual:**
- Production generation prompts use SMART ABCD
- `RGORICheckerService` still exists in `iep_management/rgori_service.py`
- `test_rgori_resilience.py` still present
- Frontend still shows **“R-GORI Score”** UI residual (`IepGenerationPage.jsx`) and some manual goals set `_rgori_score`
- Stale comments/docstrings in backend views still mention R-GORI

**Remediation (docs):** Soften v2.1.0 / SPMP wording to: “R-GORI removed from active generation validation path; SMART ABCD is the pedagogical standard; residual UI/test symbols may remain pending cleanup.”  
**Optional code follow-up (separate):** Remove residual UI + dead service if product wants a true purge.

---

### P0-5. SDD invents Supabase Storage components that do not exist

**Documented in SDD Module 3 (Visual Aids):**
- `SupabaseStorageManager`
- `MediaStreamingService`
- `StorageCleanupWorker`

**Actual:** Visual aid images stored as URL or **base64 data URI** on the model (`resources` views/serializers). No Supabase Storage bucket integration module.

**Remediation:** Rewrite those SDD component paragraphs to describe URL/base64 persistence + ReportLab PDF export (`PDFExportEngine` **does** exist).

---

## Priority 1 — RTM / naming / missing files

Normalize SRS Table 27, SDD Table 2, and `docs/tables/table2_traceability_matrix.csv` together.

### Rename / replace incorrect symbols

| Documented | Replace with |
|------------|--------------|
| `iep_generation_service.py` | Remove; use `GenerateIEPGoalsFromIEPView` / `IEPGeneratorService` in `iep_management/views.py` |
| `ConsentCertificateView` | `ConsentCertificatePdfView` (+ `ConsentCertificatePdfEngine`) in `users/views.py` |
| `ConsentPDFTest` | `ConsentCertificatePdfViewTests` in `users/tests.py` |
| `RecentActivityView` | `RecentActivityAPIView` in `tracking/views.py` |
| `SpecialFactorNotesField.jsx` | Inline `SpecialFactorNotesField` in `IepGenerationPage.jsx` (or note “component function in page”) |
| `test_iep_generation.py` | Point to real suites: `test_ai_engine.py`, `test_iep_legacy.py`, `test_insights_and_goals.py`, `test_rgori_resilience.py` (as applicable) |
| `test_security.py` | Point to `users/tests.py` tenant/auth suites + `neuropath_core/tests.py` |

### SDD-only phantom “design component” names (prefer real symbols or mark as logical)

These appear in SDD RTM / body but are **not** real exported symbols (or are only conceptual):

- `AddStudentWizard`, `DifficultyBadgeSyncManager`, `IepGenerationWizard`
- `AssistiveTechTable`, `SingleGoalRegenerateModal`
- `RoutinePresetChipsGroup`, `WebSpeechAudioPlayer`, `SequenceStepCaptionEditor`
- `RecordsManagementPanel`, `ProgressDashboardPanel`, `ProgressAnalyticsAPIView`
- `StudentRecordQueryController`, `TeachingStrategyUpdateController`
- `ContextualDataIsolationFilter` — **partially real** as helper naming in `tracking/views.py`; verify before deleting
- `IEPBinaryReportRenderEngine` — **real** in `iep_management/views.py`
- `PDFExportEngine`, `VisualAidGeneratorService`, `LessonPlanUpdateService`, `AIEngineService` — **real**

**Guideline:** SRS/CSV should stay close to real filenames. SDD may keep logical names only if clearly labeled as design stereotypes mapped to real files.

### Line-number references in RTM

Many `File.jsx:L210` style references are likely stale. Prefer file/symbol names without brittle line numbers, or re-verify lines after edits.

---

## Priority 2 — Cross-document alignment (SRS ↔ SDD ↔ SPMP)

### P2-1. SPMP change history format differs

- SRS/SDD/CSV: product releases `v1.0.0` … `v2.1.0` (13 rows).
- SPMP Table: `Draft v1.0`, `Preliminary v1.2`, `Revision v1.4`… `Final v2.1.0` (document evolution, not product releases).

**Remediation:** Either (a) add the same 13-row product change history table to SPMP annex, or (b) clearly label SPMP table as “SPMP document revision history” and point to SRS/SDD for product releases. Do not leave readers thinking they are the same table.

### P2-2. SPMP claims 37-row RTM but does not embed it

V&V section references “37-Row Requirements Traceability Matrix (REQ-M1-01 to REQ-NFR-03)” but SPMP body only literally contains `REQ-M1-01` and `REQ-NFR-03`.

**Remediation:** Embed full RTM annex **or** explicitly state “RTM maintained in SRS Table 27 / SDD Table 2 / `docs/tables/table2_traceability_matrix.csv`” with identical version stamp.

### P2-3. Dates for v2.1.0

- SRS/SDD change history: **2026-10-10**
- SPMP Final v2.1.0 / Milestone 11: **2026-10-15**

**Remediation:** Pick one published date and use it consistently (or distinguish “code release” vs “doc alignment complete”).

### P2-4. Groq model string

- Code/SRS: `llama-3.3-70b-versatile`
- SPMP risk text: `Llama-3-70B`

**Remediation:** Standardize on `llama-3.3-70b-versatile`.

### P2-5. Django version

- SRS: “Django 5/6”
- Code: `Django==6.0.5`

**Remediation:** Say Django 6.x / 6.0.5.

### P2-6. Missing v1.7.0

Product history jumps v1.6.0 → v1.8.0. Not wrong if intentional; add a footnote “v1.7.0 unused / skipped” if reviewers ask.

### P2-7. SPMP test count claims are outdated

**Documented:** ~28 Vitest suites / 208 tests; ~15 Django suites / 150 tests.

**Approx actual (2026-10-17):**
- Frontend: ~55 `*.test.*` files / ~540 `it(` cases
- Backend: 16 test modules / ~258 `def test_` methods

**Remediation:** Re-run test suites and update SPMP V&V / QA sections with measured counts, or replace hard numbers with “see CI latest run.”

---

## Priority 3 — Minor wording / UX accuracy

| Claim | Actual | Fix |
|-------|--------|-----|
| Difficulty “read-only badges” | Locked difficulty **list/paragraph** UI on IEP page | Soften to “profile-synced read-only difficulty markers” |
| `ViewStudentProfile` as wizard | Roster/list page; detail is `ViewSelectedStudentProfile` | Fix RTM/component names |
| Recent Activity “latest 5–10” | Defaults to 10; expandable to 15 | “Shows 10 by default, expandable” |
| Daily living presets names | Handwashing / Eating with Utensils / Tooth Brushing / Classroom Transition | Align labels with UI |
| Visual-aid cascade order | Docs sometimes vary FLUX vs Imagen order | Keep **Imagen → FLUX → Pollinations** (matches `fetch_image`) |
| Gemini “1.5 Flash only” | Also tries 2.5 / flash-latest | Optional footnote for intra-provider fallbacks |

---

## Features largely OK (verification summary)

Use as confidence check, not change list:

| Area | Status |
|------|--------|
| Ra10173ConsentModal gated consent | Verified |
| IEP Section A-B-C wizard stepper | Verified |
| AT max 5 + 6 presets; Special Factor 500 + 6 presets | Verified |
| Single-goal regen modal | Verified |
| IEP Active/Archived | Verified |
| Multi-IEP selection lesson plans / strategies | Verified |
| Visual aids 4 presets + Web Speech + sequence viewer | Verified |
| Independent Section B/C version selectors | Verified |
| Progress KPI ≥70% Goals on Track | Verified |
| Session timeout 30m + 60s + BroadcastChannel | Verified |
| TanStack Query 5-min staleTime | Verified |
| SkipLink / landmarks / axe-core a11y tests | Verified |
| Unsaved changes navigation guard | Verified |
| React Router primary navigation | Verified |
| First-login TeacherTutorialModal | Verified |
| LessonPlanUpdateService phase editing | Verified |
| ReportLab `GET /api/iep/<id>/export/` | Verified |
| EncryptedCharField / EncryptedTextField present | Verified (label wrong — P0-3) |
| Docker Compose + Gunicorn (prod) + WhiteNoise + `/api/health/` | Verified (compose at repo root) |

---

## Recommended fix order for the other agent

1. **Unify AI cascade + auth + Fernet label** across SRS, SDD, SPMP (P0-1, P0-2, P0-3).
2. **Fix RTM + CSV** component/test columns (P1); regenerate SDD Table 2 / SRS Table 27 from one source of truth.
3. **Remove SDD Supabase Storage phantoms** (P0-5); soften R-GORI purge language (P0-4).
4. **Align SPMP** change-history/RTM/date/test counts/Groq model (P2).
5. **Pass for minor UX wording** (P3).
6. Re-run a consistency check: same 37 REQ IDs; same cascade string; same crypto string; same auth string; no `iep_generation_service.py` / `ConsentCertificateView` / `Deterministic Rule-Based` leftovers (except historical notes).

### Suggested single source of truth for cascade (paste everywhere)

> **3-Tier AI Fallback Cascade:** Tier 1 Google Gemini (default `gemini-1.5-flash`, with provider-level model fallbacks) → Tier 2 Groq Cloud API (`llama-3.3-70b-versatile`) → Tier 3 OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`). If all providers fail, the API returns an error (e.g., HTTP 503); there is no offline deterministic goal generator in the current codebase.

### Suggested single source of truth for crypto (paste everywhere)

> **Field-level encryption at rest:** Sensitive student PII fields use Fernet (`cryptography.fernet`) — AES-128-CBC with HMAC-SHA256 authentication — via `EncryptedCharField` / `EncryptedTextField` in `users/fields.py`.

### Suggested single source of truth for auth (paste everywhere)

> **API authentication:** Django REST Framework TokenAuthentication. The SPA stores the token in `localStorage` and sends `Authorization: Token <key>`. JWT and HTTP-only cookie session auth are not used for API access.

---

## Out of scope unless explicitly requested

- Changing application code to restore deterministic AI Tier 3
- Migrating Fernet to true AES-256-GCM
- Moving tokens from localStorage to HTTP-only cookies
- Deleting residual R-GORI UI/service (code cleanup)
- Regenerating Visio/diagram images inside the docx files beyond text/table updates

---

## Quick grep checklist after edits

Search all three docs (and CSV) and ensure **zero remaining active claims** for:

- `Deterministic Rule-Based` / `Deterministic Template` as live Tier 3
- `JWT` as API auth
- `HTTP-only cookie` as token storage
- `AES-256` (unless option B chosen)
- `iep_generation_service.py`
- `ConsentCertificateView` (without Pdf)
- `SupabaseStorageManager` / `MediaStreamingService` / `StorageCleanupWorker`
- `test_iep_generation.py` / `test_security.py` as sole verification suites
- `Llama-3-70B` (non-versioned) in SPMP

Historical mention of R-GORI in change history is OK if phrased accurately (P0-4).
