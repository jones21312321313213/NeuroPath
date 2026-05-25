import { useState, useEffect, useCallback } from "react";
import "../styles/ManageLessonPlans.css";
import { lessonPlansAPI, studentsAPI } from "../api/client";

const TABS = [
  { key: "generate", label: "Generate Lesson Plan" },
  { key: "view", label: "View Lesson Plans" },
  { key: "edit", label: "Edit Lesson Plans" },
  { key: "delete", label: "Delete Lesson Plans" },
];

function EmptyState({ message = "No records found." }) {
  return (
    <div className="lp-empty">
      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>
        📭
      </span>
      {message}
    </div>
  );
}

// ── Generate Tab ───────────────────────────────────────────────────────────────
function GenerateTab() {
  return (
    <div className="lp-card lp-placeholder-tab">
      <div className="lp-placeholder-icon">📝</div>
      <p className="lp-placeholder-title">AI Lesson Plan Generation</p>
      <p className="lp-placeholder-desc">
        This feature is coming soon. The AI-powered lesson plan generator will
        allow you to create customized lesson plans for each student based on
        their IEP goals and learning profile.
      </p>
    </div>
  );
}

// ── View Tab ───────────────────────────────────────────────────────────────────
function ViewTab() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    studentsAPI
      .list()
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setLoadingPlans(true);
    lessonPlansAPI
      .list({ studentID: s.studentID })
      .then(setPlans)
      .catch(() => setError("Failed to load lesson plans."))
      .finally(() => setLoadingPlans(false));
  };

  const filteredStudents = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // Detail view
  if (viewingPlan) {
    return (
      <div className="lp-card">
        <p className="lp-card-title">
          {selectedStudent?.name} – {viewingPlan.title}
        </p>
        <div className="lp-detail-meta">
          <div className="lp-detail-row">
            <span className="lp-detail-label">Student:</span>
            <span>{viewingPlan.studentName}</span>
          </div>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Status:</span>
            <span>{viewingPlan.status}</span>
          </div>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Date Created:</span>
            <span>
              {new Date(viewingPlan.dateCreated).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="lp-actions">
          <button className="btn btn-back" onClick={() => setViewingPlan(null)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Student plan list
  if (selectedStudent) {
    return (
      <div className="lp-card">
        <p className="lp-card-title">{selectedStudent.name} – Lesson Plans</p>
        {loadingPlans ? (
          <p className="lp-empty">Loading…</p>
        ) : plans.length === 0 ? (
          <EmptyState message="No lesson plans found for this student." />
        ) : (
          <div className="lp-plan-list">
            {plans.map((plan) => (
              <div key={plan.lessonID} className="lp-plan-row">
                <span className="lp-plan-title">{plan.title}</span>
                <button
                  className="va-view-btn"
                  onClick={() => setViewingPlan(plan)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="lp-actions">
          <button
            className="btn btn-back"
            onClick={() => {
              setSelectedStudent(null);
              setPlans([]);
            }}
          >
            ← Back to Students
          </button>
        </div>
      </div>
    );
  }

  // Student selection
  return (
    <div className="lp-card">
      <p className="lp-card-title">Select a Student</p>
      {error && (
        <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
          ⚠️ {error}
        </p>
      )}
      <div className="lp-search-bar">
        <input
          className="form-input lp-search-input"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="lp-filters">
          <span className="lp-filter-label">Filter</span>
          <select
            className="form-select lp-filter-select"
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
            className="form-select lp-filter-select"
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
      <div className="va-student-list" style={{ marginTop: 16 }}>
        {loadingStudents ? (
          <p className="lp-empty">Loading students…</p>
        ) : filteredStudents.length === 0 ? (
          <EmptyState message="No students found." />
        ) : (
          filteredStudents.map((s) => (
            <div key={s.studentID} className="va-student-row">
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.name}</span>
                <span className="va-student-grade">Grade – {s.grade}</span>
              </div>
              <button
                className="va-select-btn"
                onClick={() => handleSelectStudent(s)}
              >
                Select
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Edit Tab ───────────────────────────────────────────────────────────────────
function EditTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [formValue, setFormValue] = useState({ title: "", status: "" });
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    lessonPlansAPI
      .list()
      .then(setPlans)
      .catch(() => setError("Failed to load lesson plans."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setFormValue({ title: plan.title, status: plan.status });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await lessonPlansAPI.update(
        editingPlan.lessonID,
        formValue,
      );
      setPlans((prev) =>
        prev.map((p) =>
          p.lessonID === editingPlan.lessonID ? { ...p, ...updated } : p,
        ),
      );
      setEditingPlan(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editingPlan) {
    return (
      <div className="lp-card">
        <p className="lp-card-title">Edit Lesson Plan</p>
        <p className="lp-edit-context">
          Editing: <strong>{editingPlan.title}</strong>
        </p>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={formValue.title}
            onChange={(e) =>
              setFormValue({ ...formValue, title: e.target.value })
            }
          />
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={formValue.status}
            onChange={(e) =>
              setFormValue({ ...formValue, status: e.target.value })
            }
          >
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Generated">Generated</option>
          </select>
        </div>
        {error && (
          <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>
            ⚠️ {error}
          </p>
        )}
        <div className="lp-actions">
          <button className="btn btn-back" onClick={() => setEditingPlan(null)}>
            Cancel
          </button>
          <button
            className="btn btn-submit"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="lp-card">
        <p className="lp-empty">Loading…</p>
      </div>
    );

  return (
    <div className="lp-card">
      <p className="lp-card-title">Templates</p>
      {error && (
        <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
          ⚠️ {error}
        </p>
      )}
      {plans.length === 0 ? (
        <EmptyState message="No lesson plans found." />
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Lesson Plan</th>
              <th>Student</th>
              <th>Date Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.lessonID}>
                <td>{plan.title}</td>
                <td>{plan.studentName}</td>
                <td>{new Date(plan.dateCreated).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`lp-status ${plan.status === "Active" ? "active" : "draft"}`}
                  >
                    {plan.status}
                  </span>
                </td>
                <td>
                  <div className="lp-edit-actions">
                    <button
                      className="lp-edit-btn activity"
                      onClick={() => openEdit(plan)}
                    >
                      Edit Plan
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Delete Tab ─────────────────────────────────────────────────────────────────
function DeleteTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    lessonPlansAPI
      .list()
      .then(setPlans)
      .catch(() => setError("Failed to load lesson plans."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await lessonPlansAPI.delete(toDelete);
      setPlans((prev) => prev.filter((p) => p.lessonID !== toDelete));
      setToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return (
      <div className="lp-card">
        <p className="lp-empty">Loading…</p>
      </div>
    );

  return (
    <div className="lp-card">
      <p className="lp-card-title">Templates</p>
      {error && (
        <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
          ⚠️ {error}
        </p>
      )}
      {plans.length === 0 ? (
        <EmptyState message="No lesson plans to delete." />
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Lesson Plan</th>
              <th>Student</th>
              <th>Date Created</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.lessonID}>
                <td>{plan.title}</td>
                <td>{plan.studentName}</td>
                <td>{new Date(plan.dateCreated).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`lp-status ${plan.status === "Active" ? "active" : "draft"}`}
                  >
                    {plan.status}
                  </span>
                </td>
                <td>
                  <button
                    className="va-delete-btn"
                    onClick={() => setToDelete(plan.lessonID)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {toDelete && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <p className="va-modal-title">Delete Lesson Plan?</p>
            <p className="va-modal-body">
              Are you sure you want to permanently delete this lesson plan?
            </p>
            <div className="va-modal-actions">
              <button
                className="btn lp-modal-yes"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "YES"}
              </button>
              <button
                className="btn btn-back"
                onClick={() => setToDelete(null)}
                disabled={deleting}
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ManageLessonPlans() {
  const [activeTab, setActiveTab] = useState("view");

  return (
    <div className="page-content">
      <div className="va-header">
        <span className="va-header-title">Manage Lesson Plan</span>
        <div className="va-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`va-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="va-body">
        {activeTab === "generate" && <GenerateTab />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
