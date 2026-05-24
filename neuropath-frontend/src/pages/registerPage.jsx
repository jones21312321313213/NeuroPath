import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage({ onNavigateLogin }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "special_ed_teacher",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email.";
    if (form.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // Mapping the data to match Django's exact Serializer expectations
      const data = await register({
        username: form.email.trim().toLowerCase(), // Django requires a username!
        email: form.email.trim().toLowerCase(),
        first_name: form.firstName.trim(),         // Converted to snake_case
        last_name: form.lastName.trim(),           // Converted to snake_case
        password: form.password,
        // role: form.role // (You can pass this if you add a role field to your backend model later)
      });

      onNavigateLogin(
        `Account created for ${form.firstName.trim()}! Please sign in.`,
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Registration failed.";
      
      // Django often returns a dictionary of specific field errors
      const fieldErrors = err.response?.data?.errors;
      
      if (fieldErrors?.username || fieldErrors?.email) {
        setErrors({ email: "This email is already registered." });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const inputStyle = {
    background: "#fff",
    border: "1.5px solid #b3dff7",
    color: "#1a3a4a",
    boxShadow: "0 1px 4px rgba(130,199,255,0.1)",
  };
  const inputFocus = (e) => {
    e.target.style.border = "1.5px solid #82C7FF";
    e.target.style.boxShadow = "0 0 0 4px rgba(130,199,255,0.2)";
  };
  const inputBlur = (e) => {
    e.target.style.border = "1.5px solid #b3dff7";
    e.target.style.boxShadow = "0 1px 4px rgba(130,199,255,0.1)";
  };
  const inputErrorStyle = {
    background: "#fff0f0",
    border: "1.5px solid #ffc9c9",
    color: "#1a3a4a",
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

        {/* Steps card — centered */}
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

          <p className="text-white font-bold text-lg mb-6">
            Getting started is easy
          </p>

          <ul className="space-y-6">
            {[
              {
                n: "1",
                title: "Create your account",
                sub: "Takes less than a minute",
                active: true,
              },
              {
                n: "2",
                title: "Add your students",
                sub: "Import or add individually",
                active: false,
              },
              {
                n: "3",
                title: "Build your first IEP",
                sub: "Guided templates included",
                active: false,
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4 items-start">
                <span
                  className="w-7 h-7 shrink-0 rounded-lg font-bold text-sm flex items-center justify-center"
                  style={
                    step.active
                      ? {
                          background: "rgba(255,255,255,0.3)",
                          border: "1px solid rgba(255,255,255,0.5)",
                          color: "#fff",
                        }
                      : {
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "rgba(255,255,255,0.6)",
                        }
                  }
                >
                  {step.n}
                </span>
                <div>
                  <strong
                    className="block text-sm font-semibold"
                    style={{
                      color: step.active ? "#fff" : "rgba(255,255,255,0.75)",
                    }}
                  >
                    {step.title}
                  </strong>
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {step.sub}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Footer note inside card */}
          <p
            className="text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            🔒 FERPA Compliant Documentation Platform
          </p>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div
        className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto"
        style={{ background: "#fff" }}
      >
        <div className="w-full max-w-md flex flex-col text-left">
          <div className="mb-8">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight mb-2"
              style={{ color: "#1a6fa8" }}
            >
              Create your account
            </h1>
            <p className="text-sm font-medium" style={{ color: "#5a9dbf" }}>
              Join NeuroPath and start building better IEPs
            </p>
          </div>

          {errors.general && (
            <div
              className="mb-6 flex items-center gap-2.5 text-sm p-3.5 rounded-xl"
              style={{
                background: "#fff0f0",
                border: "1px solid #ffc9c9",
                color: "#c0392b",
              }}
            >
              <span className="text-base">⚠️</span>
              <p className="font-medium">{errors.general}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* First + Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#1a6fa8" }}
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.firstName ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {errors.firstName && (
                  <span
                    className="block text-xs font-bold mt-1"
                    style={{ color: "#c0392b" }}
                  >
                    {errors.firstName}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#1a6fa8" }}
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.lastName ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {errors.lastName && (
                  <span
                    className="block text-xs font-bold mt-1"
                    style={{ color: "#c0392b" }}
                  >
                    {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-email"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#1a6fa8" }}
              >
                Email Address
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={errors.email ? inputErrorStyle : inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {errors.email && (
                <span
                  className="block text-xs font-bold mt-1"
                  style={{ color: "#c0392b" }}
                >
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-password"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#1a6fa8" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-4 pr-12 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.password ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && (
                <span
                  className="block text-xs font-bold mt-1"
                  style={{ color: "#c0392b" }}
                >
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#1a6fa8" }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPass ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={errors.confirmPassword ? inputErrorStyle : inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {errors.confirmPassword && (
                <span
                  className="block text-xs font-bold mt-1"
                  style={{ color: "#c0392b" }}
                >
                  {errors.confirmPassword}
                </span>
              )}
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
                  Create Account <span className="text-base">→</span>
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
            Already have an account?{" "}
            <button
              className="font-bold hover:underline transition-colors outline-none"
              style={{ color: "#2589c7" }}
              onClick={() => onNavigateLogin("")}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
