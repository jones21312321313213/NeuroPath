import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import { studentsAPI, trackingAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

function EmptyState({ message }) {
  return (
    <div className="om-empty">
      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>
        📭
      </span>
      {message}
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
              stroke="#e3eaf2"
              strokeWidth={1}
            />
            <text x={0} y={y + 4} fontSize={9} fill="#aaa">
              {v}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="#5aabf0"
        strokeWidth={2.5}
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
            r={4}
            fill="#5aabf0"
            stroke="#fff"
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
            y={h + 14}
            fontSize={9}
            fill="#aaa"
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

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, [user?.id]);

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
            <div className="om-subject-header">
              <h2 className="om-subject-title">{selectedSubject.name}</h2>
              <span
                className="om-status-badge"
                style={{ color: statusColor, background: statusBg }}
              >
                {selectedSubject.status}
              </span>
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
            <h2 className="om-list-title">{selectedStudent.name} – Subjects</h2>
            {subjectsLoading ? (
              <StudentShimmer />
            ) : subjectsError ? (
              <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
                ⚠️ {subjectsError}
              </p>
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
            <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
              ⚠️ {error}
            </p>
          )}
          <div className="om-search-bar">
            <input
              className="form-input om-search-input"
              placeholder="Search Student Records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="om-filters">
              <span className="om-filter-label">Filter:</span>
              <select
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
