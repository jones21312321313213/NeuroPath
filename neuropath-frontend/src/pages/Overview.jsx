import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { studentsAPI, iepAPI } from "../api/client";
import CountUp from "../components/ui/CountUp";
import GlareHover from "../components/ui/GlareHover";

const stats = [
  {
    label: "Total Students",
    key: "students",
    icon: "ti-users",
    color: "#378ADD",
  },
  { label: "Active IEPs", key: "ieps", icon: "ti-file-text", color: "#1D9E75" },
  {
    label: "AI Insights Generated",
    key: "insights",
    icon: "ti-brain",
    color: "#7F77DD",
  },
  {
    label: "Upcoming Reviews",
    key: "reviews",
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
  const { user } = useAuth();
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });
  const [counts, setCounts] = useState({
    students: 0,
    ieps: 0,
    insights: 0,
    reviews: 0,
  });

  // Fetch total students
  useEffect(() => {
    if (!user?.id) return;
    studentsAPI
      .list(user.id)
      .then((data) => {
        const students = Array.isArray(data) ? data : [];
        setCounts((prev) => ({ ...prev, students: students.length }));
      })
      .catch(() => {});
  }, [user]);

  // Fetch active IEPs and AI insights counts from the dashboard-stats endpoint
  useEffect(() => {
    if (!user?.id) return;
    iepAPI
      .dashboardStats()
      .then((data) => {
        setCounts((prev) => ({
          ...prev,
          ieps: data.active_ieps ?? 0,
          insights: data.ai_insights ?? 0,
        }));
      })
      .catch(() => {});
  }, [user]);

  const hasStudents = counts.students > 0;
  const hasIeps = counts.ieps > 0;

  const gettingStartedSteps = [
    {
      stepNumber: 1,
      title: "1. Add a student",
      desc: "Create a student profile to start personalizing learning plans.",
      icon: "ti-user-plus",
      color: "#378ADD",
      page: "create-student-profile",
      actionLabel: "Add Student",
      isUnlocked: true,
      isCompleted: hasStudents,
      lockReason: "",
    },
    {
      stepNumber: 2,
      title: "2. Generate an IEP",
      desc: "Use AI to create an individualized education plan with target goals.",
      icon: "ti-sparkles",
      color: "#7F77DD",
      page: "iep-generation",
      actionLabel: "Generate IEP",
      isUnlocked: hasStudents,
      isCompleted: hasIeps,
      lockReason: "Requires at least one student profile",
    },
    {
      stepNumber: 3,
      title: "3. Use classroom tools",
      desc: "Generate tailored lesson plans, visual aids, and teaching strategies.",
      icon: "ti-books",
      color: "#1D9E75",
      page: "manage-lesson-plans",
      actionLabel: "Open Tools",
      isUnlocked: hasIeps,
      isCompleted: false,
      lockReason: "Requires a saved IEP",
    },
  ];

  return (
    <div className="page-content">
      <div className="overview-wrapper">
        {/* Welcome */}
        <div className="overview-welcome">
          <h1 className="overview-title">{greeting}, Teacher!</h1>
          <p className="overview-subtitle">
            Here's a summary of your NeuroPath dashboard. Follow the getting
            started path below to set up students, generate IEPs, and use
            classroom tools.
          </p>
        </div>

        {/* Getting Started Path */}
        <div
          className="overview-getting-started-section"
          data-testid="getting-started-section"
        >
          <div className="overview-getting-started-header">
            <p className="overview-section-label" style={{ marginBottom: 0 }}>
              Getting started
            </p>
            <span className="overview-getting-started-hint">
              Follow these 3 steps to set up your classroom workflow
            </span>
          </div>
          <div className="getting-started-steps">
            {gettingStartedSteps.map((step) => {
              const isLocked = !step.isUnlocked;
              return (
                <div
                  key={step.stepNumber}
                  data-testid={`getting-started-step-${step.stepNumber}`}
                  className={`getting-started-card ${isLocked ? "locked" : "active"} ${step.isCompleted ? "completed" : ""}`}
                >
                  <div className="getting-started-card-top">
                    <div className="getting-started-card-icon-wrap">
                      <i
                        className={`ti ${step.icon} getting-started-card-icon`}
                        style={{ color: isLocked ? "#94a3b8" : step.color }}
                        aria-hidden="true"
                      />
                    </div>
                    {step.isCompleted ? (
                      <span className="step-badge completed">
                        <i className="ti ti-check" aria-hidden="true" /> Done
                      </span>
                    ) : isLocked ? (
                      <span className="step-badge locked">
                        <i className="ti ti-lock" aria-hidden="true" /> Locked
                      </span>
                    ) : (
                      <span className="step-badge active">Active</span>
                    )}
                  </div>

                  <div className="getting-started-card-content">
                    <h3 className="getting-started-card-title">{step.title}</h3>
                    <p className="getting-started-card-desc">{step.desc}</p>
                  </div>

                  <div className="getting-started-card-footer">
                    {isLocked ? (
                      <div className="getting-started-lock-info">
                        <span className="getting-started-lock-text">
                          {step.lockReason}
                        </span>
                        <button
                          type="button"
                          className="getting-started-btn disabled"
                          disabled
                          aria-disabled="true"
                        >
                          <i className="ti ti-lock" aria-hidden="true" />{" "}
                          {step.actionLabel}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="getting-started-btn"
                        onClick={() => setActivePage(step.page)}
                      >
                        {step.actionLabel}
                        <i
                          className="ti ti-arrow-right getting-started-btn-arrow"
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
              <span className="stat-value">
                <CountUp
                  from={0}
                  to={counts[s.key]}
                  duration={1.5}
                  delay={0}
                  direction="up"
                />
              </span>
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
        <GlareHover
          width="100%"
          height="auto"
          background="#f0f8ff"
          borderRadius="12px"
          borderColor="rgba(130, 199, 255, 0.25)"
          glareColor="#82C7FF"
          glareOpacity={0.25}
          glareAngle={-30}
          glareSize={300}
          transitionDuration={800}
          playOnce={false}
          style={{ display: "block" }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <p className="overview-body">
              NeuroPath is a specialized platform designed to support educators
              and specialists working with students diagnosed with Autism
              Spectrum Disorder. It streamlines the creation and management of
              student profiles, tracks behavioral and academic progress, and
              leverages AI to generate individualized education plans — helping
              every student reach their full potential.
            </p>
          </div>
        </GlareHover>
      </div>
    </div>
  );
}
