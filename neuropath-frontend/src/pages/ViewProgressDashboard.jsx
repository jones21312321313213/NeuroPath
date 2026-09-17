import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import { studentsAPI, trackingAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";
import RecordProgressModal from "../components/RecordProgressModal";
import {
  InboxIcon,
  ChartBarIcon,
  TargetIcon,
  WarningIcon,
  CalendarIcon,
} from "../components/ui/icons";

function EmptyState({ message }) {
  return (
    <div className="om-empty">
      <span className="om-empty-icon flex items-center justify-center">
        <InboxIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />
      </span>
      <p className="om-empty-title">{message}</p>
    </div>
  );
}

function LineChart({ data = [], months = [] }) {
  if (!data || data.length === 0) return null;
  const w = 280,
    h = 100,
    max = 100;
  const divisor = data.length > 1 ? data.length - 1 : 1;
  const points = data
    .map((v, i) => {
      const x = data.length > 1 ? (i / divisor) * (w - 20) + 10 : w / 2;
      const y = h - (v / max) * (h - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {[25, 50, 75, 100].map((v) => {
        const y = h - (v / max) * (h - 10) - 5;
        return (
          <g key={v}>
            <line
              x1={10}
              y1={y}
              x2={w - 10}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={0} y={y + 4} fontSize={11} fill="#64748b" fontWeight={600}>
              {v}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="#0284c7"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => {
        const x = data.length > 1 ? (i / divisor) * (w - 20) + 10 : w / 2;
        const y = h - (v / max) * (h - 10) - 5;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4.5}
            fill="#0284c7"
            stroke="#ffffff"
            strokeWidth={2}
          />
        );
      })}
      {months.map((m, i) => {
        const x = months.length > 1 ? (i / (months.length - 1)) * (w - 20) + 10 : w / 2;
        return (
          <text
            key={i}
            x={x}
            y={h + 16}
            fontSize={11}
            fill="#64748b"
            fontWeight={600}
            textAnchor="middle"
          >
            {m}
          </text>
        );
      })}
    </svg>
  );
}

export default function ViewProgressDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const refreshSubjects = async (studentId) => {
    if (!studentId) return;
    try {
      const data = await trackingAPI.getProgressDashboard(studentId);
      setSubjects(data || []);
      setSelectedSubject((prev) => {
        if (!prev || !data) return prev;
        const updated = data.find((s) => s.name === prev.name || s.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
      setSubjectsError("Failed to load progress data for this student.");
      setSubjects([]);
    }
  };

  useEffect(() => {
    if (!selectedStudent?.studentID) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSubjectsLoading(true);
        setSubjectsError("");
      }
    });

    trackingAPI
      .getProgressDashboard(selectedStudent.studentID)
      .then((data) => {
        if (!cancelled) {
          setSubjects(data || []);
          setSelectedSubject((prev) => {
            if (!prev || !data) return prev;
            const updated = data.find((s) => s.name === prev.name || s.id === prev.id);
            return updated || prev;
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setSubjectsError("Failed to load progress data for this student.");
          setSubjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSubjectsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.studentID]);

  const filtered = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // ── Executive KPI Metric Computations ───────────────────
  const totalSubjectsCount = subjects.length;
  const overallMasteryRate =
    totalSubjectsCount > 0
      ? Math.round(
          subjects.reduce((sum, s) => sum + (s.progress || 0), 0) /
            totalSubjectsCount,
        )
      : 0;
  const goalsOnTrackCount = subjects.filter(
    (s) => (s.progress || 0) >= 70,
  ).length;
  const needsSupportCount = subjects.filter(
    (s) => (s.progress || 0) < 70,
  ).length;
  const lastEvaluatedDate = (() => {
    if (!subjects || subjects.length === 0) return "N/A";
    const subjectsWithDate = subjects.filter(
      (s) => s.lastUpdated && !isNaN(Date.parse(s.lastUpdated)),
    );
    if (subjectsWithDate.length === 0) {
      return subjects[0]?.lastUpdated || "N/A";
    }
    const latestSubject = subjectsWithDate.reduce((latest, current) => {
      return new Date(current.lastUpdated) > new Date(latest.lastUpdated)
        ? current
        : latest;
    });
    return latestSubject.lastUpdated;
  })();

  // ── Subject Detail ─────────────────────────────────────
  if (selectedSubject) {
    const statusColor =
      selectedSubject.status === "On Track" ? "#16a34a" : "#d97706";
    const statusBg =
      selectedSubject.status === "On Track" ? "#dcfce7" : "#fef3c7";

    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Progress Dashboard</span>
        </div>
        <div className="om-body">
          <div className="om-record-card">
            <div className="om-list-action-bar">
              <div className="om-subject-header" style={{ margin: 0 }}>
                <h2 className="om-subject-title">{selectedSubject.name}</h2>
                <span
                  className="om-status-badge"
                  style={{ color: statusColor, background: statusBg }}
                >
                  {selectedSubject.status}
                </span>
              </div>
              <button
                type="button"
                className="om-log-progress-btn"
                onClick={() => setIsLogModalOpen(true)}
              >
                + Log Progress
              </button>
            </div>
            <p className="om-last-updated">
              Last Updated: {selectedSubject.lastUpdated}
            </p>

            <div className="om-progress-section">
              <div className="om-progress-label">
                <span>Overall Progress</span>
                <span className="om-progress-pct">
                  {selectedSubject.progress}%
                </span>
              </div>
              <div className="om-progress-track">
                <div
                  className="om-progress-fill"
                  style={{ width: `${selectedSubject.progress}%` }}
                />
              </div>
            </div>

            <div className="om-detail-grid">
              <div className="om-chart-box">
                <p className="om-box-title">Progress Over Time</p>
                <LineChart
                  data={selectedSubject.chartData}
                  months={selectedSubject.months}
                />
              </div>
              <div className="om-summary-box">
                <p className="om-box-title">Summary</p>
                <div className="om-summary-rows">
                  {[
                    {
                      label: "Current Level",
                      value: selectedSubject.currentLevel,
                    },
                  ].map((row) => (
                    <div key={row.label} className="om-summary-row">
                      <span className="om-summary-label">{row.label}</span>
                      <span className="om-summary-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="om-record-actions">
              <button
                className="btn btn-back"
                onClick={() => setSelectedSubject(null)}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        <RecordProgressModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          student={selectedStudent}
          existingSubjects={subjects}
          initialSubject={selectedSubject.name}
          onSubmitSuccess={() => {
            if (selectedStudent?.studentID) {
              refreshSubjects(selectedStudent.studentID);
            }
          }}
        />
      </div>
    );
  }

  // ── Subject List ───────────────────────────────────────
  if (selectedStudent) {
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Progress Dashboard</span>
        </div>
        <div className="om-body">
          <div className="om-card">
            <div className="om-list-action-bar">
              <h2 className="om-list-title">{selectedStudent.name} – Subjects</h2>
              <button
                type="button"
                className="om-log-progress-btn"
                onClick={() => setIsLogModalOpen(true)}
              >
                + Log Progress
              </button>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="om-kpi-grid">
              <div className="om-kpi-card">
                <div className="om-kpi-header">
                  <span className="om-kpi-title">Overall Mastery Rate</span>
                  <span className="om-kpi-icon">
                    <ChartBarIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  </span>
                </div>
                <span className="om-kpi-value">
                  {totalSubjectsCount > 0 ? `${overallMasteryRate}%` : "0%"}
                </span>
                <span className="om-kpi-subtext">
                  Average score across {totalSubjectsCount} domain{totalSubjectsCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="om-kpi-card">
                <div className="om-kpi-header">
                  <span className="om-kpi-title">Goals on Track</span>
                  <span className="om-kpi-icon">
                    <TargetIcon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  </span>
                </div>
                <span className="om-kpi-value" style={{ color: "#16a34a" }}>
                  {goalsOnTrackCount}
                </span>
                <span className="om-kpi-subtext">Scoring ≥ 70% threshold</span>
              </div>

              <div className="om-kpi-card">
                <div className="om-kpi-header">
                  <span className="om-kpi-title">Needs Support</span>
                  <span className="om-kpi-icon">
                    <WarningIcon className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  </span>
                </div>
                <span
                  className="om-kpi-value"
                  style={{ color: needsSupportCount > 0 ? "#d97706" : "#1a2b40" }}
                >
                  {needsSupportCount}
                </span>
                <span className="om-kpi-subtext">Scoring &lt; 70% threshold</span>
              </div>

              <div className="om-kpi-card">
                <div className="om-kpi-header">
                  <span className="om-kpi-title">Last Evaluated</span>
                  <span className="om-kpi-icon">
                    <CalendarIcon className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  </span>
                </div>
                <span className="om-kpi-value om-kpi-date-value">
                  {lastEvaluatedDate}
                </span>
                <span className="om-kpi-subtext">Latest progress log</span>
              </div>
            </div>

            {subjectsLoading ? (
              <StudentShimmer />
            ) : subjectsError ? (
              <div role="alert" className="om-error-banner flex items-center gap-2">
                <WarningIcon className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
                <span>{subjectsError}</span>
              </div>
            ) : subjects.length === 0 ? (
              <EmptyState message="No progress data found for this student." />
            ) : (
              <div className="om-subject-list">
                {subjects.map((sub) => (
                  <div key={sub.id || sub.name} className="om-subject-row">
                    <span className="om-subject-name">{sub.name}</span>
                    <button
                      className="va-select-btn"
                      onClick={() => setSelectedSubject(sub)}
                    >
                      View Progress
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="om-record-actions" style={{ marginTop: 20 }}>
              <button
                className="btn btn-back"
                onClick={() => {
                  setSelectedStudent(null);
                  setSelectedSubject(null);
                }}
              >
                ← Back to Students
              </button>
            </div>
          </div>
        </div>

        <RecordProgressModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          student={selectedStudent}
          existingSubjects={subjects}
          onSubmitSuccess={() => {
            if (selectedStudent?.studentID) {
              refreshSubjects(selectedStudent.studentID);
            }
          }}
        />
      </div>
    );
  }

  // ── Student List ───────────────────────────────────────
  return (
    <div className="page-content">
      <div className="om-header">
        <span className="om-header-title">View Progress Dashboard</span>
      </div>
      <div className="om-body">
        <div className="om-card">
          <h2 className="om-list-title">List of Students</h2>
          {error && (
            <div role="alert" className="om-error-banner flex items-center gap-2">
              <WarningIcon className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <div className="om-search-bar">
            <input
              id="search-students-input"
              className="form-input om-search-input"
              placeholder="Search Student Records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students by name"
            />
            <div className="om-filters">
              <span className="om-filter-label">Filter:</span>
              <select
                id="filter-grade-select"
                aria-label="Filter by grade"
                className="form-select om-filter-select"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
              >
                <option value="">Grade</option>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
              <select
                id="filter-age-select"
                aria-label="Filter by age"
                className="form-select om-filter-select"
                value={filterAge}
                onChange={(e) => setFilterAge(e.target.value)}
              >
                <option value="">Age</option>
                {[6, 7, 8, 9, 10, 11, 12].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="om-student-list">
            {loading ? (
              <StudentShimmer />
            ) : filtered.length === 0 ? (
              <EmptyState message="No students found." />
            ) : (
              filtered.map((s) => (
                <div key={s.studentID} className="om-student-row">
                  <div className="va-student-avatar" />
                  <div className="va-student-info">
                    <span className="va-student-name">{s.name}</span>
                    <span className="va-student-grade">Grade – {s.grade}</span>
                  </div>
                  <button
                    className="va-select-btn"
                    onClick={() => {
                      setSelectedStudent(s);
                      setSelectedSubject(null);
                      setSubjects([]);
                    }}
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
