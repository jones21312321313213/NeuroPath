import { useAuth } from "../../context/AuthContext";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
  const { user } = useAuth();
  const teacherName = `Teacher ${user?.first_name || ""}`;
  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();

  return (
    <header className="topbar">
      <span className="topbar-breadcrumb">{breadcrumb}</span>
      <div className="topbar-user">
        <div
          className="topbar-pill"
          onClick={() => setActivePage("my-profile")}
          style={{ cursor: "pointer" }}
        >
          <div className="topbar-pill-avatar">{initials}</div>
          <span className="topbar-pill-name">{teacherName}</span>
        </div>
      </div>
    </header>
  );
}
