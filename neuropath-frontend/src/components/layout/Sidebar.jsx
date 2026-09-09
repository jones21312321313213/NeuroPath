import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LogoutModal from "./LogoutModal";

const navItems = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "ti-home-2",
    exact: true,
    children: [],
  },
  {
    label: "Student Profiling",
    key: "student-profiling",
    pathPrefix: "/dashboard/students",
    icon: "ti-users",
    children: [
      { label: "Create Student Profile", path: "/dashboard/students/create" },
      { label: "View Student Profile", path: "/dashboard/students", exact: true },
    ],
  },
  {
    label: "AI-Based IEP Generation",
    key: "iep-generation",
    pathPrefix: "/dashboard/iep",
    icon: "ti-sparkles",
    children: [
      { label: "Generate IEP", path: "/dashboard/iep/generate" },
      { label: "View IEP", path: "/dashboard/iep/view" },
    ],
  },
  {
    label: "Instructional Support",
    key: "instructional-support",
    icon: "ti-books",
    children: [
      { label: "Manage Lesson Plans", path: "/dashboard/lessons" },
      { label: "Manage Visual Aids", path: "/dashboard/visual-aids" },
      { label: "Manage Teaching Strategies", path: "/dashboard/strategies" },
    ],
  },
  {
    label: "Outcome Monitoring",
    key: "outcome-monitoring",
    icon: "ti-chart-bar",
    children: [
      { label: "View Student Records", path: "/dashboard/records" },
      { label: "View Progress Dashboard", path: "/dashboard/monitoring" },
    ],
  },
];

export default function Sidebar({
  activePage,
  setActivePage,
  collapsed = false,
  onToggleCollapse,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location?.pathname || "/dashboard";

  const [expanded, setExpanded] = useState({
    "student-profiling": false,
    "iep-generation": false,
    "instructional-support": false,
    "outcome-monitoring": false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-expand group if current path is under that group
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const hasMatchingChild = item.children.some(
          (child) => child.path === currentPath || (child.path !== "/dashboard/students" && currentPath.startsWith(child.path))
        );
        if (hasMatchingChild || (item.pathPrefix && currentPath.startsWith(item.pathPrefix))) {
          setExpanded((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [currentPath]);

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmLogout = async () => {
    await logout();
    sessionStorage.clear();
    setIsModalOpen(false);
    navigate("/login");
  };

  const isItemActive = (item) => {
    if (item.exact) return currentPath === item.path;
    if (item.path && currentPath === item.path) return true;
    if (item.pathPrefix && currentPath.startsWith(item.pathPrefix)) return true;
    if (item.children?.some((child) => child.exact ? currentPath === child.path : currentPath.startsWith(child.path))) return true;
    if (activePage && (item.key === activePage || item.path === activePage)) return true;
    return false;
  };

  const handleNavClick = (e, item) => {
    e.stopPropagation();
    if (collapsed) {
      if (onToggleCollapse) onToggleCollapse();
      if (item.children.length > 0) {
        setExpanded((prev) => ({ ...prev, [item.key]: true }));
      } else if (item.path) {
        navigate(item.path);
        if (setActivePage) setActivePage(item.key || item.path);
      }
      return;
    }

    if (item.children.length > 0) {
      toggleExpand(item.key);
    } else if (item.path) {
      navigate(item.path);
      if (setActivePage) setActivePage(item.key || item.path);
    }
  };

  const handleToggleCollapse = (e) => {
    e.stopPropagation();
    onToggleCollapse?.();
  };

  return (
    <>
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        onClick={(e) => {
          if (!e.target.closest("button")) {
            onToggleCollapse?.();
          }
        }}
      >
        <div
          className="sidebar-header"
          onClick={handleToggleCollapse}
          title={collapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
        >
          {!collapsed ? (
            <div className="sidebar-brand">
              <div className="sidebar-brand-info">
                <span className="sidebar-brand-name">NeuroPath</span>
                <span className="sidebar-brand-tag">Special Ed Workspace</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand collapsed">
              <span className="sidebar-brand-abbr">NP</span>
            </div>
          )}
        </div>

        <hr className="sidebar-divider" />

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const isCategoryExpanded = expanded[item.key];

            return (
              <div key={item.key || item.path} className="sidebar-nav-group">
                <button
                  type="button"
                  className={`sidebar-nav-item ${active ? "active" : ""}`}
                  onClick={(e) => handleNavClick(e, item)}
                  title={collapsed ? item.label : undefined}
                >
                  <i className={`ti ${item.icon} sidebar-icon`} aria-hidden="true" />
                  {!collapsed && (
                    <>
                      <span className="sidebar-label">{item.label}</span>
                      {item.children.length > 0 && (
                        <i
                          className={`ti ti-chevron-right sidebar-chevron ${isCategoryExpanded ? "rotated" : ""}`}
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                  {collapsed && (
                    <span className="sidebar-tooltip">{item.label}</span>
                  )}
                </button>

                {!collapsed && item.children.length > 0 && isCategoryExpanded && (
                  <div className="sidebar-subnav">
                    {item.children.map((child) => {
                      const isChildActive = child.exact
                        ? currentPath === child.path
                        : currentPath.startsWith(child.path);

                      return (
                        <button
                          key={child.path}
                          type="button"
                          className={`sidebar-subnav-item ${isChildActive ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(child.path);
                            if (setActivePage) setActivePage(child.key || child.path);
                          }}
                        >
                          <span className="subnav-bullet" />
                          <span className="subnav-label">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div
          className="sidebar-empty-space"
          data-testid="sidebar-empty-space"
          onClick={handleToggleCollapse}
          role="button"
          tabIndex={0}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleCollapse?.();
            }
          }}
        />

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            title={collapsed ? "Log out" : undefined}
          >
            <i className="ti ti-logout-2" aria-hidden="true" />
            {!collapsed && <span>Log Out</span>}
            {collapsed && <span className="sidebar-tooltip">Log Out</span>}
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
