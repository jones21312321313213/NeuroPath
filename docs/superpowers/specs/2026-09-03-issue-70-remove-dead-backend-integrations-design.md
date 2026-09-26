# Issue #70 — Remove Dead Backend Integrations (simplejwt & Supabase Storage) — Design Specification

**Issue:** #70 — `[BE] [CHORE]: Remove or wire up dead backend integrations (simplejwt, Supabase storage)`
**Date:** 2026-09-03
**Status:** Approved

## Context & Motivation

Two backend integrations exist as dead code or stubs in the repository:
1. `djangorestframework_simplejwt` & `PyJWT` are listed in `neuropath-backend/requirements.txt`, but never imported or configured in `settings.py`. The project has standardized on DRF `TokenAuthentication` across backend views and frontend clients.
2. In `neuropath-backend/resources/views.py`, multiple classes and functions (`SupabaseStorageManager`, `StorageCleanupWorker`, `MediaStreamingService`, and `VisualAidGeneratorService.upload_to_supabase`) are dead stubs:
   - `SupabaseStorageManager` is completely unreferenced.
   - `StorageCleanupWorker.purge_orphan_file` only prints a log and performs no cloud storage cleanup.
   - `MediaStreamingService.resolve_secure_stream_url` appends a dummy parameter `?stream_auth=verified_token_123` to image URLs, simulating fake authentication.
   - `VisualAidGeneratorService.upload_to_supabase` attempts to upload to Supabase using settings variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) that do not exist, silently failing and falling back to the Pollinations URL.

## Decision

We adopt **Option 1: Clean Removal of Dead Integrations**:
- Remove `djangorestframework_simplejwt` and `PyJWT` from `neuropath-backend/requirements.txt`.
- Remove dead Supabase storage stubs, fake stream authentication query parameter logic, and dead upload fallbacks from `neuropath-backend/resources/views.py`.
- Reconcile `README.md` and inline comments with actual settings and DRF `TokenAuthentication`.

## Success Criteria

1. `djangorestframework_simplejwt` and `PyJWT` are no longer required or listed.
2. Visual aid list and detail endpoints return clean URLs without dummy stream authentication parameters.
3. Visual aid deletion succeeds cleanly without calling dead cleanup stubs.
4. All existing and new unit tests in `neuropath-backend` pass.
5. `README.md` accurately documents DRF `TokenAuthentication` and removes nonexistent Supabase storage env vars.
