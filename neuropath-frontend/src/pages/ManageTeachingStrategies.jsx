import { useMemo, useState, useEffect, useCallback } from "react";
import "../styles/ManageVisualAids.css";
import "../styles/ManageTeachingStrategies.css";
import StudentShimmer from "../components/StudentShimmer";
import { teachingStrategiesAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "generate", label: "Generate Teaching Strategies" },
  { key: "view", label: "View Teaching Strategies" },
  { key: "edit", label: "Edit Teaching Strategies" },
  { key: "delete", label: "Delete Teaching Strategies" },
];

function EmptyState({ message = "No records found." }) {
  return (
    <div className="va-empty">
      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>
        📭
      </span>
      {message}
    </div>
  );
}

// ── Strategy Markdown Renderer ─────────────────────────────────────────────────
// Parses the AI output format:
//   **Section Heading:**  →  styled heading
//   - bullet text        →  list item
//   plain text           →  paragraph
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

  // Handles **bold** inline spans within a line
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

    // Blank line — flush pending bullets
    if (!line.trim()) {
      flushBullets(idx);
      return;
    }

    // Bullet line: starts with "- " or "* "
    if (/^[-*]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    // Heading line: **Text:** (entire line is bold or ends with colon inside **)
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

    // Plain paragraph
    flushBullets(idx);
    nodes.push(
      <p key={idx} className="ts-strategy-para">
        {renderInline(line)}
      </p>,
    );
  });

  // Flush any trailing bullets
  flushBullets("end");

  return <div className="ts-strategy-body">{nodes}</div>;
}

// ── Generate Tab ───────────────────────────────────────────────────────────────
function GenerateTab({ onSave }) {
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  };

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedGoal) return;
    setLoading(true);
    setError("");
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
    alert("Teaching strategy verified and active.");
  };

  return (
    <div className="va-generate">
      {error && (
        <div
          className="va-card"
          style={{ color: "#c0392b", fontWeight: 600, fontSize: 13 }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Step 1 — Pick student */}
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          Step 1 — Select a Student
        </p>
        {loadingDir ? (
          <StudentShimmer />
        ) : directory.length === 0 ? (
          <EmptyState message="No students found. Add a student profile first." />
        ) : (
          <div className="va-student-list">
            {directory.map((student) => (
              <div
                key={student.studentID}
                className={`va-student-row ts-student-row ${selectedStudent?.studentID === student.studentID ? "selected" : ""}`}
              >
                <div className="va-student-avatar" />
                <div className="va-student-info ts-student-info">
                  <span className="va-student-name">{student.studentName}</span>
                </div>
                <button
                  className="va-select-btn"
                  onClick={() => selectStudent(student)}
                >
                  {selectedStudent?.studentID === student.studentID
                    ? "Selected"
                    : "Select"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Pick IEP goal */}
      {selectedStudent && !generated && (
        <div className="va-card">
          <p className="va-card-title">
            Step 2 — Select an IEP Goal for{" "}
            <strong>{selectedStudent.studentName}</strong>
          </p>
          {selectedStudent.availableGoals.length === 0 ? (
            <EmptyState message="No IEP goals found for this student." />
          ) : (
            <div className="ts-goal-list">
              {selectedStudent.availableGoals.map((goal) => (
                <label key={goal.goalID} className="ts-goal-item">
                  <input
                    type="radio"
                    name="iepGoal"
                    checked={selectedGoal?.goalID === goal.goalID}
                    onChange={() => setSelectedGoal(goal)}
                  />
                  <span>{goal.label}</span>
                </label>
              ))}
            </div>
          )}
          <div className="va-actions ts-center-actions">
            <button
              className="btn btn-submit"
              onClick={handleGenerate}
              disabled={!selectedGoal || loading}
            >
              {loading
                ? "Invoking Llama AI Pipeline…"
                : "Generate Teaching Strategy"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Result Panel */}
      {generated && (
        <div className="va-card ts-detail-card">
          <h3>{generated.data?.title || "AI Generated Teaching Strategy"}</h3>

          {/* ── Formatted strategy output ── */}
          <div className="ts-strategy-output">
            <StrategyRenderer content={generated.data?.strategyContent} />
          </div>

          <p
            className="va-result-sub"
            style={{ color: "#27ae60", fontWeight: 500, marginTop: 12 }}
          >
            {generated.message}
          </p>

          <div
            className="va-actions ts-center-actions"
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <button
              className="btn"
              style={{ background: "#e67e22", color: "white" }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Regenerating…" : "🔄 Generate Again"}
            </button>
            <button
              className="btn btn-submit"
              onClick={handleSave}
              disabled={loading}
            >
              💾 Confirm & Save Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Strategy Detail View ───────────────────────────────────────────────────────
function StrategyDetails({ strategy, onBack }) {
  return (
    <div className="va-card ts-detail-card">
      <h2>{strategy.title}</h2>
      <div className="ts-detail-grid">
        <section>
          <h4>Student</h4>
          <p>{strategy.studentName}</p>
        </section>
        <section>
          <h4>Date Created</h4>
          <p>{strategy.formattedDate}</p>
        </section>
        <section className="ts-wide">
          <h4>Strategy Content</h4>
          {/* Also render saved strategies with the formatter */}
          <StrategyRenderer content={strategy.strategyContent} />
        </section>
      </div>
      <div className="ts-page-actions">
        <button className="btn btn-back" onClick={onBack}>
          BACK
        </button>
        <a
          href={teachingStrategiesAPI.exportUrl(strategy.strategyID)}
          target="_blank"
          rel="noreferrer"
          className="btn btn-submit"
          style={{ textDecoration: "none" }}
        >
          EXPORT
        </a>
      </div>
    </div>
  );
}

// ── View Tab ───────────────────────────────────────────────────────────────────
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
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          {selectedStudent.studentName} – Teaching Strategies
        </p>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
        {loadingStrats ? (
          <StudentShimmer />
        ) : strategies.length === 0 ? (
          <EmptyState message="No teaching strategies found for this student." />
        ) : (
          <table className="va-table">
            <thead>
              <tr>
                <th>Strategy Title</th>
                <th>Date Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.strategyID}>
                  <td>{strategy.title}</td>
                  <td>{strategy.formattedDate}</td>
                  <td>
                    <button
                      className="va-view-btn"
                      onClick={() => setSelected(strategy)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="ts-page-actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn-back"
            onClick={() => {
              setSelectedStudent(null);
              setStrategies([]);
            }}
          >
            ← Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">
        Saved Teaching Strategies
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
      {loadingDir ? (
        <StudentShimmer />
      ) : directory.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <div className="va-student-list">
          {directory.map((s) => (
            <div key={s.studentID} className="va-student-row">
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.studentName}</span>
              </div>
              <button
                className="va-select-btn"
                onClick={() => handleSelectStudent(s)}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Tab ───────────────────────────────────────────────────────────────────
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
      setSelected(null);
      setForm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (selected && form) {
    return (
      <div className="va-card ts-edit-card">
        <h2>{selected.title}</h2>
        <div className="ts-form-grid">
          <label>
            Strategy Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Strategy Content
            <textarea
              value={form.strategyContent}
              onChange={(e) =>
                setForm({ ...form, strategyContent: e.target.value })
              }
              style={{ minHeight: 160 }}
            />
          </label>
        </div>
        {error && (
          <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>
            ⚠️ {error}
          </p>
        )}
        <div className="ts-page-actions">
          <button
            className="btn btn-back"
            onClick={() => {
              setSelected(null);
              setForm(null);
            }}
          >
            BACK
          </button>
          <button
            className="btn btn-submit"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? "Saving…" : "SAVE"}
          </button>
        </div>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          {selectedStudent.studentName} – Teaching Strategies
        </p>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
        {loadingStrats ? (
          <StudentShimmer />
        ) : strategies.length === 0 ? (
          <EmptyState message="No teaching strategies found for this student." />
        ) : (
          <table className="va-table">
            <thead>
              <tr>
                <th>Strategy Title</th>
                <th>Date Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.strategyID}>
                  <td>{strategy.title}</td>
                  <td>{strategy.formattedDate}</td>
                  <td>
                    <button
                      className="va-view-btn"
                      onClick={() => openEdit(strategy)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="ts-page-actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn-back"
            onClick={() => {
              setSelectedStudent(null);
              setStrategies([]);
            }}
          >
            ← Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">
        Edit Teaching Strategies
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
      {loadingDir ? (
        <StudentShimmer />
      ) : directory.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <div className="va-student-list">
          {directory.map((s) => (
            <div key={s.studentID} className="va-student-row">
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.studentName}</span>
              </div>
              <button
                className="va-select-btn"
                onClick={() => handleSelectStudent(s)}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Delete Tab ─────────────────────────────────────────────────────────────────
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
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          {selectedStudent.studentName} – Teaching Strategies
        </p>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
        {loadingStrats ? (
          <StudentShimmer />
        ) : strategies.length === 0 ? (
          <EmptyState message="No teaching strategies to delete for this student." />
        ) : (
          <table className="va-table">
            <thead>
              <tr>
                <th>Strategy Title</th>
                <th>Date Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy) => (
                <tr key={strategy.strategyID}>
                  <td>{strategy.title}</td>
                  <td>{strategy.formattedDate}</td>
                  <td>
                    <button
                      className="va-delete-btn"
                      onClick={() => setToDelete(strategy.strategyID)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="ts-page-actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn-back"
            onClick={() => {
              setSelectedStudent(null);
              setStrategies([]);
            }}
          >
            ← Back to Students
          </button>
        </div>

        {toDelete && (
          <div className="va-modal-overlay">
            <div className="va-modal">
              <p className="va-modal-title">Delete Teaching Strategy?</p>
              <p className="va-modal-body">
                Are you sure you want to delete <strong>{item?.title}</strong>?
                This action cannot be undone.
              </p>
              <div className="va-modal-actions">
                <button
                  className="btn btn-back"
                  onClick={() => setToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn va-btn-danger"
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
    <div className="va-card">
      <p className="va-card-title ts-centered-title">
        Delete Teaching Strategies
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
      {loadingDir ? (
        <StudentShimmer />
      ) : directory.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <div className="va-student-list">
          {directory.map((s) => (
            <div key={s.studentID} className="va-student-row">
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.studentName}</span>
              </div>
              <button
                className="va-select-btn"
                onClick={() => handleSelectStudent(s)}
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ManageTeachingStrategies() {
  const [activeTab, setActiveTab] = useState("generate");
  const [strategies, setStrategies] = useState([]);

  const saveStrategy = (strategy) => {
    if (strategy) setStrategies((prev) => [strategy, ...prev]);
  };

  return (
    <div className="page-content">
      <div className="va-header ts-header">
        <span className="va-header-title">Manage Teaching Strategies</span>
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
        {activeTab === "generate" && <GenerateTab onSave={saveStrategy} />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
