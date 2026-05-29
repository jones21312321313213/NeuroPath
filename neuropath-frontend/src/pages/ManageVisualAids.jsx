import { useState, useEffect, useCallback } from "react";
import "../styles/ManageVisualAids.css";
import { visualAidsAPI, studentsAPI } from "../api/client";
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
}) {
  return (
    <div className="va-aids-list">
      {aids.map((aid) => (
        <div key={aid.visualAidID} className="va-aid-row">
          <div className="va-aid-row-icon">🖼️</div>
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
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [goalText, setGoalText] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  const toggleSkill = (skill) =>
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );

  const handleGenerate = async () => {
    if (!selectedStudent || !goalText) return;
    setLoading(true);
    setError("");
    try {
      const data = await visualAidsAPI.generate({
        studentID: selectedStudent.studentID,
        goalText,
        skillCategories: selectedSkills,
      });
      setGenerated(data);
    } catch (err) {
      setError(err.message || "Generation failed. Is the AI pipeline running?");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setGoalText("");
    setSelectedSkills([]);
    setGenerated(null);
    setError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* Step 1 — Pick student */}
      <div className="va-card">
        <div className="va-step-badge">
          <span className="va-step-num">1</span>Choose a Student
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
            onSelect={(s) => {
              setSelectedStudent(s);
              setGenerated(null);
              setError("");
            }}
          />
        )}
      </div>

      {/* Step 2 — Visual aid details */}
      {selectedStudent && !generated && !loading && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">2</span>Visual Aid Details
          </div>
          <p style={{ fontSize: 13, color: "#5a7491", marginBottom: 18 }}>
            Creating a visual aid for{" "}
            <strong style={{ color: "#1a2b40" }}>{selectedStudent.name}</strong>
          </p>

          <div className="va-form-group">
            <label className="va-form-label">IEP Goal / Topic</label>
            <textarea
              className="va-form-textarea"
              placeholder="Describe the IEP goal this visual aid should support…"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
            />
          </div>

          <div className="va-form-group">
            <label className="va-form-label">Skill Categories</label>
            <div className="va-skill-grid">
              {SKILL_CATEGORIES.map(({ label, icon }) => {
                const checked = selectedSkills.includes(label);
                return (
                  <label
                    key={label}
                    className={`va-skill-label ${checked ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="va-skill-checkbox"
                      checked={checked}
                      onChange={() => toggleSkill(label)}
                    />
                    <span className="va-skill-icon">{icon}</span>
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="va-actions" style={{ marginTop: 8 }}>
            <button className="va-btn va-btn-ghost" onClick={handleReset}>
              ↩ Reset
            </button>
            <button
              className="va-generate-btn"
              onClick={handleGenerate}
              disabled={!goalText}
              style={{ maxWidth: 240 }}
            >
              <span>🖼️</span>
              Generate Visual Aid
            </button>
          </div>
        </div>
      )}

      {/* AI loading */}
      {loading && (
        <div className="va-card">
          <div className="va-ai-generating">
            <div className="va-ai-orb">🎨</div>
            <p className="va-ai-label">Generating Visual Aid…</p>
            <p className="va-ai-sub">
              Crafting a personalised visual aid based on the IEP goal
            </p>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {generated && !loading && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">3</span>Review Result
          </div>

          <div className="va-detail-hero">
            <h2 className="va-detail-title">
              {generated.data?.title || "AI-Generated Visual Aid"}
            </h2>
            <div className="va-detail-meta">
              <div className="va-meta-chip">
                <span>👤</span>
                {selectedStudent?.name}
              </div>
              <div className="va-meta-chip">
                <span>📋</span>
                {goalText.slice(0, 52)}
                {goalText.length > 52 ? "…" : ""}
              </div>
            </div>
          </div>

          <div className="va-output-box">
            <div className="va-output-label">
              AI Visual Aid Output
              <div className="va-output-label-line" />
            </div>
            <div className="va-preview-wrap">
              {generated.data?.imageUrl ? (
                <img
                  src={generated.data.imageUrl}
                  alt="Generated visual aid"
                  className="va-preview-img"
                />
              ) : (
                <div className="va-preview-placeholder">
                  <span className="va-preview-placeholder-icon">🖼️</span>
                  <span className="va-preview-placeholder-text">
                    Visual aid preview will appear here
                  </span>
                </div>
              )}
              {generated.data?.title && (
                <p className="va-preview-title">{generated.data.title}</p>
              )}
              {generated.message && (
                <p className="va-preview-sub">{generated.message}</p>
              )}
            </div>
          </div>

          <div className="va-actions space-between" style={{ marginTop: 20 }}>
            <button className="va-btn va-btn-ghost" onClick={handleReset}>
              🔄 Generate Another
            </button>
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
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAids = useCallback(() => {
    setLoading(true);
    visualAidsAPI
      .list()
      .then(setAids)
      .catch(() => setError("Failed to load visual aids."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAids();
  }, [fetchAids]);

  return (
    <div className="va-card">
      <div className="va-card-header">
        <div className="va-card-icon">🖼️</div>
        <div>
          <p className="va-card-title">Saved Visual Aids</p>
          <p className="va-card-subtitle">Browse all generated visual aids</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <Loading text="Loading visual aids…" />
      ) : aids.length === 0 ? (
        <EmptyState
          icon="🖼️"
          message="No visual aids saved yet. Generate one first."
        />
      ) : (
        <AidRowList
          aids={aids}
          actionLabel="↗ View"
          onAction={(aid) =>
            window.open(visualAidsAPI.exportUrl(aid.visualAidID), "_blank")
          }
          actionClass="va-btn va-btn-primary"
        />
      )}
    </div>
  );
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
function DeleteTab() {
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const item = aids.find((a) => a.visualAidID === toDelete);

  const fetchAids = useCallback(() => {
    setLoading(true);
    visualAidsAPI
      .list()
      .then(setAids)
      .catch(() => setError("Failed to load visual aids."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAids();
  }, [fetchAids]);

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
            Permanently remove saved visual aids
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loading ? (
        <Loading text="Loading visual aids…" />
      ) : aids.length === 0 ? (
        <EmptyState icon="📭" message="No visual aids to delete." />
      ) : (
        <AidRowList
          aids={aids}
          actionLabel="Delete"
          onAction={(aid) => setToDelete(aid.visualAidID)}
          actionClass="va-btn va-btn-danger"
        />
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
