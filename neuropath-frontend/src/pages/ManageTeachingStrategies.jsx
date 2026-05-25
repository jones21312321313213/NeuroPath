import { useMemo, useState, useEffect, useCallback } from "react";
import "../styles/ManageVisualAids.css";
import "../styles/ManageTeachingStrategies.css";
import { teachingStrategiesAPI } from "../api/client";

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

// ── Generate Tab ───────────────────────────────────────────────────────────────
function GenerateTab({ onSave }) {
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory()
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and goals."))
      .finally(() => setLoadingDir(false));
  }, []);

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
        studentID: selectedStudent.studentID,
        iepGoalID: selectedGoal.iepID,
      });
      setGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!generated) return;
    onSave(generated.data);
    alert("Teaching strategy saved successfully.");
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
          <p className="va-empty">Loading students…</p>
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
                <label key={goal.iepID} className="ts-goal-item">
                  <input
                    type="radio"
                    name="iepGoal"
                    checked={selectedGoal?.iepID === goal.iepID}
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
              {loading ? "Generating…" : "Generate Teaching Strategy"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {generated && (
        <div className="va-card ts-detail-card">
          <h3>{generated.data?.title || "Teaching Strategy"}</h3>
          <div
            style={{
              background: "#f7fafd",
              border: "1px solid #e3eaf2",
              borderRadius: 7,
              padding: 16,
              fontSize: 13.5,
              color: "#444",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
              marginBottom: 12,
            }}
          >
            {generated.data?.strategyContent}
          </div>
          <p className="va-result-sub">{generated.message}</p>
          <div className="va-actions ts-center-actions">
            <button className="btn btn-submit" onClick={handleSave}>
              Save Strategy
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
          <p style={{ whiteSpace: "pre-line" }}>{strategy.strategyContent}</p>
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
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loadingStrats, setLoadingStrats] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory()
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
          <p className="va-empty">Loading…</p>
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
        <p className="va-empty">Loading students…</p>
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
      .getDirectory()
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

  // Edit form
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

  // Strategy list for selected student
  if (selectedStudent) {
    return (
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          {selectedStudent.studentName} – Teaching Strategies
        </p>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
        {loadingStrats ? (
          <p className="va-empty">Loading…</p>
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

  // Student selection
  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">
        Edit Teaching Strategies
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
      {loadingDir ? (
        <p className="va-empty">Loading students…</p>
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
      .getDirectory()
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

  // Strategy list for selected student
  if (selectedStudent) {
    return (
      <div className="va-card">
        <p className="va-card-title ts-centered-title">
          {selectedStudent.studentName} – Teaching Strategies
        </p>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
        {loadingStrats ? (
          <p className="va-empty">Loading…</p>
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

  // Student selection
  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">
        Delete Teaching Strategies
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</p>}
      {loadingDir ? (
        <p className="va-empty">Loading students…</p>
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
