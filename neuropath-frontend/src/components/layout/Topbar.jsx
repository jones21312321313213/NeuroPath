import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUnsavedChangesContext } from "../../context/UnsavedChangesContext";
import { UserIcon } from "../ui/icons";
import Breadcrumbs from "./Breadcrumbs";
import TopbarNotificationBell from "./TopbarNotificationBell";
import "../../styles/Topbar.css";

export default function Topbar({
  breadcrumb,
  setActivePage,
  collapsed = false,
  onToggleCollapse,
  onStartTour,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { promptNavigation } = useUnsavedChangesContext();
  const [failedAvatarSrc, setFailedAvatarSrc] = useState(null);

  const teacherName = `Teacher ${user?.first_name || ""}`;
  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();
  const hasValidAvatar = Boolean(
    user?.profile_picture && failedAvatarSrc !== user.profile_picture
  );

  const handleProfileClick = () => {
    if (location?.pathname === "/dashboard/profile") return;
    promptNavigation(() => {
      navigate("/dashboard/profile");
      if (setActivePage) setActivePage("my-profile");
    });
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
        {onStartTour && (
          <button
            type="button"
            className="topbar-tour-btn"
            onClick={onStartTour}
            aria-label="Start interactive dashboard walkthrough tour"
            title="App Walkthrough Tour"
            data-testid="topbar-tour-btn"
          >
            <i className="ti ti-info-circle text-lg" aria-hidden="true" />
          </button>
        )}
        <TopbarNotificationBell />
        <button
          type="button"
          className="topbar-pill"
          onClick={handleProfileClick}
          aria-label={`View user profile for ${teacherName}`}
        >
          <div className="topbar-pill-avatar" aria-hidden="true">
            {hasValidAvatar ? (
              <img
                src={user.profile_picture}
                alt=""
                className="topbar-pill-avatar-img"
                onError={() => setFailedAvatarSrc(user.profile_picture)}
              />
            ) : (
              initials || <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
            )}
          </div>
          <span className="topbar-pill-name">{teacherName}</span>
        </button>
      </div>
    </header>
  );
}
