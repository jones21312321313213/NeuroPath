import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
      });
      setAvatarPreview(user.profile_picture || null);
    }
  }, [user, isEditing]);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors({ ...errors, general: "Please select a valid image file." });
        return;
      }
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email.";
    
    if (form.password) {
      if (form.password.length < 6)
        e.password = "Password must be at least 6 characters.";
      if (form.password !== form.confirmPassword)
        e.confirmPassword = "Passwords do not match.";
    }
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
      const formData = new FormData();
      formData.append("first_name", form.firstName.trim());
      formData.append("last_name", form.lastName.trim());
      formData.append("email", form.email.trim().toLowerCase());
      
      if (form.password) {
        formData.append("password", form.password);
      }
      
      if (selectedFile) {
        formData.append("profile_picture", selectedFile);
      }

      await updateUser(formData);
      setIsEditing(false);
      setSelectedFile(null);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to update profile.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: "#fff", border: "1.5px solid #b3dff7", color: "#1a3a4a" };
  const inputFocus = (e) => { e.target.style.border = "1.5px solid #82C7FF"; e.target.style.boxShadow = "0 0 0 4px rgba(130,199,255,0.2)"; };
  const inputBlur = (e) => { e.target.style.border = "1.5px solid #b3dff7"; e.target.style.boxShadow = "none"; };
  const inputErrorStyle = { background: "#fff0f0", border: "1.5px solid #ffc9c9", color: "#1a3a4a" };

  return (
    <div
      className="page-content flex items-center justify-center p-10 font-sans min-h-screen"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-xl text-white relative"
        style={{ background: "linear-gradient(135deg, #1a6fa8, #2589c7)" }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex justify-between items-center mb-6">
          <h1 className="font-bold tracking-tight text-lg">
            {isEditing ? "⚙️ Edit Profile Settings" : "👤 My Profile"}
          </h1>
          <button
            type="button"
            onClick={() => {
              setIsEditing(!isEditing);
              setErrors({});
              setSelectedFile(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition-all"
          >
            {isEditing ? "Cancel" : "Edit Info"}
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 flex items-center gap-2 text-xs p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-100">
            <span>⚠️</span>
            <p className="font-medium">{errors.general}</p>
          </div>
        )}

        {/* AVATAR BLOCK */}
        <div className="text-center mb-6">
          <div 
            onClick={handleAvatarClick}
            className={`w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border border-white/30 relative overflow-hidden group ${isEditing ? 'cursor-pointer hover:border-white/60' : ''}`}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>
                {user?.first_name?.[0] || "T"}
                {user?.last_name?.[0] || "N"}
              </>
            )}

            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                <span>📸</span>
                <span>Change</span>
              </div>
            )}
          </div>
          
          {!isEditing && (
            <>
              <h2 className="mt-3 text-xl font-bold">{user?.first_name} {user?.last_name}</h2>
              <p className="text-white/70 text-sm">Teacher Account</p>
            </>
          )}
        </div>

        {/* --- VIEW MODE --- */}
        {!isEditing ? (
          <div className="space-y-3 text-sm">
            <div className="bg-white/10 p-3 rounded-lg border border-white/5">
              <p className="text-white/60 text-xs">First Name</p>
              <p className="font-semibold">{user?.first_name || "—"}</p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/5">
              <p className="text-white/60 text-xs">Last Name</p>
              <p className="font-semibold">{user?.last_name || "—"}</p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/5">
              <p className="text-white/60 text-xs">Email Address</p>
              <p className="font-semibold">{user?.email || "—"}</p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/5">
              <p className="text-white/60 text-xs">Role</p>
              <p className="font-semibold">Special Education Teacher</p>
            </div>
          </div>
        ) : (
          /* --- EDIT MODE FORM --- */
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-white/80">First Name</label>
                <input
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.firstName ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {errors.firstName && <span className="text-[11px] text-red-200 font-bold">{errors.firstName}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-white/80">Last Name</label>
                <input
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.lastName ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {errors.lastName && <span className="text-[11px] text-red-200 font-bold">{errors.lastName}</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-white/80">Email Address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                style={errors.email ? inputErrorStyle : inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {errors.email && <span className="text-[11px] text-red-200 font-bold">{errors.email}</span>}
            </div>

            <div className="pt-2 border-t border-white/20">
              <p className="text-[11px] text-white/70 italic">Leave blank unless changing your password.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-white/80">New Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-3 pr-10 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                  style={errors.password ? inputErrorStyle : inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-sm"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <span className="text-[11px] text-red-200 font-bold">{errors.password}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-white/80">Confirm New Password</label>
              <input
                name="confirmPassword"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                style={errors.confirmPassword ? inputErrorStyle : inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {errors.confirmPassword && <span className="text-[11px] text-red-200 font-bold">{errors.confirmPassword}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4 text-sm"
              style={{
                background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}