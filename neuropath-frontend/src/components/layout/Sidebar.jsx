import { useState } from "react";
import axios from "axios";
import LogoutModal from "./LogoutModal";

const navItems = [
  {
    label: "Overview",
    key: "overview",
    children: [],
  },
  {
    label: "Student Profiling",
    key: "student-profiling",
    children: [
      { label: "Create Student Profile", key: "create-student-profile" },
      { label: "View Student Profile", key: "view-student-profile" },
      { label: "Update Student Profile", key: "update-student-profile" },
      { label: "Analyze & Generate AI Insight", key: "ai-insight" },
    ],
  },
  {
    label: "AI-Based IEP Generation",
    key: "iep-generation",
    children: [],
  },
  {
    label: "Instructional Support",
    key: "instructional-support",
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
    children: [
      { label: "View Student Records", key: "view-student-records" },
      { label: "View Progress Dashboard", key: "view-progress-dashboard" },
    ],
  },
];

export default function Sidebar({ activePage, setActivePage }) {
  const [expanded, setExpanded] = useState({ "student-profiling": true });
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe Logout Execution - No React Router needed!
  const handleConfirmLogout = async () => {
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/users/logout/",
        {},
        {
          withCredentials: true,
        },
      );
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsModalOpen(false);

      // Native browser redirect prevents the Router error entirely
      window.location.href = "/login";
    }
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo / Avatar */}
        <div className="sidebar-logo">
          <div className="avatar-circle" />
        </div>

        <hr className="sidebar-divider" />

        {/* Dashboard label */}
        <div className="sidebar-dashboard-btn">DASHBOARD</div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.key}>
              <button
                className={`sidebar-nav-item ${activePage === item.key ? "active" : ""}`}
                onClick={() => {
                  if (item.children.length > 0) {
                    toggleExpand(item.key);
                  } else {
                    setActivePage(item.key);
                  }
                }}
              >
                {item.children.length > 0 && (
                  <span className="sidebar-chevron">›</span>
                )}
                {item.label}
              </button>

              {item.children.length > 0 && expanded[item.key] && (
                <div className="sidebar-subnav">
                  {item.children.map((child) => (
                    <button
                      key={child.key}
                      className={`sidebar-subnav-item ${activePage === child.key ? "active" : ""}`}
                      onClick={() => setActivePage(child.key)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ── Logout Button Section ─────────────────────────── */}
        <div className="sidebar-footer">
          <button
            className="sidebar-logout-btn"
            onClick={() => setIsModalOpen(true)}
          >
            {/* Clean Logout SVG Icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            LOG OUT
          </button>
        </div>
      </aside>

      {/* Renders the modal without breaking the layout */}
      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
