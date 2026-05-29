import { useState, useEffect, useCallback } from "react";
import "../styles/ManageLessonPlans.css";
import { lessonPlansAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

const TABS = [
  { key: "generate", label: "Generate", icon: "✦" },
  { key: "view", label: "View", icon: "◎" },
  { key: "edit", label: "Edit", icon: "✏" },
  { key: "delete", label: "Delete", icon: "⊘" },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function Loading({ text = "Loading…" }) {
  return (
    <div className="ts-loading-wrap">
      <div className="ts-loading-dots">
        <div className="ts-loading-dot" />
        <div className="ts-loading-dot" />
        <div className="ts-loading-dot" />
      </div>
      <span className="ts-loading-text">{text}</span>
    </div>
  );
}

function EmptyState({ icon = "📭", message = "No records found." }) {
  return (
    <div className="ts-empty">
      <span className="ts-empty-icon">{icon}</span>
      <p className="ts-empty-text">{message}</p>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="ts-error-banner">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="ts-breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span className="ts-breadcrumb-sep">›</span>}
          {item.onClick ? (
            <button className="ts-breadcrumb-link" onClick={item.onClick}>
              {i === 0 && "← "}
              {item.label}
            </button>
          ) : (
            <span style={{ color: "#1a2b40", fontWeight: 600 }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Status badge
function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        background: isActive ? "#dcfce7" : "#fef9c3",
        color: isActive ? "#16a34a" : "#92400e",
      }}
    >
      {status}
    </span>
  );
}

// Plan row list (shared between View / Edit / Delete tabs)
function PlanRowList({
  plans,
  actionLabel,
  onAction,
  actionClass = "ts-btn ts-btn-primary",
}) {
  return (
    <div className="ts-strategies-list">
      {plans.map((plan) => (
        <div key={plan.lessonID} className="ts-strategy-row">
          <div className="ts-strategy-row-icon">📋</div>
          <div className="ts-strategy-row-info">
            <p className="ts-strategy-row-title">{plan.title}</p>
            <p className="ts-strategy-row-date">
              👤 {plan.studentName}
              {plan.dateCreated && (
                <>
                  {" "}
                  &nbsp;·&nbsp; 🗓{" "}
                  {new Date(plan.dateCreated).toLocaleDateString()}
                </>
              )}
              {plan.status && (
                <>
                  {" "}
                  &nbsp;·&nbsp; <StatusBadge status={plan.status} />
                </>
              )}
            </p>
          </div>
          <div className="ts-strategy-row-actions">
            <button className={actionClass} onClick={() => onAction(plan)}>
              {actionLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Student grid (shared selector)
function StudentGrid({ students, selectedID, onSelect }) {
  return (
    <div className="ts-student-grid">
      {students.map((s) => {
        const isSelected = selectedID === s.studentID;
        return (
          <div
            key={s.studentID}
            className={`ts-student-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="ts-avatar">
              {getInitials(s.studentName || s.name)}
            </div>
            <div className="ts-student-meta">
              <div className="ts-student-name">{s.studentName || s.name}</div>
              {s.grade && (
                <span className="ts-student-tag">Grade {s.grade}</span>
              )}
              {!s.grade && <span className="ts-student-tag">Student</span>}
            </div>
            <div className="ts-student-check">{isSelected && "✓"}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ onSave }) {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    lessonPlansAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and IEP goals."))
      .finally(() => setLoadingDir(false));
  }, []);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setGenerated(null);
    setError("");
    setSaved(false);
  };

  const handleGenerate = async () => {
    if (!selectedStudent || selectedStudent.availableGoals.length === 0) return;
    const goal = selectedStudent.availableGoals[0];
    setLoading(true);
    setError("");
    try {
      const data = await lessonPlansAPI.generate({
        goalID: goal.goalID,
        subject: goal.goalArea,
        topic: goal.goalArea,
      });
      setGenerated(data);
    } catch (err) {
      setError(err.message || "Generation failed. Is the AI pipeline running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!generated) return;
    onSave(generated.data);
    setSaved(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* Step 1 — Pick student */}
      <div className="ts-card">
        <div className="ts-step-badge">
          <span className="ts-step-num">1</span>Choose a Student
        </div>
        {loadingDir ? (
          <Loading text="Fetching students…" />
        ) : directory.length === 0 ? (
          <EmptyState
            icon="🏫"
            message="No students found. Add a student profile first."
          />
        ) : (
          <StudentGrid
            students={directory}
            selectedID={selectedStudent?.studentID}
            onSelect={selectStudent}
          />
        )}
      </div>

      {/* Step 2 — IEP Goal Area */}
      {selectedStudent && !generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">2</span>IEP Goal Area
          </div>
          <p style={{ fontSize: 13, color: "#5a7491", marginBottom: 14 }}>
            Lesson plan will be generated for{" "}
            <strong style={{ color: "#1a2b40" }}>
              {selectedStudent.studentName}
            </strong>
          </p>
          {selectedStudent.availableGoals.length === 0 ? (
            <EmptyState
              icon="🎯"
              message="No IEP goals found for this student. Generate an IEP first."
            />
          ) : (
            <>
              <div className="lp-goal-area-display">
                <span className="lp-goal-area-label">Goal Area</span>
                <span className="lp-goal-area-value">
                  {selectedStudent.availableGoals[0].goalArea}
                </span>
                <span className="lp-goal-area-note">
                  Automatically retrieved from the student's IEP (Section C)
                </span>
              </div>
              <div className="ts-actions" style={{ marginTop: 22 }}>
                <button
                  className="ts-generate-btn"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  <span className="ts-btn-icon">✦</span>
                  Generate Lesson Plan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading / AI generation */}
      {loading && (
        <div className="ts-card">
          <div className="ts-ai-generating">
            <div className="ts-ai-orb">🧠</div>
            <p className="ts-ai-label">Invoking Llama AI Pipeline…</p>
            <p className="ts-ai-sub">
              Crafting a personalised lesson plan based on the IEP goal area
            </p>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">3</span>Review & Save
          </div>

          <div className="ts-detail-hero">
            <h2 className="ts-detail-title">
              {generated.data?.title || "AI-Generated Lesson Plan"}
            </h2>
            <div className="ts-detail-meta">
              <div className="ts-meta-chip">
                <span className="ts-meta-chip-icon">👤</span>
                {selectedStudent?.studentName}
              </div>
              <div className="ts-meta-chip">
                <span className="ts-meta-chip-icon">🎯</span>
                {selectedStudent?.availableGoals[0]?.goalArea}
              </div>
            </div>
          </div>

          {generated.data?.draft_content && (
            <div className="ts-output-box">
              <div className="ts-output-label">
                AI Lesson Plan Output
                <div className="ts-output-label-line" />
              </div>
              <div className="ts-strategy-body">
                {generated.data.draft_content.introduction && (
                  <>
                    <p className="ts-strategy-heading">Introduction</p>
                    <p className="ts-strategy-para">
                      {generated.data.draft_content.introduction}
                    </p>
                  </>
                )}
                {generated.data.draft_content.core_activity && (
                  <>
                    <p className="ts-strategy-heading">Core Activity</p>
                    <p className="ts-strategy-para">
                      {generated.data.draft_content.core_activity}
                    </p>
                  </>
                )}
                {generated.data.draft_content.assessment && (
                  <>
                    <p className="ts-strategy-heading">Assessment</p>
                    <p className="ts-strategy-para">
                      {generated.data.draft_content.assessment}
                    </p>
                  </>
                )}
                {generated.data.draft_content.materials_needed?.length > 0 && (
                  <>
                    <p className="ts-strategy-heading">Materials Needed</p>
                    <ul className="ts-strategy-list">
                      {generated.data.draft_content.materials_needed.map(
                        (m, i) => (
                          <li key={i} className="ts-strategy-li">
                            {m}
                          </li>
                        ),
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}

          {generated.message && (
            <div className="ts-success-msg">✅ {generated.message}</div>
          )}
          {saved && (
            <div className="ts-success-msg" style={{ marginTop: 8 }}>
              💾 Lesson plan saved successfully to student profile.
            </div>
          )}

          <div className="ts-actions" style={{ marginTop: 20 }}>
            <button
              className="ts-btn ts-btn-secondary"
              onClick={handleGenerate}
              disabled={loading}
            >
              🔄 Regenerate
            </button>
            <button
              className="ts-btn ts-btn-primary"
              onClick={handleSave}
              disabled={loading || saved}
            >
              💾 Confirm & Save Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Tab ──────────────────────────────────────────────────────────────────
function ViewTab() {
  const { user } = useAuth();
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
      .list(user?.id)
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
    const matchName = (s.name || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // Detail view
  if (viewingPlan) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Plans", onClick: () => setViewingPlan(null) },
            { label: viewingPlan.title },
          ]}
        />
        <div className="ts-detail-hero">
          <h2 className="ts-detail-title">{viewingPlan.title}</h2>
          <div className="ts-detail-meta">
            <div className="ts-meta-chip">
              <span className="ts-meta-chip-icon">👤</span>
              {viewingPlan.studentName}
            </div>
            <div className="ts-meta-chip">
              <span className="ts-meta-chip-icon">🗓</span>
              {new Date(viewingPlan.dateCreated).toLocaleDateString()}
            </div>
            <div className="ts-meta-chip">
              <span className="ts-meta-chip-icon">📌</span>
              <StatusBadge status={viewingPlan.status} />
            </div>
          </div>
        </div>
        <div className="ts-actions space-between" style={{ marginTop: 20 }}>
          <button
            className="ts-btn ts-btn-ghost"
            onClick={() => setViewingPlan(null)}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Plan list for student
  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Students",
              onClick: () => {
                setSelectedStudent(null);
                setPlans([]);
              },
            },
            { label: selectedStudent.name },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">📚</div>
          <div>
            <p className="ts-card-title">Lesson Plans</p>
            <p className="ts-card-subtitle">For {selectedStudent.name}</p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {loadingPlans ? (
          <Loading text="Loading lesson plans…" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon="📭"
            message="No lesson plans found for this student."
          />
        ) : (
          <PlanRowList
            plans={plans}
            actionLabel="View"
            onAction={(p) => setViewingPlan(p)}
            actionClass="ts-btn ts-btn-primary"
          />
        )}
      </div>
    );
  }

  // Student selection with search/filter
  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">📚</div>
        <div>
          <p className="ts-card-title">View Lesson Plans</p>
          <p className="ts-card-subtitle">
            Select a student to view their lesson plans
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />

      {/* Search & Filter */}
      <div className="lp-search-bar" style={{ marginBottom: 16 }}>
        <input
          className="ts-form-input"
          style={{ flex: 1, minWidth: 180 }}
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#5a7491" }}>
            Filter
          </span>
          <select
            className="ts-form-input"
            style={{ width: "auto", minWidth: 100, padding: "10px 12px" }}
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
            className="ts-form-input"
            style={{ width: "auto", minWidth: 80, padding: "10px 12px" }}
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

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon="🏫" message="No students found." />
      ) : (
        <StudentGrid
          students={filteredStudents}
          selectedID={null}
          onSelect={handleSelectStudent}
        />
      )}
    </div>
  );
}

// ── Edit Tab ──────────────────────────────────────────────────────────────────
function EditTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [formValue, setFormValue] = useState({ title: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);
    setError("");
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
      setSuccess(true);
      setTimeout(() => {
        setEditingPlan(null);
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit form
  if (editingPlan) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Plans",
              onClick: () => {
                setEditingPlan(null);
              },
            },
            { label: "Edit Plan" },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">✏️</div>
          <div>
            <p className="ts-card-title">Edit Lesson Plan</p>
            <p className="ts-card-subtitle">Make changes and save</p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {success && (
          <div className="ts-success-msg">
            ✅ Lesson plan saved successfully!
          </div>
        )}

        <div className="ts-form-group">
          <label className="ts-form-label">Plan Title</label>
          <input
            className="ts-form-input"
            value={formValue.title}
            onChange={(e) =>
              setFormValue({ ...formValue, title: e.target.value })
            }
          />
        </div>
        <div className="ts-form-group">
          <label className="ts-form-label">Status</label>
          <select
            className="ts-form-input"
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

        <div className="ts-actions space-between" style={{ marginTop: 8 }}>
          <button
            className="ts-btn ts-btn-ghost"
            onClick={() => setEditingPlan(null)}
          >
            ← Back
          </button>
          <button
            className="ts-btn ts-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">✏️</div>
        <div>
          <p className="ts-card-title">Edit Lesson Plans</p>
          <p className="ts-card-subtitle">Select a plan to edit</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <Loading text="Loading lesson plans…" />
      ) : plans.length === 0 ? (
        <EmptyState icon="📭" message="No lesson plans found." />
      ) : (
        <PlanRowList
          plans={plans}
          actionLabel="Edit"
          onAction={openEdit}
          actionClass="ts-btn ts-btn-secondary"
        />
      )}
    </div>
  );
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
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

  const itemToDelete = plans.find((p) => p.lessonID === toDelete);

  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">🗑️</div>
        <div>
          <p className="ts-card-title">Delete Lesson Plans</p>
          <p className="ts-card-subtitle">Permanently remove a lesson plan</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <Loading text="Loading lesson plans…" />
      ) : plans.length === 0 ? (
        <EmptyState icon="📭" message="No lesson plans to delete." />
      ) : (
        <PlanRowList
          plans={plans}
          actionLabel="Delete"
          onAction={(p) => setToDelete(p.lessonID)}
          actionClass="ts-btn ts-btn-danger"
        />
      )}

      {toDelete && (
        <div className="ts-modal-overlay">
          <div className="ts-modal">
            <div className="ts-modal-icon">🗑️</div>
            <p className="ts-modal-title">Delete Lesson Plan?</p>
            <p className="ts-modal-body">
              You're about to permanently delete{" "}
              <strong>"{itemToDelete?.title}"</strong>. This action cannot be
              undone.
            </p>
            <div className="ts-modal-actions">
              <button
                className="ts-btn ts-btn-ghost"
                onClick={() => setToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="ts-btn ts-btn-danger-solid"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageLessonPlans() {
  const [activeTab, setActiveTab] = useState("generate");
  const [lessonPlans, setLessonPlans] = useState([]);

  const saveLessonPlan = (plan) => {
    if (plan) setLessonPlans((prev) => [plan, ...prev]);
  };

  return (
    <div className="page-content ts-page">
      {/* Hero + tabs */}
      <div className="ts-page-hero">
        <div className="ts-hero-top">
          <div>
            <div className="ts-hero-eyebrow">
              <div className="ts-hero-eyebrow-dot" />
              NeuroPath · AI-Powered Tools
            </div>
            <h1 className="ts-hero-title">Manage Lesson Plans</h1>
            <p className="ts-hero-subtitle">
              Generate, review, edit, and manage AI-crafted lesson plans for
              each student
            </p>
          </div>
        </div>

        <div className="ts-tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ts-tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="ts-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="ts-body">
        {activeTab === "generate" && <GenerateTab onSave={saveLessonPlan} />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
