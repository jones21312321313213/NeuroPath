# Direct PDF Download for View Student Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the "EXPORT PDF" button in `ViewStudentRecords.jsx` to the backend `/api/tracking/student-records/{studentId}/export/` endpoint to download a formatted `.pdf` document directly without triggering the browser's physical print dialogue.

**Architecture:** Add `exportStudentRecordPDF` to `trackingAPI` in `client.js` returning a raw binary `Blob`. In `ViewStudentRecords.jsx`, replace the popup `window.print()` logic with an async download handler that triggers a download via `URL.createObjectURL(blob)`, sets `link.download = StudentRecord_<StudentName>.pdf`, revokes the object URL via `URL.revokeObjectURL`, and provides visual loading state ("Exporting PDF...") and accessible error feedback. Enhance backend `BinaryReportRenderEngine` to include Section B and Section C in the PDF stream.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, ReportLab, Django 6, Django REST Framework.

## Global Constraints
- Clicking "EXPORT PDF" must trigger a direct file download (`StudentRecord_<StudentName>.pdf`) and never invoke `window.print()` or open blank popup windows.
- In `client.js`, `trackingAPI.exportStudentRecordPDF` must handle token authorization headers and check HTTP response status.
- Object URLs created via `URL.createObjectURL` must be cleanly revoked with `URL.revokeObjectURL` to avoid memory leaks.
- Visual loading state ("Exporting PDF...") and accessible error messages (`role="alert"`) must be provided.
- Backend `BinaryReportRenderEngine` should include complete student profile, baseline, Section B difficulties & accommodations, and Section C learner goals when present.
- All automated unit tests in `ViewStudentRecords.test.jsx`, `client.test.js`, and backend tracking tests must pass (100% green).

---

### Task 1: Add `exportStudentRecordPDF` to `trackingAPI` in `src/api/client.js` with Unit Tests

**Files:**
- Modify: `neuropath-frontend/src/api/client.js:265-279`
- Modify: `neuropath-frontend/src/api/client.test.js:217-258`

**Interfaces:**
- Consumes: `studentId: number|string`
- Produces: `trackingAPI.exportStudentRecordPDF(studentId): Promise<Blob>`

- [ ] **Step 1: Write failing unit test in `src/api/client.test.js`**

Add tests for `trackingAPI.exportStudentRecordPDF` in `neuropath-frontend/src/api/client.test.js`:
```javascript
    it("fetches student record pdf as a blob with auth header", async () => {
      localStorage.setItem("neuropath_access_token", "test-token");
      const mockBlob = new Blob(["mock-pdf-content"], { type: "application/pdf" });
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const blob = await trackingAPI.exportStudentRecordPDF(15);

      expect(blob).toBe(mockBlob);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tracking/student-records/15/export/",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Token test-token",
          }),
        }),
      );
    });

    it("throws an error when exportStudentRecordPDF request fails", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "Export engine failure." }),
      });

      await expect(trackingAPI.exportStudentRecordPDF(15)).rejects.toThrow(
        "Export engine failure.",
      );
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/client.test.js`
Expected: FAIL (`trackingAPI.exportStudentRecordPDF is not a function`)

- [ ] **Step 3: Implement `exportStudentRecordPDF` in `src/api/client.js`**

In `neuropath-frontend/src/api/client.js`:
```javascript
export const trackingAPI = {
  getProgressDashboard: (studentId) =>
    request(`/tracking/progress-dashboard/?studentID=${studentId}`),
  getAnalytics: (studentId, subject) => {
    const params = new URLSearchParams({ studentID: studentId });
    if (subject) params.append("subject", subject);
    return request(`/tracking/analytics/?${params.toString()}`);
  },
  recordProgress: (payload) =>
    request("/tracking/analytics/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportStudentRecordPDF: async (studentId) => {
    const token = localStorage.getItem("neuropath_access_token");
    const headers = {
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };

    const response = await fetch(
      `${BASE_URL}/tracking/student-records/${studentId}/export/`,
      { headers },
    );

    if (!response.ok) {
      if (response.status === 401 && token) {
        forceReauth();
      }
      let message = "Failed to export student record PDF.";
      try {
        const data = await response.json();
        message = data.errors || data.detail || data.error || message;
      } catch {
        // Fallback to default message
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return await response.blob();
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/client.test.js`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit changes**

```bash
git add neuropath-frontend/src/api/client.js neuropath-frontend/src/api/client.test.js
git commit -m "feat(api): add exportStudentRecordPDF to trackingAPI client (#143)"
```

---

### Task 2: Enhance Backend `BinaryReportRenderEngine` to Include Section B & Section C

**Files:**
- Modify: `neuropath-backend/tracking/views.py:75-218`
- Modify: `neuropath-backend/tracking/tests.py:14-57`

**Interfaces:**
- Consumes: `student_record: StudentProfile` (with related `ieps`, `individual_goals`, `objective_rows`)
- Produces: PDF byte stream `io.BytesIO` with complete profile, Section B factors, and Section C goals

- [ ] **Step 1: Write backend tests in `neuropath-backend/tracking/tests.py`**

Add tests in `tracking/tests.py` verifying that when a student has an IEP with Section B factors and Section C learner goals, they are rendered in the exported PDF stream.

- [ ] **Step 2: Run backend tests to verify expected behavior**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME=":memory:"; python manage.py test tracking`
Expected: PASS / Verification

- [ ] **Step 3: Update `BinaryReportRenderEngine` in `tracking/views.py`**

Add Section B table and Section C learner goals rendering flowables to `BinaryReportRenderEngine.generate_report_stream`.

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `$env:DB_ENGINE="django.db.backends.sqlite3"; $env:DB_NAME=":memory:"; python manage.py test tracking`
Expected: PASS (all 20+ tests pass)

- [ ] **Step 5: Commit backend changes**

```bash
git add neuropath-backend/tracking/views.py neuropath-backend/tracking/tests.py
git commit -m "feat(backend): render Section B and Section C in student record PDF export (#143)"
```

---

### Task 3: Replace Print Dialog with Direct PDF Blob Download in `ViewStudentRecords.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/ViewStudentRecords.jsx`
- Modify: `neuropath-frontend/src/styles/ViewStudentRecords.css`

**Interfaces:**
- Consumes: `trackingAPI.exportStudentRecordPDF`, `selected.studentID`, `recordData.name`
- Produces: Direct client-side file download `StudentRecord_<StudentName>.pdf`, `isExporting` loading state, `exportError` alert

- [ ] **Step 1: Update `PageSectionBC` in `ViewStudentRecords.jsx`**

Replace `window.print()` with async PDF export handler:
1. Accept `studentId`, `studentName` (or `selected`, `recordData`).
2. Add `isExporting` and `exportError` state.
3. `handleExport` invokes `trackingAPI.exportStudentRecordPDF(studentId)`:
   - Sets `isExporting(true)` and `setExportError("")`.
   - On receiving blob:
     - `const url = window.URL.createObjectURL(blob);`
     - `const link = document.createElement("a");`
     - `link.href = url;`
     - `link.download = 'StudentRecord_' + (studentName || "Student").replace(/\s+/g, "_") + '.pdf';`
     - `document.body.appendChild(link); link.click(); document.body.removeChild(link);`
     - `window.URL.revokeObjectURL(url);`
   - On error:
     - `setExportError(err.message || "Failed to export PDF. Please try again.");`
   - In `finally`:
     - `setIsExporting(false);`
4. Update UI button:
   - Text shows `isExporting ? "Exporting PDF..." : "EXPORT PDF"`.
   - Button is disabled when `isExporting` is true.
   - Display error alert `{exportError && <div role="alert" className="vsr-export-error">{exportError}</div>}`.

- [ ] **Step 2: Commit frontend component changes**

```bash
git add neuropath-frontend/src/pages/ViewStudentRecords.jsx neuropath-frontend/src/styles/ViewStudentRecords.css
git commit -m "fix(frontend): replace print popup with direct blob PDF download (#143)"
```

---

### Task 4: Comprehensive Unit Tests in `ViewStudentRecords.test.jsx`

**Files:**
- Create: `neuropath-frontend/src/pages/ViewStudentRecords.test.jsx`

**Interfaces:**
- Tests: Student list rendering, search, navigation through steps, export PDF click, blob creation, anchor download click, `revokeObjectURL`, loading state, and error alert handling.

- [ ] **Step 1: Write tests in `ViewStudentRecords.test.jsx`**

Test scenarios:
1. Renders student list and filters on search.
2. Selects a student and steps through Section A, Present Levels, and Section B & C.
3. Clicking "EXPORT PDF" calls `trackingAPI.exportStudentRecordPDF` with student ID.
4. Triggers anchor click with `download="StudentRecord_<Name>.pdf"`, creates object URL, and calls `URL.revokeObjectURL`.
5. Displays "Exporting PDF..." and disables the export button while request is in progress.
6. Displays accessible `role="alert"` when export fails.

- [ ] **Step 2: Run test suite**

Run: `npx vitest run src/pages/ViewStudentRecords.test.jsx`
Expected: PASS

- [ ] **Step 3: Commit test file**

```bash
git add neuropath-frontend/src/pages/ViewStudentRecords.test.jsx
git commit -m "test: add comprehensive unit tests for ViewStudentRecords export PDF (#143)"
```

---

### Task 5: Full Verification and PR Creation

**Files:**
- Verify all modified files

- [ ] **Step 1: Run all frontend unit tests**
- [ ] **Step 2: Run all backend tests**
- [ ] **Step 3: Push branch and create Pull Request using project template**

---
