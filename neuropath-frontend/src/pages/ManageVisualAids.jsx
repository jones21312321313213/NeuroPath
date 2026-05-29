import { useState, useEffect, useCallback } from "react";
import "../styles/ManageVisualAids.css";
import { visualAidsAPI, studentsAPI, iepAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

const TABS = [
  { key: "generate", label: "Generate", icon: "🖼" },
  { key: "view", label: "View", icon: "◎" },
  { key: "delete", label: "Delete", icon: "⊘" },
];

const SKILL_CATEGORIES = [
  { label: "Mathematical Skills", icon: "🔢" },
  { label: "Functional Academic Skills", icon: "📖" },
  { label: "Communication Skills", icon: "💬" },
  { label: "Social / Interpersonal Skills", icon: "🤝" },
  { label: "Behavioral Skills", icon: "🧠" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Loading({ text = "Loading…" }) {
  return (
    <div className="va-loading-wrap">
      <div className="va-loading-dots">
        <div className="va-loading-dot" />
        <div className="va-loading-dot" />
        <div className="va-loading-dot" />
      </div>
      <span className="va-loading-text">{text}</span>
    </div>
  );
}

function EmptyState({ icon = "📭", message = "No records found." }) {
  return (
    <div className="va-empty-state">
      <span className="va-empty-icon">{icon}</span>
      <p className="va-empty-text">{message}</p>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="va-error-banner">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="va-breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span className="va-breadcrumb-sep">›</span>}
          {item.onClick ? (
            <button className="va-breadcrumb-link" onClick={item.onClick}>
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

// ── Student Selector ──────────────────────────────────────────────────────────
function StudentSelector({ students, selectedStudent, onSelect }) {
  return (
    <div className="va-student-grid">
      {students.map((s) => {
        const isSelected = selectedStudent?.studentID === s.studentID;
        return (
          <div
            key={s.studentID}
            className={`va-student-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="va-avatar">{getInitials(s.name)}</div>
            <div className="va-student-meta">
              <div className="va-student-name">{s.name}</div>
              <span className="va-student-tag">
                {s.grade ? `Grade ${s.grade}` : "Student"}
              </span>
            </div>
            <div className="va-student-check">{isSelected && "✓"}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Aid Row List ──────────────────────────────────────────────────────────────
function AidRowList({
  aids,
  actionLabel,
  onAction,
  actionClass = "va-btn va-btn-primary",
  showDownload = false,
}) {
  return (
    <div className="va-aids-list">
      {aids.map((aid) => (
        <div key={aid.visualAidID} className="va-aid-row">
          {aid.imageUrl && (
            <div className="va-aid-row-thumb">
              <img
                src={aid.imageUrl}
                alt={aid.title}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}
          <div className="va-aid-row-info">
            <p className="va-aid-row-title">{aid.title}</p>
            <p className="va-aid-row-meta">
              👤 {aid.studentName} &nbsp;·&nbsp; 🗓{" "}
              {new Date(aid.dateCreated).toLocaleDateString()}
            </p>
          </div>
          <div className="va-aid-row-actions">
            <button className={actionClass} onClick={() => onAction(aid)}>
              {actionLabel}
            </button>
            {showDownload && aid.imageUrl && (
              <a
                href={visualAidsAPI.exportUrl(aid.visualAidID)}
                target="_blank"
                rel="noreferrer"
                className="va-btn va-btn-ghost"
                style={{ textDecoration: "none", fontSize: 12 }}
              >
                ⬇ PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab() {
  const { user } = useAuth();

  // Step 1
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Step 2 — IEP Goals for selected student
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [extraPrompt, setExtraPrompt] = useState("");

  // Step 3 — Category
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Result
  const [result, setResult] = useState(null); // saved VisualAid record from DB
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load students on mount
  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  // Load IEP goals when student is selected
  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingGoals(true);
    setGoals([]);
    setSelectedGoal(null);
    iepAPI
      .listGoalsByStudent(selectedStudent.studentID)
      .then(setGoals)
      .catch(() => setError("Failed to load IEP goals for this student."))
      .finally(() => setLoadingGoals(false));
  }, [selectedStudent]);

  const handleStudentSelect = (s) => {
    setSelectedStudent(s);
    setSelectedGoal(null);
    setExtraPrompt("");
    setSelectedCategory(null);
    setResult(null);
    setError("");
  };

  const handleGenerate = async () => {
    if (!selectedGoal || !selectedCategory) return;
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const data = await visualAidsAPI.generate({
        iep_goal_id: selectedGoal.goalID,
        prompt: extraPrompt.trim(),
        category: selectedCategory,
      });
      setResult(data.data);
    } catch (err) {
      setError(
        err.message ||
          "Generation failed. Please check the backend is running.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setGoals([]);
    setSelectedGoal(null);
    setExtraPrompt("");
    setSelectedCategory(null);
    setResult(null);
    setGenerating(false);
    setError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* ── Step 1 — Pick Student ── */}
      <div className="va-card">
        <div className="va-step-badge">
          <span className="va-step-num">1</span>Choose a Student
          {selectedStudent && (
            <span className="va-step-done-chip">✓ {selectedStudent.name}</span>
          )}
        </div>
        {loadingStudents ? (
          <Loading text="Fetching students…" />
        ) : students.length === 0 ? (
          <EmptyState
            icon="🏫"
            message="No students found. Add a student profile first."
          />
        ) : (
          <StudentSelector
            students={students}
            selectedStudent={selectedStudent}
            onSelect={handleStudentSelect}
          />
        )}
      </div>

      {/* ── Step 2 — Pick IEP Goal + optional extra prompt ── */}
      {selectedStudent && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">2</span>IEP Goal &amp; Prompt
            {selectedGoal && (
              <span className="va-step-done-chip">✓ Goal selected</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "#5a7491", marginBottom: 14 }}>
            Select an existing IEP goal for{" "}
            <strong style={{ color: "#1a2b40" }}>{selectedStudent.name}</strong>
            , then optionally describe what you'd like the visual to show.
          </p>

          {loadingGoals ? (
            <Loading text="Loading IEP goals…" />
          ) : goals.length === 0 ? (
            <EmptyState
              icon="📋"
              message="No IEP goals found for this student. Generate an IEP first."
            />
          ) : (
            <div className="va-form-group">
              <label className="va-form-label">Select IEP Goal</label>
              <div className="va-goal-list">
                {goals.map((g) => {
                  const isSelected = selectedGoal?.goalID === g.goalID;
                  return (
                    <div
                      key={g.goalID}
                      className={`va-goal-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedGoal(g);
                        setResult(null);
                      }}
                    >
                      <div className="va-goal-radio">
                        {isSelected ? "●" : "○"}
                      </div>
                      <div className="va-goal-text">
                        <span className="va-goal-category">
                          {g.subject_category || "General"}
                        </span>
                        <span className="va-goal-annual">
                          {g.annual_goal || "No goal text"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="va-form-group" style={{ marginTop: 14 }}>
            <label className="va-form-label">
              Additional Prompt{" "}
              <span style={{ fontWeight: 400, color: "#8a9ab5" }}>
                (optional)
              </span>
            </label>
            <textarea
              className="va-form-textarea"
              placeholder="e.g. Show a child raising their hand in class, simple cartoon style…"
              value={extraPrompt}
              onChange={(e) => {
                setExtraPrompt(e.target.value);
                setResult(null);
              }}
              style={{ minHeight: 72 }}
            />
          </div>
        </div>
      )}

      {/* ── Step 3 — Pick Category ── */}
      {selectedStudent && selectedGoal && !result && !generating && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">3</span>Skill Category
          </div>
          <p style={{ fontSize: 13, color: "#5a7491", marginBottom: 14 }}>
            Choose the skill area this visual aid targets.
          </p>
          <div className="va-skill-grid">
            {SKILL_CATEGORIES.map(({ label, icon }) => {
              const checked = selectedCategory === label;
              return (
                <label
                  key={label}
                  className={`va-skill-label ${checked ? "checked" : ""}`}
                  onClick={() => setSelectedCategory(label)}
                  style={{ cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    name="skill_category"
                    className="va-skill-checkbox"
                    checked={checked}
                    onChange={() => setSelectedCategory(label)}
                  />
                  <span className="va-skill-icon">{icon}</span>
                  <span>{label}</span>
                </label>
              );
            })}
          </div>

          <div className="va-actions" style={{ marginTop: 16 }}>
            <button className="va-btn va-btn-ghost" onClick={handleReset}>
              ↩ Reset
            </button>
            <button
              className="va-generate-btn"
              onClick={handleGenerate}
              disabled={!selectedCategory}
              style={{ maxWidth: 260, opacity: selectedCategory ? 1 : 0.5 }}
            >
              <span>🖼️</span>
              Generate Visual Aid
            </button>
          </div>
        </div>
      )}

      {/* ── Generating spinner ── */}
      {generating && (
        <div className="va-card">
          <div className="va-ai-generating">
            <div className="va-ai-orb">🎨</div>
            <p className="va-ai-label">Generating Visual Aid…</p>
            <p className="va-ai-sub">
              The AI is crafting your image — this usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}

      {/* ── Step 4 — Result (saved to DB) ── */}
      {result && !generating && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">4</span>Generated &amp; Saved ✓
          </div>

          <div className="va-detail-hero">
            <h2 className="va-detail-title">{result.title}</h2>
            <div className="va-detail-meta">
              <div className="va-meta-chip">
                <span>👤</span>
                {result.studentName}
              </div>
              <div className="va-meta-chip">
                <span>🎯</span>
                {selectedCategory}
              </div>
              <div className="va-meta-chip">
                <span>💾</span>Saved to database (ID #{result.visualAidID})
              </div>
            </div>
          </div>

          <div className="va-output-box">
            <div className="va-output-label">
              AI-Generated Visual Aid
              <div className="va-output-label-line" />
            </div>
            <div className="va-preview-wrap">
              <img
                src={result.imageUrl}
                alt="AI-generated visual aid"
                className="va-preview-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div
                className="va-preview-placeholder"
                style={{ display: "none" }}
              >
                <span className="va-preview-placeholder-icon">⚠️</span>
                <span className="va-preview-placeholder-text">
                  Image preview unavailable, but it has been saved to the
                  database.
                </span>
              </div>
            </div>
          </div>

          <div className="va-actions space-between" style={{ marginTop: 20 }}>
            <button className="va-btn va-btn-ghost" onClick={handleReset}>
              🔄 Generate Another
            </button>
            <a
              href={result.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="va-btn va-btn-primary"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ↗ Open Image
            </a>
            <button className="va-btn va-btn-primary" onClick={handleReset}>
              ✓ Done
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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  const fetchAids = useCallback((studentID) => {
    if (!studentID) {
      setAids([]);
      return;
    }

    setLoading(true);
    setError("");
    visualAidsAPI
      .listByStudent(studentID)
      .then(setAids)
      .catch(() => setError("Failed to load visual aids for this student."))
      .finally(() => setLoading(false));
  }, []);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setAids([]);
    fetchAids(student.studentID);
  };

  return (
    <div className="va-card">
      <div className="va-card-header">
        <div className="va-card-icon">🖼️</div>
        <div>
          <p className="va-card-title">Saved Visual Aids</p>
          <p className="va-card-subtitle">
            Select a student to view only their generated visual aids
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="va-step-badge" style={{ marginBottom: 14 }}>
        <span className="va-step-num">1</span>Choose a Student
        {selectedStudent && (
          <span className="va-step-done-chip">✓ {selectedStudent.name}</span>
        )}
      </div>

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon="🏫"
          message="No students found. Add a student profile first."
        />
      ) : (
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={handleStudentSelect}
        />
      )}

      {selectedStudent && (
        <div style={{ marginTop: 22 }}>
          <div className="va-step-badge" style={{ marginBottom: 14 }}>
            <span className="va-step-num">2</span>{selectedStudent.name}'s Visual Aids
          </div>

          {loading ? (
            <Loading text="Loading visual aids…" />
          ) : aids.length === 0 ? (
            <EmptyState
              icon="🖼️"
              message="No visual aids saved for this student yet. Generate one first."
            />
          ) : (
            <AidRowList
              aids={aids}
              actionLabel="↗ View"
              onAction={(aid) => window.open(aid.imageUrl, "_blank")}
              actionClass="va-btn va-btn-primary"
              showDownload={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
function DeleteTab() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const item = aids.find((a) => a.visualAidID === toDelete);

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  const fetchAids = useCallback((studentID) => {
    if (!studentID) {
      setAids([]);
      return;
    }

    setLoading(true);
    setError("");
    visualAidsAPI
      .listByStudent(studentID)
      .then(setAids)
      .catch(() => setError("Failed to load visual aids for this student."))
      .finally(() => setLoading(false));
  }, []);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setToDelete(null);
    setAids([]);
    fetchAids(student.studentID);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await visualAidsAPI.delete(toDelete);
      setAids((prev) => prev.filter((a) => a.visualAidID !== toDelete));
      setToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="va-card">
      <div className="va-card-header">
        <div className="va-card-icon">🗑️</div>
        <div>
          <p className="va-card-title">Delete Visual Aids</p>
          <p className="va-card-subtitle">
            Select a student, then remove only that student's saved visual aids
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="va-step-badge" style={{ marginBottom: 14 }}>
        <span className="va-step-num">1</span>Choose a Student
        {selectedStudent && (
          <span className="va-step-done-chip">✓ {selectedStudent.name}</span>
        )}
      </div>

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon="🏫"
          message="No students found. Add a student profile first."
        />
      ) : (
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={handleStudentSelect}
        />
      )}

      {selectedStudent && (
        <div style={{ marginTop: 22 }}>
          <div className="va-step-badge" style={{ marginBottom: 14 }}>
            <span className="va-step-num">2</span>{selectedStudent.name}'s Visual Aids
          </div>

          {loading ? (
            <Loading text="Loading visual aids…" />
          ) : aids.length === 0 ? (
            <EmptyState icon="📭" message="No visual aids saved for this student." />
          ) : (
            <AidRowList
              aids={aids}
              actionLabel="Delete"
              onAction={(aid) => setToDelete(aid.visualAidID)}
              actionClass="va-btn va-btn-danger"
            />
          )}
        </div>
      )}

      {toDelete && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <div className="va-modal-icon">🗑️</div>
            <p className="va-modal-title">Delete Visual Aid?</p>
            <p className="va-modal-body">
              You're about to permanently delete{" "}
              <strong>"{item?.title}"</strong>. This action cannot be undone.
            </p>
            <div className="va-modal-actions">
              <button
                className="va-btn va-btn-ghost"
                onClick={() => setToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="va-btn va-btn-danger-solid"
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
export default function ManageVisualAids() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="page-content va-page">
      {/* Hero + tabs */}
      <div className="va-page-hero">
        <div className="va-hero-top">
          <div>
            <div className="va-hero-eyebrow">
              <div className="va-hero-eyebrow-dot" />
              NeuroPath · AI-Powered Tools
            </div>
            <h1 className="va-hero-title">Manage Visual Aids</h1>
            <p className="va-hero-subtitle">
              Generate, review, and manage AI-crafted visual aids for each
              student
            </p>
          </div>
        </div>

        <div className="va-tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`va-tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="va-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="va-body">
        {activeTab === "generate" && <GenerateTab />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
