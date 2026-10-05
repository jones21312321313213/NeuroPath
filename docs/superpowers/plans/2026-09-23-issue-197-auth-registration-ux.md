# Issue #197: Authentication & Registration UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 5 QA findings (ENH01–ENH05) from [Issue #197](https://github.com/jones21312321313213/NeuroPath/issues/197) to provide a polished, accessible, and self-guided authentication experience for SPED educators.

**Architecture:**
1. Implement an accessible `ForgotPasswordModal` on the login page enabling self-service password recovery instructions and administrative contact.
2. Build an interactive, live `PasswordStrengthMeter` component with real-time rule checklist feedback (length $\ge 8$, uppercase, lowercase, number, special char) for registration and profile passwords.
3. Standardize required field indicators (red `*`, `aria-required="true"`, and form legends) across Authentication, Student Profiling, IEP, and Teacher Profile pages.
4. Wire automatic post-registration login via `AuthContext.login()` so newly registered teachers immediately enter the application without manual credential re-entry.

**Tech Stack:** React 19, Tailwind CSS, Vite 8, Vitest, React Router 7.

## Global Constraints
- Zero regressions in existing authentication, session timeout, or tutorial workflows.
- Minimum password length standard must be at least 8 characters to match Django backend validators.
- Maintain full accessibility: `role="dialog"`, keyboard `Esc` dismiss, `aria-required="true"`, high contrast.
- 100% test pass rate across all unit tests in `neuropath-frontend`.

---

### Task 1: Implement Forgot Password Modal (ENH01)

**Files:**
- Create: `neuropath-frontend/src/components/auth/ForgotPasswordModal.jsx`
- Create: `neuropath-frontend/src/components/auth/ForgotPasswordModal.test.jsx`
- Modify: `neuropath-frontend/src/pages/loginPage.jsx`
- Modify: `neuropath-frontend/src/pages/loginPage.test.jsx`

**Interfaces:**
- Consumes: `isOpen`, `onClose`
- Produces: Modal dialog allowing teachers to request password reset instructions

- [ ] **Step 1: Write test for ForgotPasswordModal**

Create `neuropath-frontend/src/components/auth/ForgotPasswordModal.test.jsx`:
```javascript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForgotPasswordModal from "./ForgotPasswordModal";

describe("ForgotPasswordModal", () => {
  it("renders modal when isOpen is true", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<ForgotPasswordModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close or back button is clicked", () => {
    const handleClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("shows success confirmation after submitting a valid email", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: "teacher@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset instructions/i }));
    expect(screen.getByText(/instructions have been sent/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test src/components/auth/ForgotPasswordModal.test.jsx
```
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implement `ForgotPasswordModal.jsx`**

Create `neuropath-frontend/src/components/auth/ForgotPasswordModal.jsx`:
```javascript
import { useState, useEffect } from "react";
import { CloseIcon, CheckIcon, WarningIcon } from "../ui/icons";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setSubmitted(false);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <CloseIcon className="w-5 h-5" aria-hidden="true" />
        </button>

        <h2
          id="forgot-password-title"
          className="text-xl font-bold text-slate-900 mb-2"
        >
          Reset Your Password
        </h2>

        {submitted ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-700">
              If an account exists for <span className="font-bold text-slate-900">{email}</span>, password reset instructions have been sent.
            </p>
            <p className="text-xs text-slate-500">
              For staging/school deployments, you may also reach out directly to your designated school administrator.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all text-sm mt-2"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <p className="text-sm text-slate-600">
              Enter your registered email address and we'll provide instructions to reset your account password.
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                <WarningIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-bold uppercase tracking-wider text-primary"
              >
                Email Address <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                id="reset-email"
                type="email"
                required
                aria-required="true"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="teacher@school.edu"
                className="w-full px-4 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-all"
              >
                Send Reset Instructions
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Integrate Forgot Password Trigger in `loginPage.jsx`**

Add "Forgot Password?" trigger adjacent to password label in `loginPage.jsx`:
```jsx
<div className="flex items-center justify-between">
  <label
    htmlFor="password"
    className="text-xs font-bold uppercase tracking-wider"
    style={{ color: "#1a6fa8" }}
  >
    Password <span className="text-rose-500" aria-hidden="true">*</span>
  </label>
  <button
    type="button"
    onClick={() => setShowForgotModal(true)}
    className="text-xs font-bold hover:underline transition-colors outline-none"
    style={{ color: "#2589c7" }}
  >
    Forgot Password?
  </button>
</div>
```

- [ ] **Step 5: Run tests to verify pass**

Run:
```bash
npm test src/components/auth/ForgotPasswordModal.test.jsx
npm test src/pages/loginPage.test.jsx
```
Expected: PASS

---

### Task 2: Live Password Strength Meter & Interactive Rule Checklist (ENH02, ENH04)

**Files:**
- Create: `neuropath-frontend/src/components/auth/PasswordStrengthMeter.jsx`
- Create: `neuropath-frontend/src/components/auth/PasswordStrengthMeter.test.jsx`
- Modify: `neuropath-frontend/src/pages/registerPage.jsx`
- Create: `neuropath-frontend/src/pages/registerPage.test.jsx`

**Interfaces:**
- Consumes: `password` string
- Produces: Visual strength meter bar (Weak, Medium, Strong) and checklist of 5 password rules

- [ ] **Step 1: Write test for PasswordStrengthMeter**

Create `neuropath-frontend/src/components/auth/PasswordStrengthMeter.test.jsx`:
```javascript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PasswordStrengthMeter, { evaluatePasswordRules } from "./PasswordStrengthMeter";

describe("evaluatePasswordRules", () => {
  it("evaluates all criteria correctly", () => {
    const res = evaluatePasswordRules("Abc!1234");
    expect(res.hasLength).toBe(true);
    expect(res.hasUpper).toBe(true);
    expect(res.hasLower).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.hasSpecial).toBe(true);
    expect(res.score).toBe(5);
    expect(res.strengthLabel).toBe("Strong");
  });

  it("marks weak password correctly", () => {
    const res = evaluatePasswordRules("abc");
    expect(res.hasLength).toBe(false);
    expect(res.strengthLabel).toBe("Weak");
  });
});

describe("PasswordStrengthMeter component", () => {
  it("renders checklist items", () => {
    render(<PasswordStrengthMeter password="Password123!" />);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `PasswordStrengthMeter.jsx`**

Create `neuropath-frontend/src/components/auth/PasswordStrengthMeter.jsx`:
```javascript
import { CheckIcon, CloseIcon } from "../ui/icons";

export function evaluatePasswordRules(password = "") {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const rules = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial];
  const passedCount = rules.filter(Boolean).length;

  let strengthLabel = "Weak";
  let colorClass = "bg-rose-500";
  let percent = 20;

  if (passedCount >= 5 && hasLength) {
    strengthLabel = "Strong";
    colorClass = "bg-emerald-500";
    percent = 100;
  } else if (passedCount >= 3 && hasLength) {
    strengthLabel = "Medium";
    colorClass = "bg-amber-500";
    percent = 65;
  } else if (password.length > 0) {
    strengthLabel = "Weak";
    colorClass = "bg-rose-500";
    percent = 30;
  } else {
    percent = 0;
  }

  return {
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    passedCount,
    strengthLabel,
    colorClass,
    percent,
    isValid: hasLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

export default function PasswordStrengthMeter({ password = "", showChecklist = true }) {
  const result = evaluatePasswordRules(password);

  const checklist = [
    { key: "len", label: "At least 8 characters", met: result.hasLength },
    { key: "upper", label: "At least one uppercase letter (A-Z)", met: result.hasUpper },
    { key: "lower", label: "At least one lowercase letter (a-z)", met: result.hasLower },
    { key: "num", label: "At least one number (0-9)", met: result.hasNumber },
    { key: "special", label: "At least one special character (!@#$%...)", met: result.hasSpecial },
  ];

  return (
    <div className="space-y-2 mt-1.5" aria-live="polite">
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Password strength:</span>
            <span className={result.strengthLabel === "Strong" ? "text-emerald-600" : result.strengthLabel === "Medium" ? "text-amber-600" : "text-rose-600"}>
              {result.strengthLabel}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${result.colorClass}`}
              style={{ width: `${result.percent}%` }}
            />
          </div>
        </div>
      )}

      {showChecklist && (
        <ul className="text-xs space-y-1 pt-1 text-slate-600">
          {checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              {item.met ? (
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-300 font-bold shrink-0">•</span>
              )}
              <span className={item.met ? "text-emerald-700 font-medium" : "text-slate-500"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `registerPage.jsx` with upfront requirements & live meter**

In `registerPage.jsx`:
- Display `PasswordStrengthMeter` directly beneath the password input.
- Update `validate()` to enforce `password.length >= 8` and require all criteria before submitting.

- [ ] **Step 4: Write tests for `registerPage.jsx`**

Create `neuropath-frontend/src/pages/registerPage.test.jsx`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RegisterPage from "./registerPage";
import { AuthProvider } from "../context/AuthContext";

describe("RegisterPage", () => {
  it("renders registration inputs with required indicators", () => {
    render(
      <AuthProvider>
        <RegisterPage onNavigateLogin={vi.fn()} />
      </AuthProvider>
    );
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("displays password requirement checklist upfront", () => {
    render(
      <AuthProvider>
        <RegisterPage onNavigateLogin={vi.fn()} />
      </AuthProvider>
    );
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests to verify pass**

Run:
```bash
npm test src/components/auth/PasswordStrengthMeter.test.jsx
npm test src/pages/registerPage.test.jsx
```
Expected: PASS

---

### Task 3: Standardize Required Field Indicators Across Core Forms (ENH03)

**Files:**
- Modify: `neuropath-frontend/src/pages/loginPage.jsx`
- Modify: `neuropath-frontend/src/pages/registerPage.jsx`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/UserProfilePage.jsx`

**Interfaces:**
- Consumes: Form field labels
- Produces: Uniform red asterisk (`*`), `aria-required="true"`, and accessibility guidelines on all mandatory inputs

- [ ] **Step 1: Update `loginPage.jsx` and `registerPage.jsx` labels**
Add `<span className="text-rose-500" aria-hidden="true">*</span>` and `aria-required="true"` to mandatory fields.

- [ ] **Step 2: Update `CreateStudentProfile.jsx` & `UpdateStudentProfile.jsx` FormField / SelectField**
Add `required` prop support with red asterisk and `aria-required="true"` to:
- Learner's Name (`required`)
- Age (`required`)
- Grade (`required`)
- Gender (`required`)
- Guardian Name & Relationship (`required` when parental consent is checked)
- Step 2 Present Levels: Evaluation Results, Academic Strengths, Academic Needs, Parental Concerns, Curriculum Impact.

- [ ] **Step 3: Update `UserProfilePage.jsx`**
Add required indicators to First Name, Last Name, and Email inputs.

- [ ] **Step 4: Run form tests to verify no broken selectors or layouts**

Run:
```bash
npm test src/pages/CreateStudentProfile.test.jsx
npm test src/pages/StudentProfiling/UpdateStudentProfile.test.jsx
```
Expected: PASS

---

### Task 4: Automated Post-Registration Login & Session Redirect (ENH05)

**Files:**
- Modify: `neuropath-frontend/src/pages/registerPage.jsx`
- Modify: `neuropath-frontend/src/App.jsx`
- Modify: `neuropath-frontend/src/pages/registerPage.test.jsx`

**Interfaces:**
- Consumes: `login()` from `AuthContext`
- Produces: Instant authentication and redirect to `/dashboard` upon successful registration

- [ ] **Step 1: Update `registerPage.jsx` submit handler**

In `registerPage.jsx`:
```javascript
export default function RegisterPage({ onNavigateLogin, onRegisterSuccess }) {
  const { register, login } = useAuth();
  ...
  const handleSubmit = async (e) => {
    e.preventDefault();
    ...
    try {
      await register(payload);

      // ENH05: Automatically log in the newly registered teacher
      try {
        await login(form.email.trim().toLowerCase(), form.password);
        if (onRegisterSuccess) {
          onRegisterSuccess();
        } else {
          onNavigateLogin(`Welcome, ${form.firstName.trim()}! Your account is ready.`);
        }
      } catch {
        onNavigateLogin(`Account created for ${form.firstName.trim()}! Please sign in.`);
      }
    } catch (err) {
      ...
    }
  };
```

- [ ] **Step 2: Pass `onRegisterSuccess` from `App.jsx`**

In `App.jsx`:
```jsx
<Route
  path="/register"
  element={
    user ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <RegisterPage
        onNavigateLogin={(msg) => {
          setSuccessMessage(msg);
          navigate("/login");
        }}
        onRegisterSuccess={() => setShowSplash(true)}
      />
    )
  }
/>
```

- [ ] **Step 3: Test auto-login flow in `registerPage.test.jsx`**

Add unit test verifying `login` is called after successful registration and transitions smoothly.

- [ ] **Step 4: Run all frontend tests**

Run:
```bash
npm test
```
Expected: 343+ tests PASS.

---

### Task 5: Final Review, Commit & PR Creation

- [ ] **Step 1: Run linter and build check**
```bash
npm run lint
npm run build
```

- [ ] **Step 2: Commit all changes**
```bash
git add .
git commit -m "feat(auth): resolve issue #197 with forgot password, strength meter, required fields, and auto-login"
```

- [ ] **Step 3: Push branch and create Pull Request**
```bash
git push -u origin feat/issue-197-auth-registration-ux
gh pr create --base development --head feat/issue-197-auth-registration-ux --title "feat(auth): strengthen teacher authentication and registration UX (#197)" --body "..."
```
