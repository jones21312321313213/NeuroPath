import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ViewStudentProfile.css";
import { useAuth } from "../../context/AuthContext";
import StudentShimmer from "../../components/StudentShimmer";
import { studentsAPI } from "../../api/client";

export default function ViewStudentProfile({
  setActivePage,
  setSelectedStudentId,
}) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const teacherId = user?.id;
    if (!teacherId) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setError(""));

    studentsAPI
      .list(teacherId)
      .then((data) => {
        if (cancelled) return;
        setStudents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load student profiles.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleView = (id) => {
    if (setSelectedStudentId) setSelectedStudentId(id);
    if (setActivePage) setActivePage("view-student-detail");
    navigate(`/dashboard/students/${id}`);
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

  if (error) {
    return (
      <div className="page-content">
        <div className="form-card">
          <h2 className="form-section-title">View Student Profiles</h2>
          <div className="placeholder-page">{error}</div>
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
                ? "Try a different name or clear the search filter."
                : "Create a student profile to get started with NeuroPath."}
            </p>
            {search ? (
              <button
                type="button"
                className="vsp-empty-btn vsp-empty-btn-secondary"
                onClick={() => setSearch("")}
              >
                <i className="ti ti-x" aria-hidden="true" />
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="vsp-empty-btn"
                onClick={() => {
                  if (setActivePage) setActivePage("create-student-profile");
                  navigate("/dashboard/students/create");
                }}
              >
                <i className="ti ti-user-plus" aria-hidden="true" />
                Create Student
              </button>
            )}
          </div>
        ) : (
          <div className="vsp-grid">
            {filtered.map((student) => {
              const studentId = student.studentID ?? student.id;
              return (
                <div key={studentId} className="vsp-card">
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
                      onClick={() => handleView(studentId)}
                    >
                      View profile
                      <i className="ti ti-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
