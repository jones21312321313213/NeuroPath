import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { UserIcon, PaletteIcon } from "../ui/icons";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
  const { user } = useAuth();
  const { toggleTheme, isMinimalist } = useTheme();
  const navigate = useNavigate();
  const teacherName = `Teacher ${user?.first_name || ""}`;
  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();

  const handleProfileClick = () => {
    navigate("/dashboard/profile");
    if (setActivePage) setActivePage("my-profile");
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-user topbar-actions">
        <button
          type="button"
          className="topbar-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Toggle theme: ${isMinimalist ? "Minimalist" : "Default"}`}
          title={isMinimalist ? "Switch to Default Theme" : "Switch to Minimalist Theme"}
          aria-pressed={isMinimalist}
        >
          <PaletteIcon className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <span className="topbar-theme-label">
            {isMinimalist ? "Minimalist" : "Default"}
          </span>
        </button>
        <button
          type="button"
          className="topbar-pill"
          onClick={handleProfileClick}
          aria-label={`View user profile for ${teacherName}`}
        >
          <div className="topbar-pill-avatar" aria-hidden="true">
            {initials || <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />}
          </div>
          <span className="topbar-pill-name">{teacherName}</span>
        </button>
      </div>
    </header>
  );
}

