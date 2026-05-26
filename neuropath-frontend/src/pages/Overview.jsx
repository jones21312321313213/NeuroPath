import { useState, useEffect } from "react";

const stats = [
  { label: "Total Students", value: "0", icon: "ti-users", color: "#378ADD" },
  { label: "Active IEPs", value: "0", icon: "ti-file-text", color: "#1D9E75" },
  {
    label: "AI Insights Generated",
    value: "0",
    icon: "ti-brain",
    color: "#7F77DD",
  },
  {
    label: "Upcoming Reviews",
    value: "0",
    icon: "ti-calendar-event",
    color: "#BA7517",
  },
];

const quickActions = [
  {
    label: "Create Student Profile",
    page: "create-student-profile",
    desc: "Add a new student with ASD background and learning preferences.",
    icon: "ti-user-plus",
    color: "#378ADD",
  },
  {
    label: "View All Students",
    page: "view-student-profile",
    desc: "Browse and manage existing student records.",
    icon: "ti-users",
    color: "#1D9E75",
  },
  {
    label: "Generate IEP",
    page: "iep-generation",
    desc: "Use AI to generate a personalized education plan.",
    icon: "ti-sparkles",
    color: "#7F77DD",
  },
];

export default function Overview({ setActivePage }) {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="page-content">
      <div className="overview-wrapper">
        {/* Welcome */}
        <div className="overview-welcome">
          <h1 className="overview-title">{greeting}, Teacher!</h1>
          <p className="overview-subtitle">
            Here's a summary of your NeuroPath dashboard. Manage student
            profiles, track progress, and generate AI-powered IEPs tailored for
            students with Autism Spectrum Disorder.
          </p>
        </div>

        {/* Stats */}
        <p className="overview-section-label">At a glance</p>
        <div className="overview-stats">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{ borderLeft: `3px solid ${s.color}` }}
            >
              <i
                className={`ti ${s.icon} stat-icon`}
                aria-hidden="true"
                style={{ color: s.color }}
              />
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p className="overview-section-label">Quick actions</p>
        <div className="quick-actions">
          {quickActions.map((a) => (
            <button
              key={a.page}
              className="quick-action-card"
              onClick={() => setActivePage(a.page)}
            >
              <i
                className={`ti ${a.icon} quick-action-icon`}
                aria-hidden="true"
                style={{ color: a.color }}
              />
              <div className="quick-action-header">
                <span className="quick-action-label">{a.label}</span>
                <i
                  className="ti ti-arrow-right quick-action-arrow"
                  aria-hidden="true"
                />
              </div>
              <span className="quick-action-desc">{a.desc}</span>
            </button>
          ))}
        </div>

        {/* About */}
        <p className="overview-section-label">About NeuroPath</p>
        <div className="overview-about">
          <p className="overview-body">
            NeuroPath is a specialized platform designed to support educators
            and specialists working with students diagnosed with Autism Spectrum
            Disorder. It streamlines the creation and management of student
            profiles, tracks behavioral and academic progress, and leverages AI
            to generate individualized education plans — helping every student
            reach their full potential.
          </p>
        </div>
      </div>
    </div>
  );
}
