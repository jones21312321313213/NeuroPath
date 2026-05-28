import { useMemo, useState, useEffect } from "react";
import "../styles/ManageTeachingStrategies.css";
import StudentShimmer from "../components/StudentShimmer";
import { teachingStrategiesAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "generate", label: "Generate", icon: "✦" },
  { key: "view", label: "View", icon: "◎" },
  { key: "edit", label: "Edit", icon: "✏" },
  { key: "delete", label: "Delete", icon: "⊘" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Strategy Markdown Renderer ────────────────────────────────────────────────
function StrategyRenderer({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  const nodes = [];
  let bulletBuffer = [];

  const flushBullets = (key) => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${key}`} className="ts-strategy-list">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="ts-strategy-li">
            {renderInline(b)}
          </li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushBullets(idx);
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    const headingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    if (headingMatch) {
      flushBullets(idx);
      nodes.push(
        <p key={idx} className="ts-strategy-heading">
          {headingMatch[1].replace(/:$/, "")}
        </p>,
      );
      return;
    }
    flushBullets(idx);
    nodes.push(
      <p key={idx} className="ts-strategy-para">
        {renderInline(line)}
      </p>,
    );
  });
  flushBullets("end");

  return <div className="ts-strategy-body">{nodes}</div>;
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

// ── Student Selector shared component ────────────────────────────────────────
function StudentSelector({
  directory,
  selectedStudent,
  onSelect,
  title,
  subtitle,
}) {
  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">👨‍🎓</div>
        <div>
          <p className="ts-card-title">{title || "Select a Student"}</p>
          {subtitle && <p className="ts-card-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="ts-student-grid">
        {directory.map((student) => {
          const isSelected = selectedStudent?.studentID === student.studentID;
          return (
            <div
              key={student.studentID}
              className={`ts-student-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(student)}
            >
              <div className="ts-avatar">
                {getInitials(student.studentName)}
              </div>
              <div className="ts-student-meta">
                <div className="ts-student-name">{student.studentName}</div>
                <span className="ts-student-tag">Student</span>
              </div>
              <div className="ts-student-check">{isSelected && "✓"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Strategy Row List ─────────────────────────────────────────────────────────
function StrategyRowList({
  strategies,
  actionLabel,
  onAction,
  actionClass = "ts-btn ts-btn-primary",
}) {
  return (
    <div className="ts-strategies-list">
      {strategies.map((s) => (
        <div key={s.strategyID} className="ts-strategy-row">
          <div className="ts-strategy-row-icon">📄</div>
          <div className="ts-strategy-row-info">
            <p className="ts-strategy-row-title">{s.title}</p>
            <p className="ts-strategy-row-date">🗓 {s.formattedDate}</p>
          </div>
          <div className="ts-strategy-row-actions">
            <button className={actionClass} onClick={() => onAction(s)}>
              {actionLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ onSave }) {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and goals."))
      .finally(() => setLoadingDir(false));
  }, [user?.id]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedGoal(null);
    setGenerated(null);
    setError("");
    setSaved(false);
  };

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedGoal) return;
    setLoading(true);
    setError("");
    setGenerated(null);
    setSaved(false);
    try {
      const data = await teachingStrategiesAPI.generate({
        goalID: selectedGoal.goalID,
      });
      setGenerated(data);
    } catch (err) {
      setError(
        err.message || "AI Generation pipeline failed. Is Ollama running?",
      );
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

      {/* Step 1 */}
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
          <div className="ts-student-grid">
            {directory.map((student) => {
              const isSelected =
                selectedStudent?.studentID === student.studentID;
              return (
                <div
                  key={student.studentID}
                  className={`ts-student-card ${isSelected ? "selected" : ""}`}
                  onClick={() => selectStudent(student)}
                >
                  <div className="ts-avatar">
                    {getInitials(student.studentName)}
                  </div>
                  <div className="ts-student-meta">
                    <div className="ts-student-name">{student.studentName}</div>
                    <span className="ts-student-tag">Student</span>
                  </div>
                  <div className="ts-student-check">{isSelected && "✓"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2 — IEP Goals */}
      {selectedStudent && !generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">2</span>Select an IEP Goal
          </div>
          <p style={{ fontSize: 13, color: "#5a7491", marginBottom: 14 }}>
            Choosing a goal for{" "}
            <strong style={{ color: "#1a2b40" }}>
              {selectedStudent.studentName}
            </strong>
          </p>
          {selectedStudent.availableGoals.length === 0 ? (
            <EmptyState
              icon="🎯"
              message="No IEP goals found for this student."
            />
          ) : (
            <div className="ts-goal-grid">
              {selectedStudent.availableGoals.map((goal) => {
                const isSelected = selectedGoal?.goalID === goal.goalID;
                return (
                  <label
                    key={goal.goalID}
                    className={`ts-goal-item ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedGoal(goal)}
                  >
                    <input
                      type="radio"
                      name="iepGoal"
                      className="ts-goal-radio"
                      checked={isSelected}
                      onChange={() => setSelectedGoal(goal)}
                    />
                    <span className="ts-goal-text">{goal.label}</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="ts-actions" style={{ marginTop: 22 }}>
            <button
              className="ts-generate-btn"
              onClick={handleGenerate}
              disabled={!selectedGoal}
            >
              <span className="ts-btn-icon">✦</span>
              Generate Teaching Strategy
            </button>
          </div>
        </div>
      )}

      {/* Loading / AI generation */}
      {loading && (
        <div className="ts-card">
          <div className="ts-ai-generating">
            <div className="ts-ai-orb">🧠</div>
            <p className="ts-ai-label">Invoking Llama AI Pipeline…</p>
            <p className="ts-ai-sub">
              Crafting a personalised teaching strategy based on the IEP goal
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
              {generated.data?.title || "AI-Generated Teaching Strategy"}
            </h2>
            <div className="ts-detail-meta">
              <div className="ts-meta-chip">
                <span className="ts-meta-chip-icon">👤</span>
                {selectedStudent?.studentName}
              </div>
              <div className="ts-meta-chip">
                <span className="ts-meta-chip-icon">🎯</span>
                {selectedGoal?.label?.slice(0, 48)}
                {selectedGoal?.label?.length > 48 ? "…" : ""}
              </div>
            </div>
          </div>

          <div className="ts-output-box">
            <div className="ts-output-label">
              AI Strategy Output
              <div className="ts-output-label-line" />
            </div>
            <StrategyRenderer content={generated.data?.strategyContent} />
          </div>

          {generated.message && (
            <div className="ts-success-msg">✅ {generated.message}</div>
          )}

          {saved && (
            <div className="ts-success-msg" style={{ marginTop: 8 }}>
              💾 Strategy saved successfully to student profile.
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
              💾 Confirm & Save Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Strategy Detail View ──────────────────────────────────────────────────────
function StrategyDetails({ strategy, onBack }) {
  return (
    <div className="ts-card">
      <Breadcrumb
        items={[
          { label: "All Strategies", onClick: onBack },
          { label: strategy.title },
        ]}
      />

      <div className="ts-detail-hero">
        <h2 className="ts-detail-title">{strategy.title}</h2>
        <div className="ts-detail-meta">
          <div className="ts-meta-chip">
            <span className="ts-meta-chip-icon">👤</span>
            {strategy.studentName}
          </div>
          <div className="ts-meta-chip">
            <span className="ts-meta-chip-icon">🗓</span>
            {strategy.formattedDate}
          </div>
        </div>
      </div>

      <div className="ts-output-box">
        <div className="ts-output-label">
          Strategy Content
          <div className="ts-output-label-line" />
        </div>
        <StrategyRenderer content={strategy.strategyContent} />
      </div>

      <div className="ts-actions space-between" style={{ marginTop: 20 }}>
        <button className="ts-btn ts-btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <a
          href={teachingStrategiesAPI.exportUrl(strategy.strategyID)}
          target="_blank"
          rel="noreferrer"
          className="ts-btn ts-btn-primary"
          style={{ textDecoration: "none" }}
        >
          ↗ Export PDF
        </a>
      </div>
    </div>
  );
}

// ── View Tab ──────────────────────────────────────────────────────────────────
function ViewTab() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loadingStrats, setLoadingStrats] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingDir(false));
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setLoadingStrats(true);
    teachingStrategiesAPI
      .list(s.studentID)
      .then(setStrategies)
      .catch(() => setError("Failed to load strategies."))
      .finally(() => setLoadingStrats(false));
  };

  if (selected)
    return (
      <StrategyDetails strategy={selected} onBack={() => setSelected(null)} />
    );

  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Students",
              onClick: () => {
                setSelectedStudent(null);
                setStrategies([]);
              },
            },
            { label: selectedStudent.studentName },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">📚</div>
          <div>
            <p className="ts-card-title">Teaching Strategies</p>
            <p className="ts-card-subtitle">
              For {selectedStudent.studentName}
            </p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {loadingStrats ? (
          <Loading text="Loading strategies…" />
        ) : strategies.length === 0 ? (
          <EmptyState
            icon="📭"
            message="No teaching strategies found for this student."
          />
        ) : (
          <StrategyRowList
            strategies={strategies}
            actionLabel="View"
            onAction={(s) => setSelected(s)}
            actionClass="ts-btn ts-btn-primary"
          />
        )}
      </div>
    );
  }

  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">📚</div>
        <div>
          <p className="ts-card-title">Saved Teaching Strategies</p>
          <p className="ts-card-subtitle">
            Select a student to view their strategies
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loadingDir ? (
        <Loading text="Fetching students…" />
      ) : directory.length === 0 ? (
        <EmptyState icon="🏫" message="No students found." />
      ) : (
        <div className="ts-student-grid">
          {directory.map((s) => (
            <div
              key={s.studentID}
              className="ts-student-card"
              onClick={() => handleSelectStudent(s)}
            >
              <div className="ts-avatar">{getInitials(s.studentName)}</div>
              <div className="ts-student-meta">
                <div className="ts-student-name">{s.studentName}</div>
                <span className="ts-student-tag">Student</span>
              </div>
              <div className="ts-student-check" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Tab ──────────────────────────────────────────────────────────────────
function EditTab() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loadingStrats, setLoadingStrats] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingDir(false));
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setLoadingStrats(true);
    teachingStrategiesAPI
      .list(s.studentID)
      .then(setStrategies)
      .catch(() => setError("Failed to load strategies."))
      .finally(() => setLoadingStrats(false));
  };

  const openEdit = (strategy) => {
    setSelected(strategy);
    setForm({
      title: strategy.title,
      strategyContent: strategy.strategyContent,
    });
    setSuccess(false);
    setError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setError("");
    try {
      await teachingStrategiesAPI.update(selected.strategyID, form);
      setStrategies((prev) =>
        prev.map((s) =>
          s.strategyID === selected.strategyID ? { ...s, ...form } : s,
        ),
      );
      setSuccess(true);
      setTimeout(() => {
        setSelected(null);
        setForm(null);
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit form
  if (selected && form) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Strategies",
              onClick: () => {
                setSelected(null);
                setForm(null);
              },
            },
            { label: "Edit Strategy" },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">✏️</div>
          <div>
            <p className="ts-card-title">Edit Teaching Strategy</p>
            <p className="ts-card-subtitle">Make changes and save</p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {success && (
          <div className="ts-success-msg">✅ Strategy saved successfully!</div>
        )}

        <div className="ts-form-group">
          <label className="ts-form-label">Strategy Title</label>
          <input
            className="ts-form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="ts-form-group">
          <label className="ts-form-label">Strategy Content</label>
          <textarea
            className="ts-form-textarea"
            value={form.strategyContent}
            onChange={(e) =>
              setForm({ ...form, strategyContent: e.target.value })
            }
          />
        </div>

        <div className="ts-actions space-between" style={{ marginTop: 8 }}>
          <button
            className="ts-btn ts-btn-ghost"
            onClick={() => {
              setSelected(null);
              setForm(null);
            }}
          >
            ← Back
          </button>
          <button
            className="ts-btn ts-btn-primary"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  // Strategy list for student
  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Students",
              onClick: () => {
                setSelectedStudent(null);
                setStrategies([]);
              },
            },
            { label: selectedStudent.studentName },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">✏️</div>
          <div>
            <p className="ts-card-title">Teaching Strategies</p>
            <p className="ts-card-subtitle">
              For {selectedStudent.studentName}
            </p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {loadingStrats ? (
          <Loading text="Loading strategies…" />
        ) : strategies.length === 0 ? (
          <EmptyState
            icon="📭"
            message="No teaching strategies found for this student."
          />
        ) : (
          <StrategyRowList
            strategies={strategies}
            actionLabel="Edit"
            onAction={openEdit}
            actionClass="ts-btn ts-btn-secondary"
          />
        )}
      </div>
    );
  }

  // Student list
  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">✏️</div>
        <div>
          <p className="ts-card-title">Edit Teaching Strategies</p>
          <p className="ts-card-subtitle">
            Select a student to edit their strategies
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loadingDir ? (
        <Loading text="Fetching students…" />
      ) : directory.length === 0 ? (
        <EmptyState icon="🏫" message="No students found." />
      ) : (
        <div className="ts-student-grid">
          {directory.map((s) => (
            <div
              key={s.studentID}
              className="ts-student-card"
              onClick={() => handleSelectStudent(s)}
            >
              <div className="ts-avatar">{getInitials(s.studentName)}</div>
              <div className="ts-student-meta">
                <div className="ts-student-name">{s.studentName}</div>
                <span className="ts-student-tag">Student</span>
              </div>
              <div className="ts-student-check" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
function DeleteTab() {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loadingStrats, setLoadingStrats] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const item = useMemo(
    () => strategies.find((s) => s.strategyID === toDelete),
    [strategies, toDelete],
  );

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingDir(false));
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setLoadingStrats(true);
    teachingStrategiesAPI
      .listForDelete(s.studentID)
      .then(setStrategies)
      .catch(() => setError("Failed to load strategies."))
      .finally(() => setLoadingStrats(false));
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await teachingStrategiesAPI.delete(toDelete);
      setStrategies((prev) => prev.filter((s) => s.strategyID !== toDelete));
      setToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            {
              label: "All Students",
              onClick: () => {
                setSelectedStudent(null);
                setStrategies([]);
              },
            },
            { label: selectedStudent.studentName },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon">🗑️</div>
          <div>
            <p className="ts-card-title">Teaching Strategies</p>
            <p className="ts-card-subtitle">
              For {selectedStudent.studentName}
            </p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {loadingStrats ? (
          <Loading text="Loading strategies…" />
        ) : strategies.length === 0 ? (
          <EmptyState
            icon="📭"
            message="No teaching strategies to delete for this student."
          />
        ) : (
          <StrategyRowList
            strategies={strategies}
            actionLabel="Delete"
            onAction={(s) => setToDelete(s.strategyID)}
            actionClass="ts-btn ts-btn-danger"
          />
        )}

        {toDelete && (
          <div className="ts-modal-overlay">
            <div className="ts-modal">
              <div className="ts-modal-icon">🗑️</div>
              <p className="ts-modal-title">Delete Strategy?</p>
              <p className="ts-modal-body">
                You're about to permanently delete{" "}
                <strong>"{item?.title}"</strong>. This action cannot be undone.
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

  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon">🗑️</div>
        <div>
          <p className="ts-card-title">Delete Teaching Strategies</p>
          <p className="ts-card-subtitle">
            Select a student to manage their strategies
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loadingDir ? (
        <Loading text="Fetching students…" />
      ) : directory.length === 0 ? (
        <EmptyState icon="🏫" message="No students found." />
      ) : (
        <div className="ts-student-grid">
          {directory.map((s) => (
            <div
              key={s.studentID}
              className="ts-student-card"
              onClick={() => handleSelectStudent(s)}
            >
              <div className="ts-avatar">{getInitials(s.studentName)}</div>
              <div className="ts-student-meta">
                <div className="ts-student-name">{s.studentName}</div>
                <span className="ts-student-tag">Student</span>
              </div>
              <div className="ts-student-check" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTeachingStrategies() {
  const [activeTab, setActiveTab] = useState("generate");
  const [strategies, setStrategies] = useState([]);

  const saveStrategy = (strategy) => {
    if (strategy) setStrategies((prev) => [strategy, ...prev]);
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
            <h1 className="ts-hero-title">Manage Teaching Strategies</h1>
            <p className="ts-hero-subtitle">
              Generate, review, edit, and manage AI-crafted strategies for each
              student
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
        {activeTab === "generate" && <GenerateTab onSave={saveStrategy} />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
