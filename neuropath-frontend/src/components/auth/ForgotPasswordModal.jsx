import { useState, useEffect, useCallback } from "react";
import { CloseIcon, CheckIcon, WarningIcon } from "../ui/icons";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setEmail("");
    setSubmitted(false);
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

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
          onClick={handleClose}
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
              <CheckIcon className="w-6 h-6 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-700">
              If an account exists for <span className="font-bold text-slate-900">{email}</span>, password reset instructions have been sent.
            </p>
            <p className="text-xs text-slate-500">
              For school and institutional deployments, you may also reach out directly to your designated school administrator.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition-all text-sm mt-2"
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
                <WarningIcon className="w-4 h-4 shrink-0 text-rose-700" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-bold uppercase tracking-wider text-sky-800"
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
                className="w-full px-4 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition-all"
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
