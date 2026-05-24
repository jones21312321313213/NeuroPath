import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

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

  // HARDCODED: goes directly to Overview — restore real login() call when backend is ready
  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans"
      style={{ background: "#fff" }}
    >
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
        <div
          className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full blur-[60px] pointer-events-none"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />

        {/* Quote card — centered */}
        <div
          className="relative z-10 max-w-sm w-full rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Logo inside card */}
          <div className="flex items-center gap-2 select-none mb-6">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold tracking-tight text-white">
              NeuroPath
            </span>
          </div>

          <p className="text-white font-medium text-base italic leading-relaxed">
            "NeuroPath helped us cut IEP writing time in half while keeping
            every goal measurable and compliant."
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.25)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              EP
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Special Education Team
            </span>
          </div>

          {/* Footer note inside card */}
          <p
            className="text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            🔒 FERPA Compliant Documentation Platform
          </p>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
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
              Welcome back
            </h1>
            <p className="text-sm font-medium" style={{ color: "#5a9dbf" }}>
              Sign in to your NeuroPath account
            </p>
          </div>

          {/* Success banner */}
          {successMessage && (
            <div
              className="mb-6 flex items-center gap-2.5 text-sm p-3.5 rounded-xl"
              style={{
                background: "#e6f7ec",
                border: "1px solid #b7e4c7",
                color: "#276749",
              }}
            >
              <span className="text-base">✅</span>
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="mb-6 flex items-center gap-2.5 text-sm p-3.5 rounded-xl"
              style={{
                background: "#fff0f0",
                border: "1px solid #ffc9c9",
                color: "#c0392b",
              }}
            >
              <span className="text-base">⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#1a6fa8" }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: "#fff",
                  border: "1.5px solid #b3dff7",
                  color: "#1a3a4a",
                  boxShadow: "0 1px 4px rgba(130,199,255,0.1)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1.5px solid #82C7FF";
                  e.target.style.boxShadow = "0 0 0 4px rgba(130,199,255,0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1.5px solid #b3dff7";
                  e.target.style.boxShadow = "0 1px 4px rgba(130,199,255,0.1)";
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#1a6fa8" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="w-full pl-4 pr-12 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #b3dff7",
                    color: "#1a3a4a",
                    boxShadow: "0 1px 4px rgba(130,199,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1.5px solid #82C7FF";
                    e.target.style.boxShadow =
                      "0 0 0 4px rgba(130,199,255,0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1.5px solid #b3dff7";
                    e.target.style.boxShadow =
                      "0 1px 4px rgba(130,199,255,0.1)";
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all"
                  style={{ color: "#82C7FF" }}
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm mt-2"
              style={{
                background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                boxShadow: "0 4px 14px rgba(130,199,255,0.4)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(130,199,255,0.55)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(130,199,255,0.4)")
              }
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <span className="text-base">→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px]" style={{ background: "#c9e8f9" }} />
            <span
              className="text-xs font-bold px-3 uppercase tracking-wider select-none"
              style={{ color: "#82C7FF" }}
            >
              or
            </span>
            <div className="flex-1 h-[1px]" style={{ background: "#c9e8f9" }} />
          </div>

          <p
            className="text-sm font-medium text-center"
            style={{ color: "#5a9dbf" }}
          >
            Don't have an account?{" "}
            <button
              className="font-bold hover:underline transition-colors outline-none"
              style={{ color: "#2589c7" }}
              onClick={onNavigateRegister}
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
