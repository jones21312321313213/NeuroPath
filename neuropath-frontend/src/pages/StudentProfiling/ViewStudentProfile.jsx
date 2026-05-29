import { useEffect, useState } from "react";
import "../../styles/ViewStudentProfile.css";
import { useAuth } from "../../context/AuthContext";
import StudentShimmer from "../../components/StudentShimmer";

export default function ViewStudentProfile({
  setActivePage,
  setSelectedStudentId,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const teacherId = user?.id;
    if (!teacherId) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:8000/api/users/students/?teacher_id=${teacherId}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user]);

  const handleView = (id) => {
    setSelectedStudentId(id);
    setActivePage("view-student-detail");
  };

  const getInitials = (name = "") =>
    name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const filtered = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="page-content">
        <div className="form-card">
          <h2 className="form-section-title">View Student Profiles</h2>
          <StudentShimmer rows={6} variant="table" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="form-card">
        {/* Header */}
        <div className="vsp-header">
          <h2 className="vsp-title">Student Profiles</h2>
          <span className="vsp-count-badge">
            {students.length} {students.length === 1 ? "student" : "students"}
          </span>
        </div>
        <p className="vsp-subtitle">
          Browse and manage your registered student records.
        </p>

        {/* Search */}
        <div className="vsp-search-wrap">
          <i className="ti ti-search vsp-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="vsp-search"
            placeholder="Search by student name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="vsp-empty">
            <div className="vsp-empty-icon">
              <i className="ti ti-users-group" />
            </div>
            <p className="vsp-empty-text">
              {search ? "No students match your search." : "No students found."}
            </p>
            <p className="vsp-empty-sub">
              {search
                ? "Try a different name."
                : "Create a student profile to get started."}
            </p>
          </div>
        ) : (
          <div className="vsp-grid">
            {filtered.map((student) => (
              <div key={student.studentID} className="vsp-card">
                {/* Top row */}
                <div className="vsp-card-top">
                  <div className="vsp-avatar">{getInitials(student.name)}</div>
                  <div className="vsp-card-info">
                    <p className="vsp-card-name">{student.name}</p>
                    <span className="vsp-card-meta">
                      {student.diagnosis || "No diagnosis on record"}
                    </span>
                  </div>
                </div>

                {/* Pills */}
                <div className="vsp-card-pills">
                  <span className="vsp-pill grade">Grade {student.grade}</span>
                  {student.gender && (
                    <span className="vsp-pill">{student.gender}</span>
                  )}
                  {student.age && (
                    <span className="vsp-pill">{student.age} yrs</span>
                  )}
                </div>

                {/* Footer */}
                <div className="vsp-card-footer">
                  <button
                    className="vsp-view-btn"
                    onClick={() => handleView(student.studentID)}
                  >
                    View profile
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
