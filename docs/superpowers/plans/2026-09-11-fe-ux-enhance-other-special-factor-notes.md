# Enhance 'Other special factor notes' UX with Contextual Suggestions and Character Count (#128) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the "Other special factor notes" input in both IEP generation and inline IEP editing with contextual preset suggestion chips, live character count with a 500-character limit, a quick clear action, and WCAG-compliant helper guidance.

**Architecture:** Create an enhanced `SpecialFactorNotesField` component in `IepGenerationPage.jsx` and styling in `App.css`. Integrate preset suggestion chips (`SPECIAL_FACTOR_NOTES_PRESETS`) for behavioral, sensory, communication, and motor accommodations. Wire live character counting (`0 / 500`), max length enforcement, and quick clearing into both Step 1 generation state (`form.specialFactorNotes`) and edit mode state (`editSpecialFactorNotes`).

**Tech Stack:** React 19, Vitest, @testing-library/react, @testing-library/user-event, CSS3.

## Global Constraints

- Max character length for "Other special factor notes": 500 characters.
- Preset suggestions must cover 6 primary SPED domains: Behavior Support Plan, Sensory Sensitivity, Non-verbal / AAC, Visual Schedules, Fine Motor Fatigue, and Routine / Transitions.
- Textarea must enforce `maxLength={500}` and have `aria-describedby` pointing to helper text / character count.
- Preset chips must append to existing notes cleanly (using `; ` separator) without exceeding the 500-character ceiling.
- Preset chips must be disabled when the note is at capacity or adding the preset would exceed 500 characters.
- Must support both Step 1 IEP Generation form and the Inline Edit mode modal/panel.
- Full test coverage with automated unit & integration tests in `IepGenerationPage.test.jsx`.

---

### Task 1: Define Special Factor Notes Presets and Enhanced Field Component in `IepGenerationPage.jsx`

**Files:**
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx:84-110`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx:844-854`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx:2160-2170`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- Consumes: `form.specialFactorNotes`, `setField`, `editSpecialFactorNotes`, `setEditSpecialFactorNotes`
- Produces: `SPECIAL_FACTOR_NOTES_PRESETS`, `MAX_SPECIAL_FACTOR_NOTES_LENGTH`, `SpecialFactorNotesField`

- [ ] **Step 1: Write the failing tests for Preset Chips, Character Counter, and Max Limit**

Add tests to `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`:

```jsx
  describe("Other Special Factor Notes UX Enhancements (#128)", () => {
    it("renders all 6 preset suggestion chips, helper text, and character counter in Step 1", async () => {
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      // Verify preset chips
      expect(screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Sensory sensitivity: frequent quiet breaks/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Non-verbal communication: requires AAC/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Visual schedules & explicit verbal cues/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Fine motor fatigue: allow speech-to-text/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Transition warnings & structured routine/i })).toBeInTheDocument();

      // Verify character counter initial state
      expect(screen.getByText(/0 \/ 500 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Notes guide AI goal synthesis/i)).toBeInTheDocument();
    });

    it("clicking preset chips appends text with clean formatting and updates character count", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      await user.click(pbspChip);

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      expect(textarea).toHaveValue("Positive Behavior Support Plan (PBSP) active");
      expect(screen.getByText(/44 \/ 500 characters/i)).toBeInTheDocument();

      const sensoryChip = screen.getByRole("button", { name: /\+ Sensory sensitivity: frequent quiet breaks/i });
      await user.click(sensoryChip);

      expect(textarea.value).toContain("Positive Behavior Support Plan (PBSP) active; Sensory sensitivity: frequent quiet breaks");
    });

    it("provides a Clear Notes button when text is present", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      await user.click(pbspChip);

      const clearBtn = screen.getByRole("button", { name: /Clear notes/i });
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      expect(textarea).toHaveValue("");
      expect(screen.getByText(/0 \/ 500 characters/i)).toBeInTheDocument();
    });

    it("enforces 500 character maximum limit and disables preset chips when capacity reached", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      const longText = "A".repeat(500);
      await user.type(textarea, longText);

      expect(screen.getByText(/500 \/ 500 characters \(Maximum reached\)/i)).toBeInTheDocument();

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      expect(pbspChip).toBeDisabled();
    });

    it("renders preset chips, character counter, and edit support in Edit Mode", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Edit IEP/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Edit IEP/i }));

      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /\+ Positive Behavior Support Plan/i }).length).toBeGreaterThanOrEqual(1);

      const editTextarea = screen.getAllByPlaceholderText(/Add notes about behavior, communication, sensory/i)[0];
      expect(editTextarea).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/IepGenerationPage.test.jsx`
Expected: FAIL because preset chips and character counter are not yet implemented in `SpecialFactorNotesField`.

- [ ] **Step 3: Implement `SPECIAL_FACTOR_NOTES_PRESETS`, `SpecialFactorNotesField`, and integrate into Step 1 & Edit Mode**

In `neuropath-frontend/src/pages/IepGenerationPage.jsx`:

1. Define constants:
```javascript
export const MAX_SPECIAL_FACTOR_NOTES_LENGTH = 500;

export const SPECIAL_FACTOR_NOTES_PRESETS = [
  "Positive Behavior Support Plan (PBSP) active",
  "Sensory sensitivity: frequent quiet breaks",
  "Non-verbal communication: requires AAC",
  "Visual schedules & explicit verbal cues",
  "Fine motor fatigue: allow speech-to-text",
  "Transition warnings & structured routine",
];
```

2. Implement `SpecialFactorNotesField`:
```javascript
function SpecialFactorNotesField({
  value = "",
  onChange,
  label = "Other special factor notes",
  placeholder = "Add notes about behavior, communication, sensory, or other special factors.",
  id = "special-factor-notes-input",
}) {
  const currentLength = value?.length || 0;
  const isLimitReached = currentLength >= MAX_SPECIAL_FACTOR_NOTES_LENGTH;
  const isNearLimit = currentLength >= MAX_SPECIAL_FACTOR_NOTES_LENGTH * 0.9;

  const handleAddPreset = (preset) => {
    if (isLimitReached) return;
    const trimmed = (value || "").trim();
    if (!trimmed) {
      onChange(preset.slice(0, MAX_SPECIAL_FACTOR_NOTES_LENGTH));
      return;
    }
    if (trimmed.toLowerCase().includes(preset.toLowerCase())) return;
    const appended = `${trimmed}; ${preset}`;
    onChange(appended.slice(0, MAX_SPECIAL_FACTOR_NOTES_LENGTH));
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="form-group iep-special-notes-field">
      <div className="iep-special-notes-header">
        <label htmlFor={id} className="form-label">
          {label}
        </label>
        {currentLength > 0 && (
          <button
            type="button"
            className="iep-notes-clear-btn"
            onClick={handleClear}
            aria-label="Clear notes"
          >
            ✕ Clear notes
          </button>
        )}
      </div>

      <div className="iep-preset-chips-container">
        <span className="iep-preset-chips-label">Quick Suggestions:</span>
        <div className="iep-preset-chips-list">
          {SPECIAL_FACTOR_NOTES_PRESETS.map((preset) => {
            const wouldExceed =
              currentLength + (currentLength > 0 ? 2 : 0) + preset.length >
              MAX_SPECIAL_FACTOR_NOTES_LENGTH;
            const isDisabled = isLimitReached || wouldExceed;
            return (
              <button
                key={preset}
                type="button"
                className="iep-preset-chip"
                onClick={() => handleAddPreset(preset)}
                disabled={isDisabled}
                title={isDisabled ? "Note character limit reached" : `Add note: ${preset}`}
              >
                + {preset}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        id={id}
        rows={3}
        maxLength={MAX_SPECIAL_FACTOR_NOTES_LENGTH}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-textarea iep-special-notes-textarea"
        aria-describedby={`${id}-helper ${id}-counter`}
      />

      <div className="iep-textarea-footer">
        <span id={`${id}-helper`} className="iep-notes-helper">
          Notes guide AI goal synthesis and classroom accommodations.
        </span>
        <span
          id={`${id}-counter`}
          className={`iep-char-counter ${
            isLimitReached
              ? "iep-char-limit-reached"
              : isNearLimit
              ? "iep-char-limit-warning"
              : ""
          }`}
        >
          {currentLength} / {MAX_SPECIAL_FACTOR_NOTES_LENGTH} characters
          {isLimitReached ? " (Maximum reached)" : ""}
        </span>
      </div>
    </div>
  );
}
```

3. Replace the plain `TextAreaField` instances for "Other special factor notes" in both Edit Mode (around line 846) and Generation Step 1 (around line 2162) with `<SpecialFactorNotesField value={...} onChange={...} />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/IepGenerationPage.test.jsx`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add neuropath-frontend/src/pages/IepGenerationPage.jsx neuropath-frontend/src/pages/IepGenerationPage.test.jsx
git commit -m "feat(frontend): add preset suggestion chips and character count for special factor notes (#128)"
```

---

### Task 2: Add CSS Styling in `App.css` for Enhanced Special Factor Notes UI

**Files:**
- Modify: `neuropath-frontend/src/App.css:1510-1550`
- Test: `neuropath-frontend/src/pages/IepGenerationPage.test.jsx`

**Interfaces:**
- Consumes: `.iep-special-notes-field`, `.iep-special-notes-header`, `.iep-notes-clear-btn`, `.iep-textarea-footer`, `.iep-notes-helper`, `.iep-char-counter`, `.iep-char-limit-warning`, `.iep-char-limit-reached`

- [ ] **Step 1: Add CSS rules for special factor notes UI**

In `neuropath-frontend/src/App.css`:

```css
/* ── Special Factor Notes UX Enhancements ───────────────────────────────── */
.iep-special-notes-field {
  margin-top: 18px;
  margin-bottom: 22px;
}

.iep-special-notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.iep-special-notes-header .form-label {
  margin-bottom: 0;
  font-weight: 600;
  color: #1e293b;
}

.iep-notes-clear-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.iep-notes-clear-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

.iep-special-notes-textarea {
  resize: vertical;
  min-height: 80px;
  width: 100%;
}

.iep-textarea-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
}

.iep-notes-helper {
  color: #64748b;
  font-size: 12px;
}

.iep-char-counter {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-left: auto;
}

.iep-char-limit-warning {
  color: #d97706;
  font-weight: 600;
}

.iep-char-limit-reached {
  color: #dc2626;
  font-weight: 700;
}
```

- [ ] **Step 2: Run full test suite & lint verification**

Run: `npm test` and `npm run lint` in `neuropath-frontend`
Expected: All tests pass with zero lint errors.

- [ ] **Step 3: Commit**

```bash
git add neuropath-frontend/src/App.css
git commit -m "style(frontend): add styling for special factor notes suggestions and character counter (#128)"
```

---

### Task 3: Full Branch Verification & PR Creation

**Files:**
- Test all components
- Verify WCAG accessibility & axe tests

- [ ] **Step 1: Run comprehensive tests across all frontend test suites**

Run: `npm test`
Expected: 28/28 test suites passing.

- [ ] **Step 2: Run ESLint check**

Run: `npm run lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Execute PR creation with PR template**

Fill in the PR template with title:
`feat: enhance other special factor notes with suggestions and character count (#128)`
and complete body.
