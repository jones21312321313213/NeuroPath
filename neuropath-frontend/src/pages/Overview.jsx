import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  useStudents,
  useIepDashboardStats,
  useLessonPlans,
  useVisualAids,
} from "../hooks/queries";
import CountUp from "../components/ui/CountUp";

const stats = [
  {
    label: "Total Students",
    key: "students",
    icon: "ti-users",
    color: "#0284c7",
  },
  {
    label: "Active IEPs",
    key: "ieps",
    icon: "ti-file-text",
    color: "#16a34a",
  },
  {
    label: "Classroom Resources",
    key: "resources",
    icon: "ti-books",
    color: "#d97706",
  },
];

const quickActions = [
  {
    label: "Create Student Profile",
    path: "/dashboard/students/create",
    desc: "Add a new student profile and set up individual learning preferences.",
    icon: "ti-user-plus",
    color: "#0284c7",
  },
  {
    label: "View All Students",
    path: "/dashboard/students",
    desc: "Browse and manage existing student records.",
    icon: "ti-users",
    color: "#059669",
  },
  {
    label: "Generate IEP",
    path: "/dashboard/iep/generate",
    desc: "Use AI to generate a personalized education plan.",
    icon: "ti-sparkles",
    color: "#7c3aed",
  },
];

export default function Overview({ setActivePage }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const [currentTime, setCurrentTime] = useState(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: students = [] } = useStudents(user?.id);
  const { data: iepStats } = useIepDashboardStats();
  const { data: lessons = [] } = useLessonPlans(user?.id);
  const { data: visualAids = [] } = useVisualAids();

  const studentList = Array.isArray(students) ? students : (students?.results || []);
  const lessonList = Array.isArray(lessons) ? lessons : (lessons?.results || []);
  const visualAidList = Array.isArray(visualAids) ? visualAids : (visualAids?.results || []);

  const counts = {
    students: studentList.length,
    ieps: iepStats?.active_ieps ?? 0,
    resources: lessonList.length + visualAidList.length,
  };

  const hasStudents = counts.students > 0;
  const hasIeps = counts.ieps > 0;

  const gettingStartedSteps = [
    {
      stepNumber: 1,
      title: "1. Add a student",
      desc: "Create a student profile to start personalizing learning plans.",
      icon: "ti-user-plus",
      color: "#0284c7",
      path: "/dashboard/students/create",
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
      color: "#7c3aed",
      path: "/dashboard/iep/generate",
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
      color: "#059669",
      path: "/dashboard/lessons",
      page: "manage-lesson-plans",
      actionLabel: "Open Tools",
      isUnlocked: hasIeps,
      isCompleted: false,
      lockReason: "Requires a saved IEP",
    },
  ];

  const handleNavigate = (path, page) => {
    if (path) navigate(path);
    if (setActivePage) setActivePage(path || page);
  };

  return (
    <div className="page-content">
      <div className="overview-wrapper">
        {/* Colorful Greeting Hero Banner */}
        <div className="overview-welcome">
          <div className="hero-content-left">
            <h1 className="overview-title">
              {greeting}, Teacher{user?.first_name ? ` ${user.first_name}` : ""}!
            </h1>
            <p className="overview-subtitle">
              Ready to support your learners today? Check on your students' individual learning goals,
              review recent IEP progress, or prepare your instructional materials below.
            </p>
          </div>
          <div className="hero-datetime-block">
            <span className="hero-time-text">{currentTime}</span>
            <span className="hero-date-text">{todayFormatted}</span>
          </div>
        </div>

        {/* Section: Stats Grid */}
        <div className="overview-glance-strip">
          {stats.map((s) => (
            <div key={s.label} className="glance-stat-col">
              <div className="glance-stat-header">
                <span className="glance-stat-dot" style={{ background: s.color }} />
                <span className="glance-stat-label">{s.label}</span>
              </div>
              <div className="glance-stat-body">
                <span className="glance-stat-value">
                  <CountUp
                    from={0}
                    to={counts[s.key]}
                    duration={1.5}
                    delay={0}
                    direction="up"
                  />
                </span>
                <i
                  className={`ti ${s.icon} glance-stat-icon`}
                  aria-hidden="true"
                  style={{ color: s.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Section: Quick Actions */}
        <div>
          <p className="overview-section-label">Quick actions</p>
          <div className="quick-actions">
            {quickActions.map((a) => (
              <button
                key={a.path || a.label}
                className="quick-action-card"
                onClick={() => handleNavigate(a.path, a.page)}
              >
                <div
                  className="quick-action-icon-wrap"
                  style={{ background: `${a.color}15`, color: a.color }}
                >
                  <i
                    className={`ti ${a.icon} quick-action-icon`}
                    aria-hidden="true"
                  />
                </div>
                <div className="quick-action-content">
                  <div className="quick-action-header">
                    <span className="quick-action-label">{a.label}</span>
                    <i
                      className="ti ti-arrow-right quick-action-arrow"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="quick-action-desc">{a.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Classroom Setup Workflow */}
        <div
          className="overview-getting-started-section"
          data-testid="getting-started-section"
        >
          <div className="overview-getting-started-header">
            <div>
              <p className="overview-section-label" style={{ marginBottom: 0 }}>
                Classroom setup workflow
              </p>
              <span className="overview-getting-started-hint">
                3-step path to personalize, plan, and support your learners
              </span>
            </div>
          </div>

          {/* Connected Timeline Workflow Container */}
          <div className="workflow-timeline-card">
            <div className="workflow-timeline-connector-line" aria-hidden="true" />
            <div className="getting-started-steps">
              {gettingStartedSteps.map((step) => {
                const isLocked = !step.isUnlocked;
                return (
                  <div
                    key={step.stepNumber}
                    data-testid={`getting-started-step-${step.stepNumber}`}
                    className={`getting-started-step-node ${isLocked ? "locked" : "active"} ${step.isCompleted ? "completed" : ""}`}
                  >
                    {/* Circular status indicator */}
                    <div className="workflow-step-circle-wrap">
                      {step.isCompleted ? (
                        <div className="workflow-circle completed" title="Completed">
                          <i className="ti ti-check" aria-hidden="true" />
                        </div>
                      ) : isLocked ? (
                        <div className="workflow-circle locked" title="Locked">
                          <i className="ti ti-lock" aria-hidden="true" />
                        </div>
                      ) : (
                        <div className="workflow-circle active" title="Active">
                          <i className="ti ti-point-filled" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* Status badge pill */}
                    <div className="workflow-step-badge-wrap">
                      {step.isCompleted ? (
                        <span className="step-badge completed">
                          <i className="ti ti-check" aria-hidden="true" /> Completed
                        </span>
                      ) : isLocked ? (
                        <span className="step-badge locked">Locked</span>
                      ) : (
                        <span className="step-badge pending">Pending</span>
                      )}
                    </div>

                    {/* Step Title and Description */}
                    <div className="getting-started-card-content">
                      <h3 className="getting-started-card-title">{step.title}</h3>
                      <p className="getting-started-card-desc">{step.desc}</p>
                    </div>

                    {/* Step Action Button */}
                    <div className="getting-started-card-footer">
                      {step.isCompleted ? (
                        <button
                          type="button"
                          className="getting-started-btn done-btn"
                          disabled
                          aria-disabled="true"
                        >
                          <i className="ti ti-check" aria-hidden="true" /> Done
                        </button>
                      ) : isLocked ? (
                        <div className="getting-started-lock-info">
                          <button
                            type="button"
                            className="getting-started-btn disabled"
                            disabled
                            aria-disabled="true"
                          >
                            {step.actionLabel}
                          </button>
                          <span className="getting-started-lock-text">
                            {step.lockReason}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="getting-started-btn primary-action-btn"
                          onClick={() => handleNavigate(step.path, step.page)}
                        >
                          <span>{step.actionLabel}</span>
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
        </div>

        {/* Section: About NeuroPath */}
        <div className="overview-about-strip">
          <div className="overview-about-icon">
            <i className="ti ti-bulb" aria-hidden="true" />
          </div>
          <div className="overview-about-content">
            <h4 className="overview-about-title">Built for Special Education</h4>
            <p className="overview-body">
              NeuroPath is an adaptive instructional platform for special education teachers
              handling elementary students with diverse needs. It streamlines
              student profile management, tracks IEP progress, and generates functional,
              curriculum-aligned lesson plans and visual aids for classroom instruction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
