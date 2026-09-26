import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserIcon } from "../ui/icons";
import Breadcrumbs from "./Breadcrumbs";
import "../../styles/Topbar.css";

export default function Topbar({
  breadcrumb,
  setActivePage,
  collapsed = false,
  onToggleCollapse,
}) {
  const { user } = useAuth();
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
        {onToggleCollapse && (
          <button
            type="button"
            className="topbar-toggle-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
            title={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
          >
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
        )}
        <Breadcrumbs items={breadcrumb} />
      </div>
      <div className="topbar-user">
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
