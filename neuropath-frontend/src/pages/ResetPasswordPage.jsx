import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { authAPI } from "../api/client";
import {
  BoltIcon,
  LockIcon,
  CheckIcon,
  WarningIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from "../components/ui/icons";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";
import { evaluatePasswordRules } from "../utils/password";

export default function ResetPasswordPage({ onNavigateLogin, onNavigateHome }) {
  const location = useLocation();

  // Extract uid and token from query params: ?uid=...&token=...
  const queryParams = useMemo(() => {
    try {
      return new URLSearchParams(location?.search || "");
    } catch {
      return new URLSearchParams();
    }
  }, [location?.search]);

  const initialUid = queryParams.get("uid") || "";
  const initialToken = queryParams.get("token") || "";

  const [uid, setUid] = useState(initialUid);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleNavigateLogin = () => {
    if (onNavigateLogin) {
      onNavigateLogin();
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedUid = uid.trim();
    const trimmedToken = token.trim();

    if (!trimmedUid) {
      setError("User identifier or email is required.");
      return;
    }

    if (!trimmedToken) {
      setError("Reset token is required.");
      return;
    }

    const ruleResult = evaluatePasswordRules(password);
    if (!ruleResult.hasLength) {
      setError("Password must be at least 8 characters.");
      return;
    } else if (!ruleResult.isValid) {
      setError("Please fulfill all password requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPasswordConfirm({
        uid: trimmedUid,
        token: trimmedToken,
        new_password: password,
        new_password_confirm: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      const msg =
        err.data?.error ||
        (Array.isArray(err.data?.errors?.password)
          ? err.data.errors.password[0]
          : null) ||
        err.message ||
        "The password reset link is invalid or has expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans relative"
      style={{ background: "#fff" }}
    >
      {/* Back to Home Button (Upper Left) */}
      <button
        type="button"
        onClick={handleNavigateHome}
        className="absolute top-5 left-5 sm:top-6 sm:left-6 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80 shadow-sm transition-all hover:scale-105 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 lg:bg-white/20 lg:text-white lg:border-white/30 lg:hover:bg-white/30 lg:hover:text-white backdrop-blur-sm group"
        aria-label="Back to home"
        title="Back to home"
      >
        <ArrowLeftIcon
          className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
      </button>

      {/* LEFT VISUAL SIDEBAR */}
      <div
        className="hidden lg:flex lg:col-span-5 p-12 flex-col items-center justify-center relative overflow-hidden text-left"
        style={{
          background:
            "linear-gradient(135deg, #1a6fa8 0%, #2589c7 40%, #82C7FF 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] pointer-events-none"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute bottom-[10%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] pointer-events-none"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />

        {/* Quote / info card */}
        <div
          className="relative z-10 max-w-sm w-full rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 select-none mb-6">
            <BoltIcon className="w-6 h-6 text-white" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight text-white">
              NeuroPath
            </span>
          </div>

          <p className="text-white font-medium text-base italic leading-relaxed">
            "Security and data privacy are at the heart of everything we build for special educators and students."
          </p>

          <p
            className="text-xs mt-6 flex items-center gap-1.5"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <LockIcon className="w-3.5 h-3.5 text-white/70" aria-hidden="true" />
            <span>FERPA Compliant Documentation Platform</span>
          </p>
        </div>
      </div>

      {/* RIGHT FORM CONTAINER */}
      <div
        className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16"
        style={{ background: "#fff" }}
      >
        <div className="w-full max-w-md flex flex-col text-left">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight mb-2"
              style={{ color: "#1a6fa8" }}
            >
              Reset your password
            </h1>
            <p className="text-sm font-medium" style={{ color: "#1e78a6" }}>
              Choose a strong, new password for your NeuroPath account
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-6 flex items-center gap-2.5 text-sm p-3.5 rounded-xl"
              style={{
                background: "#fff0f0",
                border: "1px solid #ffc9c9",
                color: "#c0392b",
              }}
              role="alert"
            >
              <WarningIcon className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div className="space-y-4 text-center py-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckIcon className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Password Reset Successful!
              </h2>
              <p className="text-sm text-slate-600">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={handleNavigateLogin}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] text-sm mt-4 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                  boxShadow: "0 4px 14px rgba(130,199,255,0.4)",
                }}
              >
                Sign In Now <span className="text-base">→</span>
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* If UID/Token not in query params, allow manual entry */}
              {(!initialUid || !initialToken) && (
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 space-y-3 mb-2">
                  <p className="text-xs text-sky-800 font-medium">
                    Please provide the User ID and Reset Token from your email:
                  </p>
                  <div className="space-y-1">
                    <label
                      htmlFor="reset-uid"
                      className="text-xs font-bold uppercase tracking-wider text-sky-800"
                    >
                      User ID or Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reset-uid"
                      type="text"
                      required
                      aria-required="true"
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                      placeholder="e.g. MTI= or teacher@school.edu"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-sky-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="reset-token"
                      className="text-xs font-bold uppercase tracking-wider text-sky-800"
                    >
                      Reset Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      aria-required="true"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter the token received in email"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-sky-200 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#1a6fa8" }}
                >
                  New Password <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    required
                    aria-required="true"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    className="w-full pl-4 pr-12 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                    style={{
                      background: "#fff",
                      border: "1.5px solid #b3dff7",
                      color: "#1a3a4a",
                      boxShadow: "0 1px 4px rgba(130,199,255,0.1)",
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all"
                    style={{ color: "#82C7FF" }}
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Hide new password" : "Show new password"}
                  >
                    {showPass ? (
                      <EyeSlashIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <PasswordStrengthMeter password={password} />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#1a6fa8" }}
                >
                  Confirm New Password <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPass ? "text" : "password"}
                    required
                    aria-required="true"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    className="w-full pl-4 pr-12 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                    style={{
                      background: "#fff",
                      border: "1.5px solid #b3dff7",
                      color: "#1a3a4a",
                      boxShadow: "0 1px 4px rgba(130,199,255,0.1)",
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all"
                    style={{ color: "#82C7FF" }}
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    aria-label={showConfirmPass ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPass ? (
                      <EyeSlashIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm mt-4 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                  boxShadow: "0 4px 14px rgba(130,199,255,0.4)",
                }}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Reset Password <span className="text-base">→</span>
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={handleNavigateLogin}
                  className="text-xs font-bold hover:underline transition-colors outline-none"
                  style={{ color: "#2589c7" }}
                >
                  Remember your password? Sign in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
