import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ViewStudentProfile.css";
import { useAuth } from "../../context/AuthContext";
import StudentShimmer from "../../components/StudentShimmer";
import ErrorState from "../../components/ui/ErrorState";
import Pagination from "../../components/ui/Pagination";
import { useStudents } from "../../hooks/queries";

export default function ViewStudentProfile({
  setActivePage,
  setSelectedStudentId,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { user } = useAuth();
  const {
    data: rawStudents = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useStudents(user?.id);

  const students = useMemo(
    () => (Array.isArray(rawStudents) ? rawStudents : rawStudents?.results || []),
    [rawStudents]
  );

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

  const filteredAndSorted = useMemo(() => {
    const query = search.toLowerCase().trim();
    const list = students.filter((s) => {
      if (!query) return true;
      return (
        s.name?.toLowerCase().includes(query) ||
        s.diagnosis?.toLowerCase().includes(query) ||
        String(s.grade || "").includes(query)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "grade_asc") return (Number(a.grade) || 0) - (Number(b.grade) || 0);
      if (sortBy === "grade_desc") return (Number(b.grade) || 0) - (Number(a.grade) || 0);
      if (sortBy === "age_asc") return (Number(a.age) || 0) - (Number(b.age) || 0);
      if (sortBy === "age_desc") return (Number(b.age) || 0) - (Number(a.age) || 0);
      return 0;
    });
  }, [students, search, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const filtered = filteredAndSorted;

  if (isLoading && students.length === 0) {
    return (
      <div className="page-content">
        <div className="form-card">
          <h2 className="form-section-title">View Student Profiles</h2>
          <StudentShimmer rows={6} variant="table" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-content">
        <div className="form-card">
          <h2 className="form-section-title">View Student Profiles</h2>
          <ErrorState
            title="Failed to Load Student Profiles"
            message={error?.message || "We encountered an issue loading your registered students."}
            onRetry={() => refetch()}
            retryLabel="Try Again"
          />
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

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="vsp-search-wrap flex-1 !mb-0">
            <i className="ti ti-search vsp-search-icon" aria-hidden="true" />
            <input
              id="search-students-input"
              type="text"
              className="vsp-search"
              placeholder="Search by student name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search students by name"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="student-sort-select"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
            >
              Sort by:
            </label>
            <select
              id="student-sort-select"
              aria-label="Sort students by"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <option value="name_asc">Name (A – Z)</option>
              <option value="name_desc">Name (Z – A)</option>
              <option value="grade_asc">Grade (Low to High)</option>
              <option value="grade_desc">Grade (High to Low)</option>
              <option value="age_asc">Age (Youngest first)</option>
              <option value="age_desc">Age (Oldest first)</option>
            </select>
          </div>
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
          <>
            <div className="vsp-grid">
              {paginatedStudents.map((student) => {
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

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredAndSorted.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
