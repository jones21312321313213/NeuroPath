import { useState } from 'react'

const navItems = [
  {
    label: 'Overview',
    key: 'overview',
    children: [],
  },
  {
    label: 'Student Profiling',
    key: 'student-profiling',
    children: [
      { label: 'Create Student Profile', key: 'create-student-profile' },
      { label: 'View Student Profile', key: 'view-student-profile' },
      { label: 'Update Student Profile', key: 'update-student-profile' },
      { label: 'Analyze & Generate AI Insight', key: 'ai-insight' },
    ],
  },
  {
    label: 'AI-Based IEP Generation',
    key: 'iep-generation',
    children: [],
  },
]

export default function Sidebar({ activePage, setActivePage }) {
  const [expanded, setExpanded] = useState({ 'student-profiling': true })

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
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
              className={`sidebar-nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => {
                if (item.children.length > 0) {
                  toggleExpand(item.key)
                } else {
                  setActivePage(item.key)
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
                    className={`sidebar-subnav-item ${activePage === child.key ? 'active' : ''}`}
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
    </aside>
  )
}
