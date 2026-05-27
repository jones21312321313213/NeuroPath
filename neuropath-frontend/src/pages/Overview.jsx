import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { studentsAPI } from "../api/client";
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
  const [greeting, setGreeting] = useState("Good morning");
  const [counts, setCounts] = useState({
    students: 0,
    ieps: 0,
    insights: 0,
    reviews: 0,
  });

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    studentsAPI
      .list(user.id)
      .then((data) => {
        const students = Array.isArray(data) ? data : [];
        setCounts((prev) => ({
          ...prev,
          students: students.length,
        }));
      })
      .catch(() => {});
  }, [user]);

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
