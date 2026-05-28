import { useState, useEffect, useCallback } from "react";
import "../styles/ManageLessonPlans.css";
import { lessonPlansAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

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
    lessonPlansAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and IEP goals."))
      .finally(() => setLoadingDir(false));
  }, []);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedGoal(null); // 🎯 NEW: Reset goal selection if they change students
    setGenerated(null);
    setError("");
  };

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedGoal) return;

    //if (!selectedStudent || selectedStudent.availableGoals.length === 0) return;
   // const goal = selectedStudent.availableGoals[0];
    setLoading(true);
    setError("");
    try {
      const data = await lessonPlansAPI.generate({
        goalID: selectedGoal.goalID,
        subject: selectedGoal.goalArea || "General Learning",
        topic: selectedGoal.label || "General Learning",
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
    alert("Lesson plan saved successfully.");
  };

// 🛡️ Advanced Bulletproof AI text renderer
// 🛡️ Advanced Bulletproof AI text renderer
// 🛡️ Advanced Bulletproof AI text renderer
  const renderSafeText = (content) => {
    // Base cases: empty or simple text
    if (!content) return "";
    if (typeof content !== "object") return String(content);
    
    // Case 1: If the AI returns an array (like the steps list)
    if (Array.isArray(content)) {
      return content.map(item => {
        // If the item inside the array is ANOTHER object, dig deeper!
        return typeof item === "object" ? renderSafeText(item) : `• ${item}`;
      }).join("\n");
    }
    
    // 🎯 SMART INTERCEPTOR: Catch the AI's step objects and merge them!
    if ('step_number' in content && 'description' in content) {
      return `Step #${content.step_number}: ${content.description}`;
    }
    
    // Case 2: General fallback for other nested objects
    return Object.entries(content)
      .map(([key, value]) => {
        const cleanKey = key.replace(/_/g, ' ').toUpperCase();
        const cleanValue = renderSafeText(value); 
        
        // 🎯 SMART SPACING: If the value is a list/array of items, drop it to the next line.
        // If it's just a single word or phrase, keep it on the same line!
        const separator = typeof value === "object" ? "\n" : " ";
        
        return `${cleanKey}:${separator}${cleanValue}`;
      })
      .join("\n\n");
  };
  
  return (
    <div className="va-generate">
      {error && (
        <div
          className="lp-card"
          style={{ color: "#c0392b", fontWeight: 600, fontSize: 13 }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Step 1 — Pick student */}
      <div className="lp-card">
        <p className="lp-card-title">Step 1 — Select a Student</p>
        {loadingDir ? (
          <StudentShimmer />
        ) : directory.length === 0 ? (
          <EmptyState message="No students found. Add a student profile first." />
        ) : (
          <div className="va-student-list">
            {directory.map((student) => (
              <div
                key={student.studentID}
                className={`va-student-row${selectedStudent?.studentID === student.studentID ? " selected" : ""}`}
              >
                <div className="va-student-avatar" />
                <div className="va-student-info">
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

      {/* Step 2 — IEP Goal Area (auto-fetched, read-only) + Generate button */}
      {selectedStudent && !generated && (
              <div className="lp-card">
                <p className="lp-card-title">
                  Step 2 — Select an IEP Goal for{" "}
                  <strong>{selectedStudent.studentName}</strong>
                </p>
                {selectedStudent.availableGoals.length === 0 ? (
                  <EmptyState message="No IEP goals found for this student. Generate an IEP first." />
                ) : (
                  <>
                    <div className="va-student-list">
                      {selectedStudent.availableGoals.map((goal) => (
                        <div
                          key={goal.goalID}
                          className={`va-student-row${selectedGoal?.goalID === goal.goalID ? " selected" : ""}`}
                          onClick={() => setSelectedGoal(goal)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="va-student-info">
                            <span className="va-student-name">
                              {goal.goalArea}
                            </span>
                            {goal.label && (
                              <span className="va-student-grade" style={{ marginTop: "4px", display: "block" }}>
                                {goal.label}
                              </span>
                            )}
                          </div>
                          <button className="va-select-btn">
                            {selectedGoal?.goalID === goal.goalID
                              ? "Selected"
                              : "Select"}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="lp-actions" style={{ marginTop: 16 }}>
                      <button
                        className="btn btn-submit"
                        onClick={handleGenerate}
                        disabled={loading || !selectedGoal} // 🎯 Button disabled until goal is picked
                      >
                        {loading ? "Generating…" : "Generate Lesson Plan"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

      {/* Step 3 — Result */}
      {generated && (
        <div className="lp-card">
          <p className="lp-card-title">Generated Lesson Plan Modules</p>
          <div className="lp-result-content">
            {/* 🎯 NEW: Maps through the array of objective-based lesson plans */}
          <div className="ts-preview-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {/* 🎯 THE MAGIC: Mapping through the JSON array Ollama returned! */}
              {generated.data?.lesson_plans?.length > 0 ? (
                generated.data.lesson_plans.map((plan, index) => (
                  <div 
                    key={index} 
                    className="lp-objective-block"
                    style={{ 
                      marginBottom: "24px", 
                      paddingBottom: "24px", 
                      borderBottom: index !== generated.data.lesson_plans.length - 1 ? "2px dashed #e0e0e0" : "none" 
                    }}
                  >
                    <h4 style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ background: "#4a90e2", color: "white", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                        Phase {index + 1}
                      </span> 
                      {renderSafeText(plan.objective_focus)}
                    </h4>

                    {plan.introduction && (
                      <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                        <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Introduction:</span>
                        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                          {renderSafeText(plan.introduction)}
                        </p>
                      </div>
                    )}
                    {plan.core_activity && (
                      <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                        <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Core Activity:</span>
                        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                          {renderSafeText(plan.core_activity)}
                        </p>
                      </div>
                    )}
                    {plan.assessment && (
                      <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                        <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Assessment:</span>
                        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                          {renderSafeText(plan.assessment)}
                        </p>
                      </div>
                    )}
                    {plan.materials_needed && plan.materials_needed.length > 0 && (
                      <div className="lp-result-section">
                        <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Materials Needed:</span>
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
                          {plan.materials_needed.map((m, i) => (
                            <li key={i}>{renderSafeText(m)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No lesson plan data was returned from the AI.</p>
              )}
            </div>
          </div>
          <p className="lp-result-sub">{generated.message}</p>
          <div className="lp-actions">
            <button className="btn btn-back" onClick={() => setGenerated(null)}>
              ← Back
            </button>
            <button className="btn btn-submit" onClick={handleSave}>
              Save Lesson Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Tab ───────────────────────────────────────────────────────────────────
// ── View Tab ───────────────────────────────────────────────────────────────────
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
  }, [user?.id]);

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

  // 📺 SCREEN 3: Detail view
  if (viewingPlan) {
    // 🎯 HYPER-RESILIENT JSON PARSER
    let lessonsArray = [];
    try {
      // 1. Grab the raw text from the database (checking both possible serializer keys)
      let rawText = viewingPlan.lessonContent || viewingPlan.content || "{}";
      
      // 2. Initial parse
      let parsed = typeof rawText === "string" ? JSON.parse(rawText) : rawText;

      // 3. Catch Double-Stringified Data (If Python wrapped it twice)
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }

      // 4. Catch AI structure variations (Did it return {lesson_plans: []} or just []?)
      lessonsArray = Array.isArray(parsed) ? parsed : (parsed?.lesson_plans || []);
      
    } catch (e) {
      console.error("Failed to parse saved lesson plan JSON.", e);
    }

    // 🛡️ Advanced Bulletproof AI text renderer
    const renderSafeText = (content) => {
      if (!content) return "";
      if (typeof content !== "object") return String(content);
      if (Array.isArray(content)) {
        return content.map(item => (typeof item === "object" ? renderSafeText(item) : `• ${item}`)).join("\n");
      }
      if ('step_number' in content && 'description' in content) {
        return `Step #${content.step_number}: ${content.description}`;
      }
      return Object.entries(content)
        .map(([key, value]) => {
          const cleanKey = key.replace(/_/g, ' ').toUpperCase();
          const cleanValue = renderSafeText(value); 
          const separator = typeof value === "object" ? "\n" : " ";
          return `${cleanKey}:${separator}${cleanValue}`;
        }).join("\n\n");
    };

    return (
      <div className="lp-card">
        <p className="lp-card-title">
          {selectedStudent?.name} – {viewingPlan.title}
        </p>
        
        {/* Meta Data Header (Status has been removed) */}
        <div className="lp-detail-meta" style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e0e0e0" }}>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Student:</span>
            <span>{viewingPlan.studentName}</span>
          </div>
          <div className="lp-detail-row">
            <span className="lp-detail-label">Date Created:</span>
            <span>{new Date(viewingPlan.dateCreated).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 🎯 Render the actual Lesson Plan Modules! */}
        <div className="ts-preview-body" style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "10px" }}>
          {lessonsArray.length > 0 ? (
            lessonsArray.map((plan, index) => (
              <div 
                key={index} 
                className="lp-objective-block"
                style={{ 
                  marginBottom: "24px", 
                  paddingBottom: "24px", 
                  borderBottom: index !== lessonsArray.length - 1 ? "2px dashed #e0e0e0" : "none" 
                }}
              >
                <h4 style={{ color: "#2c3e50", fontSize: "16px", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ background: "#4a90e2", color: "white", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    Phase {index + 1}
                  </span> 
                  {renderSafeText(plan.objective_focus)}
                </h4>

                {plan.introduction && (
                  <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Introduction:</span>
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>{renderSafeText(plan.introduction)}</p>
                  </div>
                )}
                {plan.core_activity && (
                  <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Core Activity:</span>
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>{renderSafeText(plan.core_activity)}</p>
                  </div>
                )}
                {plan.assessment && (
                  <div className="lp-result-section" style={{ marginBottom: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Assessment:</span>
                    <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", whiteSpace: "pre-line" }}>{renderSafeText(plan.assessment)}</p>
                  </div>
                )}
                {plan.materials_needed && plan.materials_needed.length > 0 && (
                  <div className="lp-result-section">
                    <span style={{ fontWeight: 600, color: "#34495e", display: "block", marginBottom: "4px" }}>Materials Needed:</span>
                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
                      {plan.materials_needed.map((m, i) => <li key={i}>{renderSafeText(m)}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: "#7f8c8d", fontStyle: "italic" }}>No lesson plan content available to display.</p>
          )}
        </div>

        <div className="lp-actions" style={{ marginTop: "24px" }}>
          <button className="btn btn-back" onClick={() => setViewingPlan(null)}>
            ← Back to List
          </button>
        </div>
      </div>
    );
  }

  // 📺 SCREEN 2: Student plan list
  if (selectedStudent) {
    return (
      <div className="lp-card">
        <p className="lp-card-title">{selectedStudent.name} – Lesson Plans</p>
        {loadingPlans ? (
          <StudentShimmer />
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

  // 📺 SCREEN 1: Student selection
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
          <StudentShimmer />
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
        <StudentShimmer />
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
        <StudentShimmer />
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
  const [activeTab, setActiveTab] = useState("generate");
  const [lessonPlans, setLessonPlans] = useState([]);

  const saveLessonPlan = (plan) => {
    if (plan) setLessonPlans((prev) => [plan, ...prev]);
  };

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
        {activeTab === "generate" && <GenerateTab onSave={saveLessonPlan} />}
        {activeTab === "view" && <ViewTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "delete" && <DeleteTab />}
      </div>
    </div>
  );
}
