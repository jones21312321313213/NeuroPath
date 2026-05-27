import { useState, useEffect, useRef } from "react";
import ClickSpark from "../components/ui/ClickSpark";
import "../styles/UserProfilePage.css";
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
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    if (isEditing) fileInputRef.current.click();
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
      reader.onloadend = () => setAvatarPreview(reader.result);
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
      if (form.password) formData.append("password", form.password);
      if (selectedFile) formData.append("profile_picture", selectedFile);

      await updateUser(formData);
      setIsEditing(false);
      setSelectedFile(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Failed to update profile.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}` || "TN";

  return (
    <div className="up-page page-content">
      {/* ── ClickSpark wraps the entire page area OUTSIDE the card ── */}
      <ClickSpark
        sparkColor="#5aabf0"
        sparkSize={12}
        sparkRadius={22}
        sparkCount={10}
        duration={500}
      >
        <div className="up-centering">
          {/* ── Profile Card ── */}
          <div className="up-card">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="up-file-hidden"
            />

            {/* Card header */}
            <div className="up-card-header">
              <span className="up-card-title">
                {isEditing ? "⚙️ Edit Profile" : "👤 My Profile"}
              </span>
              <button
                type="button"
                className="up-edit-btn"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setErrors({});
                  setSelectedFile(null);
                }}
              >
                {isEditing ? "Cancel" : "Edit Info"}
              </button>
            </div>

            {/* Success banner */}
            {saveSuccess && (
              <div className="up-banner up-banner-success">
                ✅ Profile updated successfully.
              </div>
            )}

            {/* Error banner */}
            {errors.general && (
              <div className="up-banner up-banner-error">
                ⚠️ {errors.general}
              </div>
            )}

            {/* Avatar */}
            <div className="up-avatar-block">
              <div
                className={`up-avatar ${isEditing ? "up-avatar-editable" : ""}`}
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="up-avatar-img"
                  />
                ) : (
                  <span className="up-avatar-initials">{initials}</span>
                )}
                {isEditing && (
                  <div className="up-avatar-overlay">
                    <span>📸</span>
                    <span>Change</span>
                  </div>
                )}
              </div>
              {!isEditing && (
                <div className="up-avatar-info">
                  <p className="up-name">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="up-role">Special Education Teacher</p>
                </div>
              )}
            </div>

            {/* ── VIEW MODE ── */}
            {!isEditing ? (
              <div className="up-fields">
                {[
                  { label: "First Name", value: user?.first_name },
                  { label: "Last Name", value: user?.last_name },
                  { label: "Email Address", value: user?.email },
                  { label: "Role", value: "Special Education Teacher" },
                ].map(({ label, value }) => (
                  <div key={label} className="up-field-row">
                    <span className="up-field-label">{label}</span>
                    <span className="up-field-value">{value || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* ── EDIT MODE ── */
              <form className="up-form" onSubmit={handleSubmit}>
                <div className="up-form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      className={`form-input ${errors.firstName ? "up-input-error" : ""}`}
                    />
                    {errors.firstName && (
                      <span className="up-field-error">{errors.firstName}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      className={`form-input ${errors.lastName ? "up-input-error" : ""}`}
                    />
                    {errors.lastName && (
                      <span className="up-field-error">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className={`form-input ${errors.email ? "up-input-error" : ""}`}
                  />
                  {errors.email && (
                    <span className="up-field-error">{errors.email}</span>
                  )}
                </div>

                <div className="up-divider">
                  <span>Password</span>
                  <p className="up-divider-hint">
                    Leave blank to keep current password.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="up-pass-wrap">
                    <input
                      name="password"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      className={`form-input up-pass-input ${errors.password ? "up-input-error" : ""}`}
                    />
                    <button
                      type="button"
                      className="up-pass-toggle"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="up-field-error">{errors.password}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    name="confirmPassword"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={`form-input ${errors.confirmPassword ? "up-input-error" : ""}`}
                  />
                  {errors.confirmPassword && (
                    <span className="up-field-error">
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>

                <div className="up-form-actions">
                  <button
                    type="button"
                    className="btn btn-back"
                    onClick={() => {
                      setIsEditing(false);
                      setErrors({});
                      setSelectedFile(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-submit"
                    disabled={loading}
                  >
                    {loading ? <span className="up-spinner" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </ClickSpark>
    </div>
  );
}
