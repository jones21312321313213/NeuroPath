# Issue #70 — Remove Dead Backend Integrations (simplejwt & Supabase Storage) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly eliminate unused `djangorestframework_simplejwt` and `PyJWT` dependencies, remove dead/stub Supabase storage classes and fake streaming URL decorators from `resources/views.py`, and reconcile project documentation with actual settings.

**Architecture:** Remove dead classes (`SupabaseStorageManager`, `StorageCleanupWorker`, `MediaStreamingService`) and method `VisualAidGeneratorService.upload_to_supabase` from `resources/views.py`; return clean image URLs directly in visual aid list/detail endpoints; strip unused dependencies from `requirements.txt`; and update `README.md` and comments.

**Tech Stack:** Django 6, Django REST Framework, `rest_framework.authtoken`, Ruff, unittest.

## Global Constraints

- Do not touch existing `DATABASES` configuration in `settings.py` (Supabase PostgreSQL pooler is genuine and in use).
- Maintain DRF `TokenAuthentication` (`Authorization: Token <key>`) as the standard auth scheme.
- Verification must pass `ruff check .`, `python manage.py check`, and `python manage.py test`.
- Commit after each task.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `neuropath-backend/requirements.txt` | Modify | Remove `djangorestframework_simplejwt` and `PyJWT` |
| `neuropath-backend/resources/permissions.py` | Modify | Correct docstring/comment from JWT to DRF TokenAuthentication |
| `neuropath-backend/resources/views.py` | Modify | Remove `SupabaseStorageManager`, `StorageCleanupWorker`, `MediaStreamingService`, `upload_to_supabase`, and their caller hooks |
| `neuropath-backend/resources/tests.py` | Modify | Add regression tests verifying clean URL delivery and visual aid deletion |
| `README.md` | Modify | Reconcile auth and environment variable documentation |

---

## Task 1: Remove unused `simplejwt` and `PyJWT` dependencies and fix permissions comment

**Files:**
- Modify: `neuropath-backend/requirements.txt:8,11`
- Modify: `neuropath-backend/resources/permissions.py:10`

- [ ] **Step 1: Write the failing check**

Run:
```bash
git grep -E "simplejwt|PyJWT" neuropath-backend/requirements.txt
```
Expected: Matches found for `djangorestframework_simplejwt==5.5.1` and `PyJWT==2.13.0`.

- [ ] **Step 2: Update `requirements.txt`**

Remove `djangorestframework_simplejwt==5.5.1` and `PyJWT==2.13.0` from `neuropath-backend/requirements.txt`.

- [ ] **Step 3: Update `resources/permissions.py`**

In `neuropath-backend/resources/permissions.py:10`, replace:
```python
        # Checks if the user's JWT token is valid and active
```
with:
```python
        # Checks if the user is authenticated via DRF TokenAuthentication
```

- [ ] **Step 4: Verify check passes**

Run from `neuropath-backend`:
```bash
ruff check .
$env:DB_PASSWORD="test"; python manage.py check
```
Expected: No errors found.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/requirements.txt neuropath-backend/resources/permissions.py
git commit -m "chore(backend): remove unused simplejwt and PyJWT dependencies"
```

---

## Task 2: Remove dead Supabase storage stubs from `resources/views.py` and verify with tests

**Files:**
- Modify: `neuropath-backend/resources/tests.py`
- Modify: `neuropath-backend/resources/views.py:579-582,595-596,632,637-644,648-660,771-793,842-851,906-942`

**Interfaces:**
- `GET /api/resources/visual-aids/` produces clean `imageUrl` without `?stream_auth=verified_token_123` query parameters.
- `GET /api/resources/visual-aids/<pk>/` produces clean `imageUrl`.
- `DELETE /api/resources/visual-aids/<pk>/` deletes the record and returns HTTP 204 without calling dead cleanup stubs.
- `POST /api/resources/generate-visual-aid/` saves `imageUrl` directly from generation output without dead Supabase upload fallback.

- [ ] **Step 1: Write the failing tests in `resources/tests.py`**

Add the following tests to `ResourcesAuthAndTenantIsolationTests` in `neuropath-backend/resources/tests.py`:

```python
    def test_visual_aid_detail_returns_clean_image_url(self):
        self._auth(self.token1)
        response = self.client.get(f'/api/resources/visual-aids/{self.visual_aid.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['imageUrl'], self.visual_aid.imageUrl)
        self.assertNotIn('stream_auth', response.data['imageUrl'])

    def test_visual_aid_list_returns_clean_image_url(self):
        self._auth(self.token1)
        response = self.client.get(f'/api/resources/visual-aids/?student_id={self.student1.pk}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['imageUrl'], self.visual_aid.imageUrl)
        self.assertNotIn('stream_auth', response.data[0]['imageUrl'])

    def test_visual_aid_delete_succeeds(self):
        self._auth(self.token1)
        response = self.client.delete(f'/api/resources/visual-aids/{self.visual_aid.pk}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(VisualAid.objects.filter(pk=self.visual_aid.pk).exists())
```

- [ ] **Step 2: Run tests to verify failure**

Run from `neuropath-backend`:
```bash
$env:DB_PASSWORD="test"; python manage.py test resources.tests.ResourcesAuthAndTenantIsolationTests.test_visual_aid_detail_returns_clean_image_url
```
Expected: FAIL because `response.data['imageUrl']` currently contains `?stream_auth=verified_token_123`.

- [ ] **Step 3: Remove dead stubs and caller hooks in `resources/views.py`**

1. In `VisualAidListView.list`, remove:
```python
        # Route every image URL through the MediaStreamingService
        for item in response_data:
            item['imageUrl'] = MediaStreamingService.resolve_secure_stream_url(item['imageUrl'])
```
2. In `VisualAidDetailView.retrieve`, remove:
```python
        # Route the specific image URL through the MediaStreamingService
        response_data['imageUrl'] = MediaStreamingService.resolve_secure_stream_url(instance.imageUrl)
```
3. In `VisualAidDetailView.destroy`, remove:
```python
        # 1. Capture the file path URL before we erase the record from the database
        target_image_url = instance.imageUrl

        # 2. Drop the row from the Supabase PostgreSQL table (Classic Django ORM Link)
        self.perform_destroy(instance)

        # 3. Trigger SDD Component: StorageCleanupWorker to maintain cloud hygiene
        StorageCleanupWorker.purge_orphan_file(target_image_url)

        # 4. Return successful execution state (204 No Content is standard for clean API deletes)
        return Response(
            {"message": "Visual Aid database entry and storage file successfully deleted."},
            status=status.HTTP_204_NO_CONTENT
        )
```
Replace with:
```python
        self.perform_destroy(instance)
        return Response(
            {"message": "Visual Aid database entry successfully deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )
```
4. Delete `class SupabaseStorageManager` entirely.
5. In `VisualAidGeneratorService`, delete `upload_to_supabase` method entirely.
6. In `GenerateVisualAidAPIView.post`, replace lines 842-851:
```python
        # Try to upload to Supabase Storage for a permanent URL
        filename = f"visual-aid-{student.studentID}-{uuid.uuid4().hex[:8]}.jpg"
        final_url = pollinations_url  # default fallback
        try:
            supabase_result = VisualAidGeneratorService.upload_to_supabase(image_bytes, filename, content_type)
            if supabase_result:
                final_url = supabase_result
        except Exception:
            pass  # Supabase not configured — use Pollinations URL directly
```
with:
```python
        final_url = pollinations_url
```
7. Delete `class MediaStreamingService` entirely.
8. Delete `class StorageCleanupWorker` entirely.

- [ ] **Step 4: Run tests and linter to verify pass**

Run from `neuropath-backend`:
```bash
ruff check .
$env:DB_PASSWORD="test"; python manage.py test resources
```
Expected: All tests pass, ruff check reports all checks passed.

- [ ] **Step 5: Commit**

```bash
git add neuropath-backend/resources/views.py neuropath-backend/resources/tests.py
git commit -m "chore(resources): remove dead Supabase storage stubs and mock stream tokens"
```

---

## Task 3: Clean up documentation in `README.md`

**Files:**
- Modify: `README.md:186,389-401,443-446,456`

- [ ] **Step 1: Write the failing check**

Run:
```bash
git grep -i "simplejwt" README.md
```
Expected: Match on line 186.

- [ ] **Step 2: Update `README.md`**

1. At line 186, replace:
```markdown
| **Authentication** | Simple JWT (`djangorestframework-simplejwt`) + bcrypt | Secure teacher authentication & session management |
```
with:
```markdown
| **Authentication** | Django REST Framework TokenAuthentication (`rest_framework.authtoken`) + bcrypt | Secure teacher authentication & session management |
```
2. Remove lines 388-401 (`# SUPABASE (Direct client access — optional)` and `# AUTHENTICATION (Simple JWT)` env var blocks).
3. Remove lines 443-446 (`# SUPABASE (Frontend direct access — optional)` and `VITE_SUPABASE_*` vars).
4. Update Security Note on line 456 to remove `JWT_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY`.

- [ ] **Step 3: Verification**

Run:
```bash
git grep -i "simplejwt"
git grep -i "stream_auth"
```
Expected: Only historical plans hit (e.g. `docs/superpowers/plans/*`). No hits in active project files.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: reconcile README with actual TokenAuthentication and settings"
```

---

## Task 4: Whole-Branch Verification

- [ ] **Step 1: Run backend checks and full test suite**

Run from `neuropath-backend`:
```bash
ruff check .
$env:DB_PASSWORD="test"; python manage.py check
$env:DB_PASSWORD="test"; python manage.py test
```
Expected: Zero lint errors, system check passed, all backend test suites pass.

- [ ] **Step 2: Check git status**

Run:
```bash
git status
```
Expected: Working tree clean, clean commit history.
