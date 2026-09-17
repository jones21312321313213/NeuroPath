import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { UserIcon, SparklesIcon } from "../ui/icons";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
  const { user } = useAuth();
  const { isClaymorphism, toggleTheme } = useTheme();
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
      <div className="topbar-user">
        <button
          type="button"
          className={`topbar-theme-toggle ${isClaymorphism ? "active" : ""}`}
          onClick={toggleTheme}
          aria-label={`Switch to ${isClaymorphism ? "default" : "claymorphism"} theme`}
          title={`Active theme: ${isClaymorphism ? "Claymorphism" : "Default"}`}
          aria-pressed={isClaymorphism}
        >
          <SparklesIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          <span className="topbar-theme-label text-xs font-semibold">
            {isClaymorphism ? "Clay Theme" : "Default Theme"}
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
