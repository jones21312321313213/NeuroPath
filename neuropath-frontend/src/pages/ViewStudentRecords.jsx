import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import { studentsAPI } from "../api/client";

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

export default function ViewStudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    studentsAPI
      .list()
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (s) => {
    setSelectedStudent(s);
    setLoadingDetail(true);
    studentsAPI
      .get(s.studentID)
      .then((res) => setStudentDetail(res.data || res))
      .catch(() => setError("Failed to load student record."))
      .finally(() => setLoadingDetail(false));
  };

  const filtered = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // ── Student Record Detail ──────────────────────────────
  if (selectedStudent) {
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Student Records</span>
        </div>
        <div className="om-body">
          {loadingDetail ? (
            <div className="om-card">
              <p className="om-empty">Loading record…</p>
            </div>
          ) : (
            <div className="om-record-card">
              <h2 className="om-record-title">Student Record</h2>

              {/* Student Profile */}
              <div className="om-section">
                <div className="om-section-header">STUDENT PROFILE</div>
                <div className="om-profile-grid">
                  <div className="om-profile-field">
                    <span className="om-field-label">Name:</span>
                    <span>{studentDetail?.name || selectedStudent.name}</span>
                  </div>
                  <div className="om-profile-field">
                    <span className="om-field-label">Age:</span>
                    <span>{studentDetail?.age || selectedStudent.age}</span>
                  </div>
                  <div className="om-profile-field">
                    <span className="om-field-label">Grade:</span>
                    <span>
                      Grade {studentDetail?.grade || selectedStudent.grade}
                    </span>
                  </div>
                  <div className="om-profile-field">
                    <span className="om-field-label">Gender:</span>
                    <span>{studentDetail?.gender || "—"}</span>
                  </div>
                  <div className="om-profile-field full-width">
                    <span className="om-field-label">Primary Disability:</span>
                    <span>{studentDetail?.asdBackground || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Present Levels */}
              <div className="om-section">
                <div className="om-section-header">
                  PRESENT LEVELS OF PERFORMANCE (PLAAFP)
                </div>
                <div className="om-plaafp">
                  <p>
                    <strong>Assessment Results:</strong>{" "}
                    {studentDetail?.assessmentResult || "—"}
                  </p>
                  <p>
                    <strong>Preferences:</strong>{" "}
                    {studentDetail?.preferences || "—"}
                  </p>
                </div>
              </div>

              {/* Goals — shown from IEP when backend is ready */}
              <div className="om-section">
                <div className="om-section-header">GOALS & OBJECTIVES</div>
                <div className="om-plaafp">
                  <p style={{ color: "#aaa", fontStyle: "italic" }}>
                    IEP goals will appear here once the IEP Generation module is
                    connected.
                  </p>
                </div>
              </div>

              <div className="om-record-actions">
                <button
                  className="btn btn-back"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentDetail(null);
                  }}
                >
                  ← Back
                </button>
                <button className="btn om-export-btn">EXPORT</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Student List ───────────────────────────────────────
  return (
    <div className="page-content">
      <div className="om-header">
        <span className="om-header-title">View Student Records</span>
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
              <p className="om-empty">Loading students…</p>
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
                    onClick={() => handleSelect(s)}
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
