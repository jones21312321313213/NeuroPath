import { useState, useEffect, useCallback } from "react";
import "../styles/ManageVisualAids.css";
import { visualAidsAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

const TABS = [
  { key: "generate", label: "Generate Visual Aids" },
  { key: "view", label: "View Visual Aids" },
  { key: "delete", label: "Delete Visual Aids" },
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
function GenerateTab() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ goalText: "" });
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedStudent || !form.goalText) return;
    setLoading(true);
    setError("");
    try {
      const data = await visualAidsAPI.generate({
        studentID: selectedStudent.studentID,
        goalText: form.goalText,
      });
      setGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setForm({ goalText: "" });
    setGenerated(null);
    setError("");
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
        <p className="va-card-title">Step 1 — Select a Student</p>
        {loadingStudents ? (
          <StudentShimmer />
        ) : students.length === 0 ? (
          <EmptyState message="No students found. Add a student profile first." />
        ) : (
          <div className="va-student-list">
            {students.map((s) => (
              <div
                key={s.studentID}
                className={`va-student-row ${selectedStudent?.studentID === s.studentID ? "selected" : ""}`}
              >
                <div className="va-student-avatar" />
                <div className="va-student-info">
                  <span className="va-student-name">{s.name}</span>
                  <span className="va-student-grade">Grade – {s.grade}</span>
                </div>
                <button
                  className={`va-select-btn ${selectedStudent?.studentID === s.studentID ? "selected" : ""}`}
                  onClick={() => setSelectedStudent(s)}
                >
                  {selectedStudent?.studentID === s.studentID
                    ? "Selected ✓"
                    : "Select"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Fill details */}
      {selectedStudent && !generated && (
        <div className="va-card">
          <p className="va-card-title">
            Step 2 — Visual Aid Details for{" "}
            <strong>{selectedStudent.name}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">IEP Goal / Topic</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the IEP goal this visual aid should support…"
              value={form.goalText}
              onChange={(e) => setForm({ goalText: e.target.value })}
              style={{ minHeight: 90 }}
            />
          </div>
          <div className="va-actions">
            <button className="btn btn-back" onClick={handleReset}>
              Reset
            </button>
            <button
              className="btn btn-submit"
              onClick={handleGenerate}
              disabled={!form.goalText || loading}
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
              <strong>{generated.data?.title || "Visual Aid"}</strong> for{" "}
              {selectedStudent?.name}
            </p>
            {generated.data?.imageUrl && (
              <img
                src={generated.data.imageUrl}
                alt="Generated visual aid"
                style={{ maxWidth: "100%", borderRadius: 8, marginTop: 10 }}
              />
            )}
            <p className="va-result-sub">{generated.message}</p>
          </div>
          <div className="va-actions">
            <button className="btn btn-back" onClick={handleReset}>
              Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Tab ───────────────────────────────────────────────────────────────────
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

  if (loading)
    return (
      <div className="va-card">
        <StudentShimmer />
      </div>
    );
  if (error)
    return (
      <div className="va-card">
        <p className="va-empty">⚠️ {error}</p>
      </div>
    );

  return (
    <div className="va-card">
      <p className="va-card-title">Saved Visual Aids</p>
      {aids.length === 0 ? (
        <EmptyState message="No visual aids saved yet. Generate one first." />
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Title</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {aids.map((aid) => (
              <tr key={aid.visualAidID}>
                <td>{aid.studentName}</td>
                <td>{aid.title}</td>
                <td>{new Date(aid.dateCreated).toLocaleDateString()}</td>
                <td>
                  <a
                    href={visualAidsAPI.exportUrl(aid.visualAidID)}
                    target="_blank"
                    rel="noreferrer"
                    className="va-view-btn"
                    style={{ textDecoration: "none" }}
                  >
                    View
                  </a>
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
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  if (loading)
    return (
      <div className="va-card">
        <StudentShimmer />
      </div>
    );
  if (error)
    return (
      <div className="va-card">
        <p className="va-empty">⚠️ {error}</p>
      </div>
    );

  return (
    <div className="va-card">
      <p className="va-card-title">Delete Visual Aids</p>
      {aids.length === 0 ? (
        <EmptyState message="No visual aids to delete." />
      ) : (
        <table className="va-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Title</th>
              <th>Date Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {aids.map((aid) => (
              <tr key={aid.visualAidID}>
                <td>{aid.studentName}</td>
                <td>{aid.title}</td>
                <td>{new Date(aid.dateCreated).toLocaleDateString()}</td>
                <td>
                  <button
                    className="va-delete-btn"
                    onClick={() => setToDelete(aid.visualAidID)}
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
            <p className="va-modal-title">Delete Visual Aid?</p>
            <p className="va-modal-body">
              This action cannot be undone. Are you sure you want to delete this
              visual aid?
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ManageVisualAids() {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <div className="page-content">
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
      <div className="va-body">
        {activeTab === "generate" && <GenerateTab />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
