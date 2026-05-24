import "../styles/ManageLessonPlans.css";
import { useState } from "react";

const TABS = [
  { key: "generate", label: "Generate Lesson Plan" },
  { key: "view", label: "View Lesson Plans" },
  { key: "edit", label: "Edit Lesson Plans" },
  { key: "delete", label: "Delete Lesson Plans" },
];

const MOCK_STUDENTS = [
  { id: 1, name: "John Clyde Perez", grade: 3, age: 9 },
  { id: 2, name: "Maria Santos", grade: 2, age: 8 },
  { id: 3, name: "Carlo Reyes", grade: 4, age: 10 },
  { id: 4, name: "Ana Dela Cruz", grade: 3, age: 9 },
];

const MOCK_LESSON_PLANS = [
  {
    id: 1,
    studentId: 1,
    title: "Reading Comprehension",
    dateCreated: "2026-05-01",
    status: "Active",
    activity:
      "Students will read a short passage and answer comprehension questions to identify the main idea, supporting details, and vocabulary in context.",
    objective:
      "By the end of the lesson, the student will be able to identify the main idea and at least 3 supporting details from a given reading passage with 80% accuracy.",
    grade: 3,
  },
  {
    id: 2,
    studentId: 1,
    title: "Number Sense – Counting",
    dateCreated: "2026-05-10",
    status: "Active",
    activity:
      "Students will use manipulatives and number lines to count forward and backward from any given number within 100.",
    objective:
      "The student will count forward and backward by 1s and 10s from any given number up to 100 with 90% accuracy.",
    grade: 3,
  },
  {
    id: 3,
    studentId: 2,
    title: "Basic Addition",
    dateCreated: "2026-05-08",
    status: "Active",
    activity:
      "Using counters and visual aids, students will practice single-digit addition problems.",
    objective:
      "The student will solve single-digit addition problems with sums up to 20 with 85% accuracy.",
    grade: 2,
  },
  {
    id: 4,
    studentId: 3,
    title: "Science – Plant Life Cycle",
    dateCreated: "2026-05-12",
    status: "Draft",
    activity:
      "Students will observe and label diagrams of the plant life cycle and sequence the stages in order.",
    objective:
      "The student will correctly identify and sequence all 4 stages of the plant life cycle.",
    grade: 4,
  },
];

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
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);

  const filteredStudents = MOCK_STUDENTS.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  const studentPlans = selectedStudent
    ? MOCK_LESSON_PLANS.filter((p) => p.studentId === selectedStudent.id)
    : [];

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
            <span>{selectedStudent?.name}</span>
          </div>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Grade:</span>
            <span>Grade {viewingPlan.grade}</span>
          </div>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Date Created:</span>
            <span>{viewingPlan.dateCreated}</span>
          </div>
        </div>
        <div className="lp-detail-section">
          <p className="lp-detail-section-title">Learning Activity</p>
          <p className="lp-detail-body">{viewingPlan.activity}</p>
        </div>
        <div className="lp-detail-section">
          <p className="lp-detail-section-title">Learning Objective</p>
          <p className="lp-detail-body">{viewingPlan.objective}</p>
        </div>
        <div className="lp-actions">
          <button className="btn btn-back" onClick={() => setViewingPlan(null)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Student plan list view
  if (selectedStudent) {
    return (
      <div className="lp-card">
        <p className="lp-card-title">{selectedStudent.name} – Lesson Plans</p>
        {studentPlans.length === 0 ? (
          <p className="lp-empty">No lesson plans found for this student.</p>
        ) : (
          <div className="lp-plan-list">
            {studentPlans.map((plan) => (
              <div key={plan.id} className="lp-plan-row">
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
            onClick={() => setSelectedStudent(null)}
          >
            ← Back to Students
          </button>
        </div>
      </div>
    );
  }

  // Student selection view
  return (
    <div className="lp-card">
      <p className="lp-card-title">Select a Student</p>
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
            <option value="1">Grade 1</option>
            <option value="2">Grade 2</option>
            <option value="3">Grade 3</option>
            <option value="4">Grade 4</option>
            <option value="5">Grade 5</option>
            <option value="6">Grade 6</option>
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
        {filteredStudents.length === 0 ? (
          <p className="lp-empty">No students match your search.</p>
        ) : (
          filteredStudents.map((s) => (
            <div key={s.id} className="va-student-row">
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.name}</span>
                <span className="va-student-grade">Grade – {s.grade}</span>
              </div>
              <button
                className="va-select-btn"
                onClick={() => setSelectedStudent(s)}
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
  const [editMode, setEditMode] = useState(null); // 'activity' | 'objective'
  const [editingPlan, setEditingPlan] = useState(null);
  const [plans, setPlans] = useState(MOCK_LESSON_PLANS);
  const [formValue, setFormValue] = useState("");

  const openEdit = (plan, mode) => {
    setEditingPlan(plan);
    setEditMode(mode);
    setFormValue(mode === "activity" ? plan.activity : plan.objective);
  };

  const handleSave = () => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              [editMode === "activity" ? "activity" : "objective"]: formValue,
            }
          : p,
      ),
    );
    setEditMode(null);
    setEditingPlan(null);
  };

  // Edit form
  if (editMode) {
    const title =
      editMode === "activity"
        ? "Modify Learning Activity"
        : "Modify Learning Objective";
    return (
      <div className="lp-card">
        <p className="lp-card-title">{title}</p>
        <p className="lp-edit-context">
          Lesson Plan: <strong>{editingPlan.title}</strong>
        </p>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">{title}</label>
          <textarea
            className="form-textarea"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            style={{ minHeight: 140 }}
          />
        </div>
        <div className="lp-actions">
          <button
            className="btn btn-back"
            onClick={() => {
              setEditMode(null);
              setEditingPlan(null);
            }}
          >
            Cancel
          </button>
          <button className="btn btn-submit" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // Templates table
  return (
    <div className="lp-card">
      <p className="lp-card-title">Templates</p>
      <table className="va-table">
        <thead>
          <tr>
            <th>Lesson Plan</th>
            <th>Date Created</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.title}</td>
              <td>{plan.dateCreated}</td>
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
                    onClick={() => openEdit(plan, "activity")}
                  >
                    Modify Learning Activity
                  </button>
                  <button
                    className="lp-edit-btn objective"
                    onClick={() => openEdit(plan, "objective")}
                  >
                    Modify Learning Objective
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Delete Tab ─────────────────────────────────────────────────────────────────
function DeleteTab() {
  const [plans, setPlans] = useState(MOCK_LESSON_PLANS);
  const [toDelete, setToDelete] = useState(null);

  const confirmDelete = () => {
    setPlans((prev) => prev.filter((p) => p.id !== toDelete));
    setToDelete(null);
  };

  return (
    <div className="lp-card">
      <p className="lp-card-title">Templates</p>
      {plans.length === 0 ? (
        <p className="lp-empty">No lesson plans to delete.</p>
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Lesson Plan</th>
              <th>Date Created</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.title}</td>
                <td>{plan.dateCreated}</td>
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
                    onClick={() => setToDelete(plan.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Confirm modal */}
      {toDelete && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <p className="va-modal-title">Delete Lesson Plan?</p>
            <p className="va-modal-body">
              Are you sure you want to permanently delete this lesson plan?
            </p>
            <div className="va-modal-actions">
              <button className="btn lp-modal-yes" onClick={confirmDelete}>
                YES
              </button>
              <button
                className="btn btn-back"
                onClick={() => setToDelete(null)}
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
