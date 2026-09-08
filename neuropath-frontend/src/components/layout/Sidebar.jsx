import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutModal from "./LogoutModal";

const navItems = [
  {
    label: "Home",
    key: "home",
    altKey: "overview",
    icon: "ti-home-2",
    children: [],
  },
  {
    label: "Student Profiling",
    key: "student-profiling",
    icon: "ti-users",
    children: [
      { label: "Create Student Profile", key: "create-student-profile" },
      { label: "View Student Profile", key: "view-student-profile" },
    ],
  },
  {
    label: "AI-Based IEP Generation",
    key: "iep-generation",
    icon: "ti-sparkles",
    children: [
      { label: "Generate IEP", key: "generate-iep" },
      { label: "View IEP", key: "view-iep" },
    ],
  },
  {
    label: "Instructional Support",
    key: "instructional-support",
    icon: "ti-books",
    children: [
      { label: "Manage Lesson Plans", key: "manage-lesson-plans" },
      { label: "Manage Visual Aids", key: "manage-visual-aids" },
      {
        label: "Manage Teaching Strategies",
        key: "manage-teaching-strategies",
      },
    ],
  },
  {
    label: "Outcome Monitoring",
    key: "outcome-monitoring",
    icon: "ti-chart-bar",
    children: [
      { label: "View Student Records", key: "view-student-records" },
      { label: "View Progress Dashboard", key: "view-progress-dashboard" },
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
  const [expanded, setExpanded] = useState({
    "student-profiling": false,
    "iep-generation": false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmLogout = async () => {
    await logout();
    sessionStorage.clear();
    setIsModalOpen(false);
    window.location.href = "/login";
  };

  const isItemActive = (item) => {
    if (activePage === item.key) return true;
    if (item.altKey && activePage === item.altKey) return true;
    if (item.children?.some((child) => child.key === activePage)) return true;
    return false;
  };

  const handleNavClick = (e, item) => {
    e.stopPropagation();
    if (collapsed) {
      if (onToggleCollapse) onToggleCollapse();
      if (item.children.length > 0) {
        setExpanded((prev) => ({ ...prev, [item.key]: true }));
      } else {
        setActivePage(item.key);
      }
      return;
    }

    if (item.children.length > 0) {
      toggleExpand(item.key);
    } else {
      setActivePage(item.key);
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
          // If the click did not originate from an interactive button or subnav link, toggle collapse
          if (!e.target.closest("button")) {
            onToggleCollapse?.();
          }
        }}
      >
        {/* Header with Clean Typographic Brand (Clickable to Toggle Collapse) */}
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

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const isCategoryExpanded = expanded[item.key];

            return (
              <div key={item.key} className="sidebar-nav-group">
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
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        className={`sidebar-subnav-item ${activePage === child.key ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePage(child.key);
                        }}
                      >
                        <span className="subnav-bullet" />
                        <span className="subnav-label">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Empty space below navigation buttons: clicking toggles collapse/expand (no hover highlight) */}
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

        {/* Footer with Logout */}
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
