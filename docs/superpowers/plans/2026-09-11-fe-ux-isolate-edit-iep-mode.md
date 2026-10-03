# Isolate Edit IEP Mode by Hiding Uneditable Sections (#134) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate the Edit IEP mode in the View IEP workspace by hiding all uneditable/read-only sections (top Edit/Delete action buttons, Post-IEP classroom tools next-step card, read-only Considerations of Special Factors, read-only Section B table, and read-only Section C goal table) and displaying an active "Editing IEP" header indicator alongside dedicated SAVE CHANGES and CANCEL footer actions.

**Architecture:** Update `ViewIEPPanel` in `neuropath-frontend/src/pages/IepGenerationPage.jsx` so that when `isEditing === true`, the top action buttons and all read-only blocks are conditionally omitted from the DOM, replaced by an active "Editing IEP" header badge and the focused `iep-edit-panel`. Provide clean cancel and save lifecycle handlers (`handleCancelEdit` / `handleSaveEdit`) that tear down edit state and cleanly restore the read-only view. Add corresponding header badge styling in `App.css`.

**Tech Stack:** React 19, Vitest, @testing-library/react, @testing-library/user-event, CSS3.

## Global Constraints

- When `isEditing === true`:
  - Top "EDIT IEP" and "DELETE IEP" buttons in `.iep-view-header` must NOT be rendered in the DOM.
  - Active header indicator badge (`✏️ Editing IEP` / `Editing IEP`) must be rendered in the header.
  - Post-IEP classroom tools card (`.iep-next-steps-card`) must NOT be rendered in the DOM.
  - Read-only Considerations of Special Factors block must NOT be rendered in the DOM.
  - Read-only Section B table and AI-generated accommodations block must NOT be rendered in the DOM.
  - Read-only Section C goal table must NOT be rendered in the DOM.
  - The edit panel (`.iep-edit-panel`) must be exclusively displayed with form controls and footer action buttons ("SAVE CHANGES", "CANCEL").
- When clicking "CANCEL":
  - Reverts any uncommitted form modifications and restores the full read-only view with original data.
- When clicking "SAVE CHANGES":
  - Persists modifications via `onUpdateIep` / `iepAPI`, resets edit mode, and displays the updated read-only view.
- Zero regressions in existing test suites with 100% test coverage for the edit isolation behavior in `IepGenerationPage.test.jsx`.

---

### Task 1: Add Unit & Integration Tests for Edit Mode Isolation in `IepGenerationPage.test.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- Consumes: `<IEPGenerationPage mode="view" initialStudentId={1} />`, `iepAPI`, `studentsAPI`
- Produces: Test suite verifying edit isolation, uneditable section omission, header badge appearance, cancel restoration, and save restoration.

- [ ] **Step 1: Write the failing tests**

Add the test block to `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`:

```jsx
  describe("Isolate Edit IEP Mode (#134)", () => {
    it("hides all read-only sections and top action buttons and displays active Editing IEP indicator in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      // Assert read-only elements and actions are present in read-only mode
      expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Instructional Support Next Steps" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Section C: Learner's Goals")).toBeInTheDocument();
      expect(screen.queryByText(/Editing IEP/i)).not.toBeInTheDocument();

      // Enter Edit Mode
      await user.click(screen.getByText("EDIT IEP"));

      // Verify header indicator is displayed
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();

      // Verify uneditable/read-only sections and top actions are removed from the DOM
      expect(screen.queryByRole("button", { name: /^EDIT IEP$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^DELETE IEP$/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Instructional Support Next Steps" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Considerations of Special Factors")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Section C: Learner's Goals")).not.toBeInTheDocument();

      // Verify edit form controls and footer actions are present
      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Edit Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Edit Section C: Learner's Goals")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^SAVE CHANGES$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^CANCEL$/i })).toBeInTheDocument();
    });

    it("restores read-only view cleanly upon clicking CANCEL without leaving edit artifacts", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();
      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();

      // Click CANCEL
      await user.click(screen.getByRole("button", { name: /^CANCEL$/i }));

      // Verify read-only view is restored
      expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Instructional Support Next Steps" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Section C: Learner's Goals")).toBeInTheDocument();

      // Verify edit panel is no longer in DOM
      expect(
        screen.queryByText("Edit Considerations of Special Factors"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Editing IEP/i)).not.toBeInTheDocument();
    });

    it("restores read-only view cleanly upon clicking SAVE CHANGES", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        generatedDetails: {
          specialFactorNotes: "Sensitive to sudden auditory alarms and loud bells.",
        },
      });

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.queryByText("Edit Considerations of Special Factors"),
      ).not.toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/IepGenerationPage.test.jsx`
Expected: FAIL because uneditable sections (e.g. `Instructional Support Next Steps`, `Considerations of Special Factors`, etc.) and top action buttons are currently still in the DOM when `isEditing === true`.

---

### Task 2: Implement Edit Mode Isolation in `IepGenerationPage.jsx` and CSS in `App.css`

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/App.css`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- Consumes: `isEditing`, `openEdit`, `handleSaveEdit`, `handleCancelEdit`
- Produces: Cleanly isolated Edit Mode UI with header indicator and omitted read-only sections.

- [ ] **Step 1: Update `ViewIEPPanel` in `IepGenerationPage.jsx`**

1. Add `handleCancelEdit`:
```jsx
  const handleCancelEdit = () => {
    setIsEditing(false);
    setGoalsToDelete([]);
    setEditSpecialFactorNotes(
      details?.specialFactorNotes || details?.special_factor_notes || "",
    );
    setEditBarrierRows(
      barrierRowsToRender.length
        ? barrierRowsToRender.map((r) => ({ ...r }))
        : [],
    );
    setEditGoals(
      goalsToRender.length
        ? goalsToRender.map((goal) => ({
            ...goal,
            rows: (goal.rows || []).map((row) => ({ ...row })),
          }))
        : [],
    );
  };
```

2. In the header `.iep-view-header`:
```jsx
          <div className="iep-view-header">
            <div>
              <span>Student</span>
              <div className="iep-view-title-row">
                <h3>
                  {selectedIep.studentName ||
                    getStudentName(selectedStudent) ||
                    "—"}
                </h3>
                {isEditing && (
                  <span className="iep-editing-badge" role="status" aria-label="Editing IEP Mode">
                    ✏️ Editing IEP
                  </span>
                )}
              </div>
              <p>
                Grade {selectedStudent.grade || "—"} · Age{" "}
                {selectedStudent.age || "—"}
              </p>
            </div>
            {!isEditing && (
              <div className="iep-view-actions">
                <button className="btn btn-back" onClick={openEdit}>
                  EDIT IEP
                </button>
                <button
                  className="btn iep-btn-danger"
                  onClick={() => setDeleteTarget(selectedIep)}
                >
                  DELETE IEP
                </button>
              </div>
            )}
          </div>
```

3. Wrap Post-IEP Next Steps card and read-only Section B / Section C blocks with `!isEditing`:
```jsx
          {/* Post-IEP Next Steps / Classroom Tools */}
          {!isEditing && (
            <section
              className="iep-next-steps-card"
              aria-label="Instructional Support Next Steps"
            >
              ...
            </section>
          )}

          {/* Inline edit panel */}
          {isEditing && (
            <div className="iep-edit-panel">
              ...
              <div className="iep-edit-actions">
                <button
                  type="button"
                  className="btn btn-back"
                  onClick={handleCancelEdit}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="btn btn-submit"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? "SAVING…" : "SAVE CHANGES"}
                </button>
              </div>
            </div>
          )}

          {/* Read-only sections only rendered when !isEditing */}
          {!isEditing && (
            <>
              {/* Considerations of Special Factors */}
              {(details?.specialFactorNotes || details?.special_factor_notes) && (
                <div style={{ marginBottom: 20 }}>
                  <h3 className="iep-view-section-title">
                    Considerations of Special Factors
                  </h3>
                  <InfoBlock title="Other Special Factor Notes">
                    {details?.specialFactorNotes || details?.special_factor_notes}
                  </InfoBlock>
                </div>
              )}

              {/* Section B read-only */}
              <div>
                <h3 className="iep-view-section-title">
                  Section B: Difficulties, Barriers, and Enabling Supports
                </h3>
                <div className="iep-table-wrap">
                  <table className="iep-table">
                    ...
                  </table>
                </div>
                {(details?.generatedAccommodations ||
                  selectedIep.accommodations) && (
                  <InfoBlock title="AI-Generated Accommodations / Resources">
                    {details?.generatedAccommodations || selectedIep.accommodations}
                  </InfoBlock>
                )}
              </div>

              {/* Section C: goals from DB */}
              <div>
                <h3 className="iep-view-section-title">
                  Section C: Learner's Goals
                </h3>
                ...
              </div>
            </>
          )}
```

- [ ] **Step 2: Add CSS rules in `App.css`**

Add styling for `.iep-view-title-row` and `.iep-editing-badge`:

```css
.iep-view-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.iep-editing-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #4338ca;
  font-size: 12.5px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  letter-spacing: 0.2px;
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/pages/IepGenerationPage.test.jsx`
Expected: PASS (all tests green)

- [ ] **Step 4: Run full test suite to ensure 0 regressions**

Run: `npx vitest run`
Expected: 28 test files passed (211+ tests passing)

- [ ] **Step 5: Commit changes**

```bash
git add neuropath-frontend/src/pages/IepGenerationPage.jsx neuropath-frontend/src/pages/IepGenerationPage.test.jsx neuropath-frontend/src/App.css
git commit -m "feat: isolate edit IEP mode by hiding uneditable sections (#134)"
```

---

### Task 3: Final Verification & PR Preparation

- [ ] **Step 1: Verify all tests pass with fresh evidence**
- [ ] **Step 2: Check git status and diff**
- [ ] **Step 3: Push branch and create Pull Request using requested template**
