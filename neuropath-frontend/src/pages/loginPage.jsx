import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function LoginPage({
  onNavigateRegister,
  onLoginSuccess,
  successMessage,
  onClearMessage,
}) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => onClearMessage(), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage, onClearMessage]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   if (!form.email || !form.password) {
  //     setError("Please fill in all fields.");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const data = await login(form.email, form.password);
  //     // Successful login — show welcome alert then redirect
  //     // (replace with React Router navigation when wired up)
  //     alert(
  //       `Welcome back, ${data.teacher.firstName}! 🎉\nYou are now signed in to NeuroPath.`,
  //     );
  //   } catch (err) {
  //     setError(err.message || "Invalid email or password.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // HARDCODED SO THAT WHEN SIGN IN IS CLICKED GOES DIRECTLY INTO THE OVERVIEW, change this if ma connect ng backend
  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess();
  };
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">NeuroPath</span>
          </div>
          <div className="auth-visual">
            <div className="auth-blob auth-blob-1" />
            <div className="auth-blob auth-blob-2" />
            <div className="auth-quote-card">
              <p className="auth-quote">
                "NeuroPath helped us cut IEP writing time in half while keeping
                every goal measurable and compliant."
              </p>
              <div className="auth-quote-author"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your NeuroPath account</p>
          </div>

          {successMessage && (
            <div className="alert alert-success">
              <span>✅</span> {successMessage}
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Sign In <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button className="link-btn" onClick={onNavigateRegister}>
              Create one here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
