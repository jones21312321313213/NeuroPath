import { useState } from "react";
import "../styles/ManageVisualAids.css";
const TABS = [
  { key: "generate", label: "Generate Visual Aids" },
  { key: "view", label: "View Visual Aids" },
  { key: "delete", label: "Delete Visual Aids" },
];

// Placeholder student data — replace with real API data later
const MOCK_STUDENTS = [
  { id: 1, name: "John Clyde Perez", grade: 3 },
  { id: 2, name: "Maria Santos", grade: 2 },
  { id: 3, name: "Carlo Reyes", grade: 4 },
];

// ── Generate Tab ───────────────────────────────────────────────────────────────
function GenerateTab() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ topic: "", type: "", notes: "" });
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    if (!selectedStudent || !form.topic || !form.type) return;
    setLoading(true);
    // Simulate generation — replace with real API call
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
    }, 1200);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setForm({ topic: "", type: "", notes: "" });
    setGenerated(false);
  };

  return (
    <div className="va-generate">
      {/* Step 1 — Pick student */}
      <div className="va-card">
        <p className="va-card-title">Step 1 — Select a Student</p>
        <div className="va-student-list">
          {MOCK_STUDENTS.map((s) => (
            <div
              key={s.id}
              className={`va-student-row ${selectedStudent?.id === s.id ? "selected" : ""}`}
            >
              <div className="va-student-avatar" />
              <div className="va-student-info">
                <span className="va-student-name">{s.name}</span>
                <span className="va-student-grade">Grade – {s.grade}</span>
              </div>
              <button
                className={`va-select-btn ${selectedStudent?.id === s.id ? "selected" : ""}`}
                onClick={() => setSelectedStudent(s)}
              >
                {selectedStudent?.id === s.id ? "Selected ✓" : "Select"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Fill details */}
      {selectedStudent && (
        <div className="va-card">
          <p className="va-card-title">
            Step 2 — Visual Aid Details for{" "}
            <strong>{selectedStudent.name}</strong>
          </p>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Topic / Subject</label>
              <input
                className="form-input"
                placeholder="e.g. Counting 1–10"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Visual Aid Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="">Select type…</option>
                <option value="flashcard">Flashcard</option>
                <option value="chart">Chart / Diagram</option>
                <option value="picture-schedule">Picture Schedule</option>
                <option value="social-story">Social Story</option>
                <option value="worksheet">Worksheet</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Additional Notes (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Any specific requirements or accommodations…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ minHeight: 80 }}
              />
            </div>
          </div>

          <div className="va-actions">
            <button className="btn btn-back" onClick={handleReset}>
              Reset
            </button>
            <button
              className="btn btn-submit"
              onClick={handleGenerate}
              disabled={!form.topic || !form.type || loading}
            >
              {loading ? "Generating…" : "Generate Visual Aid"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {generated && (
        <div className="va-card va-result">
          <p className="va-card-title">Generated Visual Aid</p>
          <div className="va-result-preview">
            <span className="va-result-icon">🖼️</span>
            <p className="va-result-label">
              <strong>{form.type}</strong> — "{form.topic}" for{" "}
              {selectedStudent?.name}
            </p>
            <p className="va-result-sub">
              AI-generated content will appear here once connected to the
              backend.
            </p>
          </div>
          <div className="va-actions">
            <button className="btn btn-back" onClick={handleReset}>
              Generate Another
            </button>
            <button className="btn btn-submit">Save Visual Aid</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Tab ───────────────────────────────────────────────────────────────────
function ViewTab() {
  const mockAids = [
    {
      id: 1,
      student: "John Clyde Perez",
      topic: "Counting 1–10",
      type: "Flashcard",
      date: "2026-05-20",
    },
    {
      id: 2,
      student: "Maria Santos",
      topic: "Daily Schedule",
      type: "Picture Schedule",
      date: "2026-05-18",
    },
    {
      id: 3,
      student: "Carlo Reyes",
      topic: "Emotions",
      type: "Chart / Diagram",
      date: "2026-05-15",
    },
  ];

  return (
    <div className="va-card">
      <p className="va-card-title">Saved Visual Aids</p>
      {mockAids.length === 0 ? (
        <p className="va-empty">No visual aids saved yet.</p>
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Topic</th>
              <th>Type</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mockAids.map((aid) => (
              <tr key={aid.id}>
                <td>{aid.student}</td>
                <td>{aid.topic}</td>
                <td>
                  <span className="va-badge">{aid.type}</span>
                </td>
                <td>{aid.date}</td>
                <td>
                  <button className="va-view-btn">View</button>
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
  const [aids, setAids] = useState([
    {
      id: 1,
      student: "John Clyde Perez",
      topic: "Counting 1–10",
      type: "Flashcard",
    },
    {
      id: 2,
      student: "Maria Santos",
      topic: "Daily Schedule",
      type: "Picture Schedule",
    },
    {
      id: 3,
      student: "Carlo Reyes",
      topic: "Emotions",
      type: "Chart / Diagram",
    },
  ]);
  const [toDelete, setToDelete] = useState(null);

  const confirmDelete = () => {
    setAids((prev) => prev.filter((a) => a.id !== toDelete));
    setToDelete(null);
  };

  return (
    <div className="va-card">
      <p className="va-card-title">Delete Visual Aids</p>
      {aids.length === 0 ? (
        <p className="va-empty">No visual aids to delete.</p>
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Topic</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {aids.map((aid) => (
              <tr key={aid.id}>
                <td>{aid.student}</td>
                <td>{aid.topic}</td>
                <td>
                  <span className="va-badge">{aid.type}</span>
                </td>
                <td>
                  <button
                    className="va-delete-btn"
                    onClick={() => setToDelete(aid.id)}
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
            <p className="va-modal-title">Delete Visual Aid?</p>
            <p className="va-modal-body">
              This action cannot be undone. Are you sure you want to delete this
              visual aid?
            </p>
            <div className="va-modal-actions">
              <button
                className="btn btn-back"
                onClick={() => setToDelete(null)}
              >
                Cancel
              </button>
              <button className="btn va-btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ManageVisualAids() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="page-content">
      {/* Page header with tabs */}
      <div className="va-header">
        <span className="va-header-title">Manage Visual Aids</span>
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

      {/* Tab content */}
      <div className="va-body">
        {activeTab === "generate" && <GenerateTab />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
