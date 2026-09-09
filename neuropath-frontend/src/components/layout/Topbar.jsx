import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
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
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-user">
        <div
          className="topbar-pill"
          onClick={handleProfileClick}
          style={{ cursor: "pointer" }}
        >
          <div className="topbar-pill-avatar">{initials || "👤"}</div>
          <span className="topbar-pill-name">{teacherName}</span>
        </div>
      </div>
    </header>
  );
}
