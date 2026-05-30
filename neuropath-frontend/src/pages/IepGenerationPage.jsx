import { useEffect, useMemo, useRef, useState } from "react";
import { iepAPI, studentsAPI } from "../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const barrierQualifierOptions = [
  "No barrier",
  "Mild barrier",
  "Moderate barrier",
  "Severe barrier",
  "Severe barrier 5 and beyond",
];

const defaultGeneratedAccommodations = "";

function getGoalTypesForGrade(grade) {
  const n = Number(grade);
  if (Number.isNaN(n))
    return [
      "Care Skills",
      "Mathematical Skills",
      "Communication Skills",
      "Social / Interpersonal Skills",
      "Behavioral Skills",
      "Functional Academic Skills",
    ];
  if (n <= 2)
    return [
      "Care Skills",
      "Communication Skills",
      "Social / Interpersonal Skills",
      "Behavioral Skills",
      "Mathematical Skills",
    ];
  if (n <= 6)
    return [
      "Mathematical Skills",
      "Functional Academic Skills",
      "Communication Skills",
      "Social / Interpersonal Skills",
      "Behavioral Skills",
    ];
  return [
    "Functional Academic Skills",
    "Communication Skills",
    "Social / Interpersonal Skills",
    "Behavioral Skills",
    "Mathematical Skills",
  ];
}

// ─── Small reusable UI ────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div className="iep-section-header">
      <h2 className="form-section-title">{title}</h2>
      {subtitle && <p className="iep-section-subtitle">{subtitle}</p>}
    </div>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="iep-info-block">
      <h3>{title}</h3>
      <div>{children || "No information available."}</div>
    </div>
  );
}

function TextAreaField({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-textarea"
      />
    </div>
  );
}

// ─── Read-only goal table ─────────────────────────────────────────────────────

function ReadOnlyGoalTable({ rows = [] }) {
  const columns = [
    ["objective", "ENROUTE OBJECTIVES / PROCEDURE"],
    ["interventions", "INTERVENTIONS / ACTIVITIES / PROCEDURE"],
    ["timeline", "TIMELINE / SESSION"],
    ["responsible", "INDIVIDUALS RESPONSIBLE"],
    ["evaluation", "PROGRESS / INSTRUCTIONAL EVALUATION"],
    ["remarks", "REMARKS"],
  ];
  if (!rows.length)
    return <p className="iep-muted">No learner goal rows available.</p>;
  return (
    <div className="iep-table-wrap">
      <table className="iep-table iep-goal-table">
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map(([field]) => (
                <td key={field} className="iep-readonly-cell">
                  {row[field] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeGeneratedDetails(iep) {
  const raw =
    iep?.generatedDetails ||
    iep?.standardContents ||
    iep?.formData ||
    iep?.details ||
    null;
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function getStudentProfileDetails(student) {
  if (student?.profileDetails && typeof student.profileDetails === "object")
    return student.profileDetails;
  if (!student?.preferences) return {};
  if (typeof student.preferences === "string") {
    try {
      const p = JSON.parse(student.preferences);
      return p && typeof p === "object" ? p : {};
    } catch {
      return {};
    }
  }
  return typeof student.preferences === "object" ? student.preferences : {};
}

function getStudentName(s) {
  return (
    s?.name ||
    s?.studentName ||
    s?.learnerName ||
    s?.profileDetails?.studentName ||
    s?.profileDetails?.learnerName ||
    ""
  );
}

function getStudentId(s) {
  return s?.studentID || s?.id || s?.pk || null;
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|\s*\|\s*/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function getStudentProfileDifficulties(student) {
  const p = getStudentProfileDetails(student);
  const candidates = [
    p.difficultyMarkers,
    p.difficulties,
    p.difficulty,
    student?.difficultyMarkers,
    student?.difficulties,
    student?.difficulty,
  ];

  for (const candidate of candidates) {
    const list = normalizeTextList(candidate);
    if (list.length) return [...new Set(list)];
  }
  return [];
}

function buildProfileBarrierRows(difficulties, previousRows = []) {
  return difficulties.map((difficulty) => {
    const existing = previousRows.find(
      (row) =>
        String(row.difficulty || "").trim().toLowerCase() ===
        String(difficulty || "").trim().toLowerCase(),
    );

    return {
      difficulty,
      barrierQualifier: existing?.barrierQualifier || "Moderate barrier",
      facilitator: existing?.facilitator || "",
      accommodation: existing?.accommodation || "",
    };
  });
}

function normalizeDbGoal(dbGoal) {
  return {
    goalID: dbGoal.goalID,
    iep: dbGoal.iep,
    type: dbGoal.subject_category || dbGoal.goalName || "Goal",
    annualGoal: dbGoal.annual_goal || dbGoal.goalName || "—",
    goalName: dbGoal.goalName || dbGoal.subject_category || "Goal",
    targetMetric: dbGoal.target_metric || "Standard IEP Metric",
    rows: (dbGoal.objective_rows || []).map((row) => ({
      id: row.rowID,
      rowID: row.rowID,
      objective: row.enroute_objectives || "",
      interventions: row.interventions_procedures || "",
      timeline: row.timeline_mins_session || "",
      responsible: row.individuals_responsible || "",
      evaluation: row.progress_instructional || "",
      remarks: row.remarks || "",
    })),
  };
}

function goalToApiPayload(goal, iepID) {
  return {
    iep: goal.iep || iepID,
    subject_category: goal.type || "Goal",
    annual_goal: goal.annualGoal || "",
    goalName: goal.goalName || goal.type || "Goal",
    target_metric: goal.targetMetric || "Standard IEP Metric",
    objective_rows: (goal.rows || []).map((row) => ({
      enroute_objectives: row.objective || "",
      interventions_procedures: row.interventions || "",
      timeline_mins_session: row.timeline || "",
      individuals_responsible: row.responsible || "",
      progress_instructional: row.evaluation || "",
      remarks: row.remarks || "",
    })),
  };
}

const emptyEditableGoal = () => ({
  goalID: null,
  type: "",
  annualGoal: "",
  goalName: "",
  targetMetric: "Standard IEP Metric",
  rows: [
    {
      objective: "",
      interventions: "",
      timeline: "",
      responsible: "",
      evaluation: "",
      remarks: "",
    },
  ],
});

function buildBarrierRowsFromFlat(iep) {
  if (!iep?.difficulties) return [];
  const difficulties = iep.difficulties.split("\n").filter(Boolean);
  const barriers = (iep.learning_barriers || "").split("\n").filter(Boolean);
  const facilitators = (iep.learning_facilitators || "")
    .split("\n")
    .filter(Boolean);
  const accommodations = (iep.learning_accommodations || "")
    .split("\n")
    .filter(Boolean);
  return difficulties.map((diff, i) => ({
    difficulty: diff,
    barrierQualifier: barriers[i] || "—",
    facilitator: facilitators[i] || "—",
    accommodation: accommodations[i] || "—",
  }));
}

// ─── Shared student search box ────────────────────────────────────────────────

function StudentSearchBox({
  searchTerm,
  setSearchTerm,
  selectedStudent,
  onSelect,
  filteredStudents,
  loadingStudents,
}) {
  return (
    <div className="form-group iep-search-group">
      <label className="form-label">Search Student</label>
      <input
        type="text"
        value={searchTerm}
        className="form-input"
        placeholder="Type student name..."
        onChange={(e) => {
          setSearchTerm(e.target.value);
          onSelect(null);
        }}
      />
      {searchTerm && !selectedStudent && (
        <div className="iep-search-results">
          {loadingStudents ? (
            <p>Loading students...</p>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <button
                key={getStudentId(student) || getStudentName(student)}
                type="button"
                onClick={() => {
                  onSelect(student);
                  setSearchTerm(getStudentName(student));
                }}
              >
                <strong>{getStudentName(student)}</strong>
                <span>
                  Grade {student.grade || "—"} · Age {student.age || "—"}
                </span>
              </button>
            ))
          ) : (
            <p>No similar student names found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── View IEP Panel ───────────────────────────────────────────────────────────

function ViewIEPPanel({
  searchTerm,
  setSearchTerm,
  selectedStudent,
  setSelectedStudent,
  filteredStudents,
  loadingStudents,
  ieps,
  selectedIep,
  setSelectedIep,
  loadingIeps,
  viewError,
  onDeleteIep,
  onUpdateIep,
}) {
  const selectedStudentId = getStudentId(selectedStudent);
  const studentIeps = selectedStudentId
    ? ieps.filter(
        (iep) =>
          String(iep.studentID) === String(selectedStudentId) ||
          String(iep.studentID?.pk ?? iep.studentID) ===
            String(selectedStudentId),
      )
    : [];

  const details = normalizeGeneratedDetails(selectedIep);
  const [isEditing, setIsEditing] = useState(false);
  const [editBarrierRows, setEditBarrierRows] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [iepGoals, setIepGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [editGoals, setEditGoals] = useState([]);
  const [goalsToDelete, setGoalsToDelete] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingIep, setDeletingIep] = useState(false);

  // Fetch goals from DB whenever selected IEP changes
  useEffect(() => {
    let mounted = true;
    async function fetchGoals() {
      if (!selectedIep?.iepID) {
        setIepGoals([]);
        return;
      }
      setLoadingGoals(true);
      try {
        const data = await iepAPI.listGoalsByIep(selectedIep.iepID);
        const list = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        // Filter out the junk "GENERAL" goals auto-created from empty goals text
        const realGoals = list.filter(
          (g) => g.subject_category !== "GENERAL" && g.annual_goal?.length > 20,
        );
        if (mounted) setIepGoals(realGoals.map(normalizeDbGoal));
      } catch {
        if (mounted) setIepGoals([]);
      } finally {
        if (mounted) setLoadingGoals(false);
      }
    }
    fetchGoals();
    return () => {
      mounted = false;
    };
  }, [selectedIep?.iepID]);

  useEffect(() => {
    setIsEditing(false);
    setEditBarrierRows([]);
    setEditGoals([]);
    setGoalsToDelete([]);
    setIepGoals([]);
    setDeleteTarget(null);
  }, [selectedIep]);

  const barrierRowsToRender =
    (details?.barrierRows?.length ? details.barrierRows : null) ||
    buildBarrierRowsFromFlat(selectedIep) ||
    [];

  const goalsToRender =
    iepGoals.length > 0 ? iepGoals : details?.learnerGoals || [];

  const openEdit = () => {
    setEditBarrierRows(
      barrierRowsToRender.length
        ? barrierRowsToRender.map((r) => ({ ...r }))
        : [
            {
              difficulty: "",
              barrierQualifier: "Moderate barrier",
              facilitator: "",
              accommodation: "",
            },
          ],
    );
    setEditGoals(
      goalsToRender.length ? goalsToRender.map((goal) => ({
        ...goal,
        rows: (goal.rows || []).map((row) => ({ ...row })),
      })) : [emptyEditableGoal()],
    );
    setGoalsToDelete([]);
    setIsEditing(true);
  };

  const updateEditRow = (i, field, value) =>
    setEditBarrierRows((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    );

  const addEditRow = () =>
    setEditBarrierRows((prev) => [
      ...prev,
      {
        difficulty: "",
        barrierQualifier: "Moderate barrier",
        facilitator: "",
        accommodation: "",
      },
    ]);

  const removeEditRow = (i) =>
    setEditBarrierRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateEditGoal = (goalIndex, field, value) =>
    setEditGoals((prev) =>
      prev.map((goal, idx) =>
        idx === goalIndex ? { ...goal, [field]: value } : goal,
      ),
    );

  const addEditGoal = () => setEditGoals((prev) => [...prev, emptyEditableGoal()]);

  const removeEditGoal = (goalIndex) =>
    setEditGoals((prev) => {
      const goal = prev[goalIndex];
      if (goal?.goalID) setGoalsToDelete((ids) => [...ids, goal.goalID]);
      return prev.filter((_, idx) => idx !== goalIndex);
    });

  const updateEditGoalRow = (goalIndex, rowIndex, field, value) =>
    setEditGoals((prev) =>
      prev.map((goal, idx) =>
        idx === goalIndex
          ? {
              ...goal,
              rows: goal.rows.map((row, rIdx) =>
                rIdx === rowIndex ? { ...row, [field]: value } : row,
              ),
            }
          : goal,
      ),
    );

  const addEditGoalRow = (goalIndex) =>
    setEditGoals((prev) =>
      prev.map((goal, idx) =>
        idx === goalIndex
          ? {
              ...goal,
              rows: [
                ...(goal.rows || []),
                {
                  objective: "",
                  interventions: "",
                  timeline: "",
                  responsible: "",
                  evaluation: "",
                  remarks: "",
                },
              ],
            }
          : goal,
      ),
    );

  const removeEditGoalRow = (goalIndex, rowIndex) =>
    setEditGoals((prev) =>
      prev.map((goal, idx) =>
        idx === goalIndex
          ? {
              ...goal,
              rows: goal.rows.filter((_, rIdx) => rIdx !== rowIndex),
            }
          : goal,
      ),
    );

  const confirmDeleteSelectedIep = async () => {
    if (!deleteTarget) return;
    setDeletingIep(true);
    try {
      await onDeleteIep(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeletingIep(false);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const existingDetails = normalizeGeneratedDetails(selectedIep) || {};
      const updatedDetails = {
        ...existingDetails,
        barrierRows: editBarrierRows,
      };
      await onUpdateIep(selectedIep, {
        baselineData: selectedIep.baselineData,
        goals: selectedIep.goals,
        accommodations: selectedIep.accommodations,
        generatedDetails: { ...updatedDetails, learnerGoals: editGoals },
        difficulties: editBarrierRows.map((r) => r.difficulty).join("\n"),
        learning_barriers: editBarrierRows
          .map((r) => r.barrierQualifier)
          .join("\n"),
        learning_facilitators: editBarrierRows
          .map((r) => r.facilitator)
          .join("\n"),
        learning_accommodations: editBarrierRows
          .map((r) => r.accommodation)
          .join("\n"),
      });

      for (const goalID of goalsToDelete) {
        await iepAPI.deleteGoal(goalID);
      }

      const savedGoals = [];
      for (const goal of editGoals) {
        const payload = goalToApiPayload(goal, selectedIep.iepID);
        if (!payload.subject_category.trim() && !payload.annual_goal.trim()) continue;
        if (goal.goalID) {
          const updatedGoal = await iepAPI.updateGoal(goal.goalID, payload);
          savedGoals.push(normalizeDbGoal(updatedGoal));
        } else {
          const createdGoal = await iepAPI.saveGoal(payload);
          savedGoals.push(normalizeDbGoal(createdGoal));
        }
      }
      setIepGoals(savedGoals);
      setIsEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="form-card iep-card">
      <SectionHeader
        title="View IEP"
        subtitle="Search a student name, select a matching result — the latest IEP loads automatically."
      />

      <div className="iep-view-controls">
        <StudentSearchBox
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedStudent={selectedStudent}
          onSelect={setSelectedStudent}
          filteredStudents={filteredStudents}
          loadingStudents={loadingStudents}
        />
        {selectedStudent && studentIeps.length > 1 && (
          <div className="form-group iep-version-group">
            <label className="form-label">IEP Version</label>
            <select
              value={selectedIep?.iepID || ""}
              className="form-select"
              disabled={loadingIeps}
              onChange={(e) =>
                setSelectedIep(
                  studentIeps.find(
                    (iep) => String(iep.iepID) === e.target.value,
                  ) || null,
                )
              }
            >
              {studentIeps.map((iep) => (
                <option key={iep.iepID} value={iep.iepID}>
                  Version {iep.version}
                  {iep.formattedDate ? ` · ${iep.formattedDate}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {viewError && (
        <div className="iep-alert iep-alert-error">{viewError}</div>
      )}

      {!selectedStudent ? (
        <div className="iep-empty-state">
          <div>⌕</div>
          <strong>Search and select a student</strong>
          <span>
            The IEP preview will appear here after selecting a student.
          </span>
        </div>
      ) : loadingIeps ? (
        <div className="iep-empty-state">
          <div style={{ fontSize: 28 }}>⏳</div>
          <strong>Loading IEP records…</strong>
          <span>Please wait while we fetch this student's IEP history.</span>
        </div>
      ) : studentIeps.length === 0 ? (
        <div className="iep-empty-state">
          <div>📄</div>
          <strong>No IEP records found</strong>
          <span>
            No saved IEP records were found for this student. Use Generate IEP
            to create one.
          </span>
        </div>
      ) : !selectedIep ? (
        <div className="iep-empty-state">
          <div>📄</div>
          <strong>No IEP selected</strong>
          <span>Choose an IEP version from the dropdown above.</span>
        </div>
      ) : (
        <div className="iep-view-details">
          {/* Header */}
          <div className="iep-view-header">
            <div>
              <span>Student</span>
              <h3>
                {selectedIep.studentName ||
                  getStudentName(selectedStudent) ||
                  "—"}
              </h3>
              <p>
                Grade {selectedStudent.grade || "—"} · Age{" "}
                {selectedStudent.age || "—"}
              </p>
            </div>
            <div className="iep-view-actions">
              <button className="btn btn-back" onClick={openEdit}>
                EDIT IEP
              </button>
              <button
                className="btn iep-btn-danger"
                onClick={() => setDeleteTarget(selectedIep)}
              >
                DELETE IEP
              </button>
            </div>
          </div>

          <div className="iep-view-meta">
            <p>
              <strong>Version:</strong> {selectedIep.version || "—"}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {selectedIep.formattedDate || "Date unavailable"}
            </p>
          </div>

          {/* Inline edit panel */}
          {isEditing && (
            <div className="iep-edit-panel">
              <h3>
                Edit Section B: Difficulties, Barriers, and Enabling Supports
              </h3>
              <div className="iep-table-wrap">
                <table className="iep-table">
                  <thead>
                    <tr>
                      <th>Difficulty</th>
                      <th>Learning Barriers</th>
                      <th>Learning Facilitators</th>
                      <th>Accommodation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editBarrierRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <input
                            value={row.difficulty}
                            className="form-input"
                            placeholder="Type difficulty"
                            onChange={(e) =>
                              updateEditRow(i, "difficulty", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={row.barrierQualifier}
                            className="form-select"
                            onChange={(e) =>
                              updateEditRow(
                                i,
                                "barrierQualifier",
                                e.target.value,
                              )
                            }
                          >
                            {barrierQualifierOptions.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            value={row.facilitator}
                            rows={3}
                            placeholder="Type facilitator/s"
                            className="form-textarea iep-small-textarea"
                            onChange={(e) =>
                              updateEditRow(i, "facilitator", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <textarea
                            value={row.accommodation}
                            rows={3}
                            placeholder="Type accommodation/s"
                            className="form-textarea iep-small-textarea"
                            onChange={(e) =>
                              updateEditRow(i, "accommodation", e.target.value)
                            }
                          />
                        </td>
                        <td className="iep-action-cell">
                          <button
                            type="button"
                            className="iep-link-danger"
                            onClick={() => removeEditRow(i)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn btn-back iep-add-row"
                onClick={addEditRow}
              >
                + ADD ROW
              </button>
              <h3 style={{ marginTop: 22 }}>Edit Section C: Learner's Goals</h3>
              <div className="iep-edit-goals-list">
                {editGoals.map((goal, goalIndex) => (
                  <div className="iep-edit-goal-card" key={goal.goalID || goalIndex}>
                    <div className="iep-edit-goal-header">
                      <div className="form-group">
                        <label className="form-label">Skill / Goal Area</label>
                        <input
                          className="form-input"
                          value={goal.type}
                          placeholder="Example: Communication Skills"
                          onChange={(e) =>
                            updateEditGoal(goalIndex, "type", e.target.value)
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="iep-link-danger"
                        onClick={() => removeEditGoal(goalIndex)}
                      >
                        Remove Skill
                      </button>
                    </div>
                    <TextAreaField
                      label="Annual Goal / Long Term"
                      value={goal.annualGoal}
                      rows={3}
                      placeholder="Write the annual learner goal."
                      onChange={(e) =>
                        updateEditGoal(goalIndex, "annualGoal", e.target.value)
                      }
                    />
                    <div className="iep-table-wrap">
                      <table className="iep-table iep-edit-goal-table">
                        <thead>
                          <tr>
                            <th>Enroute Objectives / Procedure</th>
                            <th>Interventions / Activities / Procedure</th>
                            <th>Timeline / Session</th>
                            <th>Individuals Responsible</th>
                            <th>Progress / Instructional Evaluation</th>
                            <th>Remarks</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(goal.rows || []).map((row, rowIndex) => (
                            <tr key={row.rowID || rowIndex}>
                              {[
                                ["objective", "Objective"],
                                ["interventions", "Intervention"],
                                ["timeline", "Timeline"],
                                ["responsible", "Responsible"],
                                ["evaluation", "Evaluation"],
                                ["remarks", "Remarks"],
                              ].map(([field, placeholder]) => (
                                <td key={field}>
                                  <textarea
                                    className="form-textarea iep-small-textarea"
                                    rows={3}
                                    value={row[field] || ""}
                                    placeholder={placeholder}
                                    onChange={(e) =>
                                      updateEditGoalRow(
                                        goalIndex,
                                        rowIndex,
                                        field,
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                              ))}
                              <td className="iep-action-cell">
                                <button
                                  type="button"
                                  className="iep-link-danger"
                                  onClick={() =>
                                    removeEditGoalRow(goalIndex, rowIndex)
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      className="btn btn-back iep-add-row"
                      onClick={() => addEditGoalRow(goalIndex)}
                    >
                      + ADD OBJECTIVE ROW
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-back iep-add-row"
                onClick={addEditGoal}
              >
                + ADD SKILL
              </button>

              <div className="iep-edit-actions">
                <button
                  type="button"
                  className="btn btn-back"
                  onClick={() => setIsEditing(false)}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="btn btn-submit"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? "SAVING…" : "SAVE CHANGES"}
                </button>
              </div>
            </div>
          )}

          {/* Section B read-only */}
          <div>
            <h3 className="iep-view-section-title">
              Section B: Difficulties, Barriers, and Enabling Supports
            </h3>
            <div className="iep-table-wrap">
              <table className="iep-table">
                <thead>
                  <tr>
                    <th>Difficulty</th>
                    <th>Learning Barriers</th>
                    <th>Learning Facilitators</th>
                    <th>Accommodation</th>
                  </tr>
                </thead>
                <tbody>
                  {barrierRowsToRender.length ? (
                    barrierRowsToRender.map((row, i) => (
                      <tr key={i}>
                        <td className="iep-readonly-cell">
                          {row.difficulty || "—"}
                        </td>
                        <td className="iep-readonly-cell">
                          {row.barrierQualifier || "—"}
                        </td>
                        <td className="iep-readonly-cell">
                          {row.facilitator || "—"}
                        </td>
                        <td className="iep-readonly-cell">
                          {row.accommodation || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="iep-readonly-cell"
                        style={{ textAlign: "center", color: "#999" }}
                      >
                        No Section B details available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(details?.generatedAccommodations || selectedIep.accommodations) && (
              <InfoBlock title="AI-Generated Accommodations / Resources">
                {details?.generatedAccommodations || selectedIep.accommodations}
              </InfoBlock>
            )}
          </div>

          {/* Section C: goals from DB */}
          <div>
            <h3 className="iep-view-section-title">
              Section C: Learner's Goals
            </h3>
            {loadingGoals ? (
              <p className="iep-muted">Loading learner goals…</p>
            ) : goalsToRender.length ? (
              goalsToRender.map((goal, idx) => (
                <div key={goal.type || idx} className="iep-goal-preview">
                  <InfoBlock title={`${goal.type} — Annual Goal / Long Term`}>
                    {goal.annualGoal}
                  </InfoBlock>
                  <ReadOnlyGoalTable rows={goal.rows} />
                </div>
              ))
            ) : (
              <div className="iep-empty-state compact">
                <div>🎯</div>
                <strong>No goals recorded yet</strong>
                <span>
                  Goals are generated by the AI when you create an IEP. They
                  will appear here once saved.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="ts-modal-overlay">
          <div className="ts-modal">
            <div className="ts-modal-icon">🗑️</div>
            <p className="ts-modal-title">Delete IEP?</p>
            <p className="ts-modal-body">
              You're about to permanently delete <strong>IEP Version {deleteTarget.version || "—"}</strong>. This action cannot be undone.
            </p>
            <div className="ts-modal-actions">
              <button
                className="ts-btn ts-btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingIep}
              >
                Cancel
              </button>
              <button
                className="ts-btn ts-btn-danger-solid"
                onClick={confirmDeleteSelectedIep}
                disabled={deletingIep}
              >
                {deletingIep ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generate IEP Page ────────────────────────────────────────────────────────

export default function IEPGenerationPage({ mode = "generate" }) {
  const activeView = mode;

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("neuropath_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const currentUserId =
    currentUser?.id || currentUser?.user_id || currentUser?.teacherID || null;

  const [step, setStep] = useState(1); // 1 = Section B, 2 = Section C + generate
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ieps, setIeps] = useState([]);
  const [selectedIep, setSelectedIep] = useState(null);
  const [activeGeneratedIepId, setActiveGeneratedIepId] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingIeps, setLoadingIeps] = useState(false);
  const [viewError, setViewError] = useState("");

  // Section C
  const [selectedGoalCategory, setSelectedGoalCategory] = useState("");
  const [teacherPrompt, setTeacherPrompt] = useState("");
  const [generatedAccommodations, setGeneratedAccommodations] = useState(
    defaultGeneratedAccommodations,
  );

  // Generation result
  const [generatingFinalIep, setGeneratingFinalIep] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalSaveStatus, setGoalSaveStatus] = useState(""); // "" | "saving" | "saved" | "error"
  const [aiGeneratedGoals, setAiGeneratedGoals] = useState([]);
  const [generationDone, setGenerationDone] = useState(false);
  const resultRef = useRef(null);

  const [form, setForm] = useState({
    school: "",
    schoolYear: "",
    learnerName: "",
    birthdate: "",
    disabilityCategory: "Autism Spectrum Disorder",
    diagnosisDetails: "",
    difficultyMarkers: [],
    presentEvaluation: "",
    academicStrengths: "",
    academicNeeds: "",
    parentalConcerns: "",
    curriculumImpact: "",
    specialFactorNotes: "",
    assistiveTechnologies: [],
    barrierRows: [
      {
        difficulty: "",
        barrierQualifier: "Moderate barrier",
        facilitator: "",
        accommodation: "",
      },
    ],
  });

  const availableGoalTypes = useMemo(
    () => getGoalTypesForGrade(selectedStudent?.grade),
    [selectedStudent],
  );

  // Reset state when switching tabs
  useEffect(() => {
    setSearchTerm("");
    setSelectedStudent(null);
    setIeps([]);
    setSelectedIep(null);
    setViewError("");
  }, [activeView]);

  // Load students
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!currentUserId) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const data = await studentsAPI.list(currentUserId);
        const list = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        if (mounted) setStudents(list);
      } catch (err) {
        if (mounted) {
          setStudents([]);
          setViewError(err.message || "Unable to load student records.");
        }
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  // Load IEPs when student changes
  useEffect(() => {
    let mounted = true;
    async function load() {
      const sid = getStudentId(selectedStudent);
      if (!sid || !currentUserId) {
        setIeps([]);
        setSelectedIep(null);
        return;
      }
      setLoadingIeps(true);
      setViewError("");
      try {
        const data = await iepAPI.listByStudent(sid, currentUserId);
        const list = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        if (mounted) {
          setIeps(list);
          setSelectedIep(list[0] || null);
        }
      } catch (err) {
        if (mounted) {
          setIeps([]);
          setSelectedIep(null);
          setViewError(err.message || "Unable to load IEP records.");
        }
      } finally {
        if (mounted) setLoadingIeps(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedStudent, currentUserId]);

  // Pre-fill form from student profile
  useEffect(() => {
    if (activeView !== "generate" || !selectedStudent) return;
    const p = getStudentProfileDetails(selectedStudent);
    const profileDifficulties = getStudentProfileDifficulties(selectedStudent);

    setForm((prev) => ({
      ...prev,
      school: p.school || prev.school,
      schoolYear: p.schoolYear || prev.schoolYear,
      learnerName:
        p.studentName ||
        p.learnerName ||
        getStudentName(selectedStudent) ||
        prev.learnerName,
      birthdate: p.birthdate || prev.birthdate,
      disabilityCategory:
        p.disabilityCategory ||
        selectedStudent.diagnosis ||
        prev.disabilityCategory,
      diagnosisDetails:
        p.diagnosisDetails ||
        selectedStudent.asdBackground ||
        selectedStudent.diagnosis ||
        prev.diagnosisDetails,
      presentEvaluation:
        p.presentEvaluation ||
        selectedStudent.assessmentResult ||
        prev.presentEvaluation,
      academicStrengths: p.academicStrengths || prev.academicStrengths,
      academicNeeds:
        p.academicNeeds || selectedStudent.support_needs || prev.academicNeeds,
      parentalConcerns: p.parentalConcerns || prev.parentalConcerns,
      curriculumImpact: p.curriculumImpact || prev.curriculumImpact,
      // Difficulties must come from the saved student profile only.
      // Teachers can adjust barriers, facilitators, and accommodations here,
      // but the difficulty labels themselves stay locked to the profile.
      difficultyMarkers: profileDifficulties,
      barrierRows: buildProfileBarrierRows(profileDifficulties, prev.barrierRows),
    }));
    // Reset generation state on student switch
    setGenerationDone(false);
    setAiGeneratedGoals([]);
    setGoalSaveStatus("");
    setActiveGeneratedIepId(null);
    setTeacherPrompt("");
    setSelectedGoalCategory("");
    setGeneratedAccommodations("");
    setStep(1);
  }, [activeView, selectedStudent]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => getStudentName(s).toLowerCase().includes(q))
      .slice(0, 6);
  }, [students, searchTerm]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const addDifficultyRow = () =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: [...prev.difficultyMarkers, ""],
    }));
  const updateDifficultyRow = (i, v) =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.map((x, idx) =>
        idx === i ? v : x,
      ),
    }));
  const removeDifficultyRow = (i) =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.filter((_, idx) => idx !== i),
    }));

  const addAssistiveTechRow = () =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: [...prev.assistiveTechnologies, ""],
    }));
  const updateAssistiveTechRow = (i, v) =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: prev.assistiveTechnologies.map((x, idx) =>
        idx === i ? v : x,
      ),
    }));
  const removeAssistiveTechRow = (i) =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: prev.assistiveTechnologies.filter(
        (_, idx) => idx !== i,
      ),
    }));

  const updateBarrierRow = (i, field, value) =>
    setForm((prev) => ({
      ...prev,
      barrierRows: prev.barrierRows.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row,
      ),
    }));
  const addBarrierRow = () =>
    setForm((prev) => ({
      ...prev,
      barrierRows: [
        ...prev.barrierRows,
        {
          difficulty: "",
          barrierQualifier: "Moderate barrier",
          facilitator: "",
          accommodation: "",
        },
      ],
    }));
  const removeBarrierRow = (i) =>
    setForm((prev) => ({
      ...prev,
      barrierRows: prev.barrierRows.filter((_, idx) => idx !== i),
    }));

  // ── Accommodation builder ─────────────────────────────────────────────────

  const buildGeneratedAccommodations = () => {
    const difficulties =
      form.barrierRows
        .map((r) => r.difficulty)
        .filter(Boolean)
        .join(", ") || "the identified learner difficulties";
    const supports =
      form.assistiveTechnologies.join(", ") ||
      "appropriate visual and classroom supports";
    const goalLabel = selectedGoalCategory || "selected learner goal areas";
    return `Based on ${difficulties} and the selected goal areas (${goalLabel}), AI recommends structured routines, shortened tasks, visual prompts, positive reinforcement, sensory or movement breaks when needed, and assistive supports such as ${supports}. The teacher may adjust these accommodations based on actual classroom observation and learner performance.`;
  };

  // ── Generate Final IEP ────────────────────────────────────────────────────

  const handleGenerateFinalIep = async () => {
    if (!getStudentId(selectedStudent)) {
      alert("Please select a student first.");
      return;
    }
    if (!selectedGoalCategory) {
      alert("Please select a learner goal area.");
      return;
    }
    if (form.barrierRows.every((r) => !r.difficulty.trim())) {
      alert(
        "No difficulties were found in this student profile. Please update the student profile difficulties first before generating an IEP.",
      );
      return;
    }

    setGeneratingFinalIep(true);
    setGenerationDone(false);
    setAiGeneratedGoals([]);
    setGoalSaveStatus("");

    // Step 1: Save the IEP document once for this generation session.
    // Additional generated goals for the same student/session are appended to
    // the same IEP version instead of creating another version.
    let savedIepId = activeGeneratedIepId;
    try {
      const accommodationText = buildGeneratedAccommodations();
      setGeneratedAccommodations(accommodationText);

      const baselineText = [
        `Student: ${form.learnerName || getStudentName(selectedStudent) || ""}`,
        `Diagnosis: ${form.disabilityCategory || ""}`,
        `Assessment / Diagnosis Details: ${form.diagnosisDetails || ""}`,
        `Present Evaluation: ${form.presentEvaluation || ""}`,
        `Academic Strengths: ${form.academicStrengths || ""}`,
        `Academic Needs: ${form.academicNeeds || ""}`,
        `Parental Concerns: ${form.parentalConcerns || ""}`,
        `Curriculum Impact: ${form.curriculumImpact || ""}`,
      ].join("\n");

      const special_factors_considerations = form.barrierRows
        .filter((r) => r.difficulty.trim())
        .map((row, i) => ({
          difficulty: row.difficulty,
          assistive_technology:
            form.assistiveTechnologies[i] ||
            form.assistiveTechnologies[0] ||
            "",
        }));

      if (!savedIepId) {
        const saved = await iepAPI.save({
          studentID: getStudentId(selectedStudent),
          teacherID: currentUserId,
          baselineData: baselineText,
          goals: "",
          accommodations: accommodationText,
          generatedDetails: {
            ...form,
            generatedAccommodations: accommodationText,
            special_factors_considerations,
          },
          difficulties: form.barrierRows.map((r) => r.difficulty).join("\n"),
          learning_barriers: form.barrierRows
            .map((r) => r.barrierQualifier)
            .join("\n"),
          learning_facilitators: form.barrierRows
            .map((r) => r.facilitator)
            .join("\n"),
          learning_accommodations: form.barrierRows
            .map((r) => r.accommodation)
            .join("\n"),
        });

        const savedData = saved?.data || saved;
        savedIepId = savedData?.iepID;
        setActiveGeneratedIepId(savedIepId);
        if (
          String(savedData?.studentID) === String(getStudentId(selectedStudent))
        ) {
          setIeps((prev) => [savedData, ...prev]);
        }
        setSelectedIep(savedData);
      } else {
        await iepAPI.update(savedIepId, {
          baselineData: baselineText,
          accommodations: accommodationText,
          generatedDetails: {
            ...form,
            generatedAccommodations: accommodationText,
            special_factors_considerations,
          },
          difficulties: form.barrierRows.map((r) => r.difficulty).join("\n"),
          learning_barriers: form.barrierRows
            .map((r) => r.barrierQualifier)
            .join("\n"),
          learning_facilitators: form.barrierRows
            .map((r) => r.facilitator)
            .join("\n"),
          learning_accommodations: form.barrierRows
            .map((r) => r.accommodation)
            .join("\n"),
        });
      }
    } catch (err) {
      alert("Failed to save IEP document: " + (err.message || "Unknown error"));
      setGeneratingFinalIep(false);
      return;
    }

    // Step 2: Generate AI goals
    try {
      const special_factors_considerations = form.barrierRows
        .filter((r) => r.difficulty.trim())
        .map((row, i) => ({
          difficulty: row.difficulty,
          assistive_technology:
            form.assistiveTechnologies[i] ||
            form.assistiveTechnologies[0] ||
            "",
        }));

      const result = await iepAPI.generateGoalsFromIep({
        iep_id: savedIepId,
        student_name: form.learnerName || getStudentName(selectedStudent) || "",
        goal_area: selectedGoalCategory,
        teacher_prompt: teacherPrompt,
        accommodations: form.barrierRows
          .map((r) => r.accommodation)
          .join(" | "),
        difficulties: form.barrierRows.map((r) => r.difficulty).join(" | "),
        learning_barriers: form.barrierRows
          .map((r) => r.barrierQualifier)
          .join(" | "),
        barrier_qualifiers: form.barrierRows
          .map((r) => r.barrierQualifier)
          .join(", "),
        learning_facilitators: form.barrierRows
          .map((r) => r.facilitator)
          .join(" | "),
        facilitator_qualifiers: form.barrierRows
          .map((r) => r.facilitator)
          .join(", "),
        generatedDetails: { special_factors_considerations },
      });

      const goals = result?.goals || [];
      setAiGeneratedGoals(goals);
      setGenerationDone(true);

      // Step 3: Auto-save each goal to /api/iep/goals/
      if (goals.length > 0) {
        setSavingGoals(true);
        setGoalSaveStatus("saving");
        let allSaved = true;
        for (const goal of goals) {
          try {
            const {
              _rgori_score,
              _rgori_feedback,
              _attempts,
              _rgori_warning,
              ...goalPayload
            } = goal;
            await iepAPI.saveGoal({
              ...goalPayload,
              iep: savedIepId,
              goalName:
                goalPayload.goalName || goalPayload.subject_category || "Goal",
              target_metric:
                goalPayload.target_metric || "Standard IEP Metric",
            });
          } catch {
            allSaved = false;
          }
        }
        setGoalSaveStatus(allSaved ? "saved" : "error");
        setSavingGoals(false);
      }

      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        200,
      );
    } catch (err) {
      alert("Failed to generate AI goals: " + (err.message || "Unknown error"));
      setGenerationDone(false);
    } finally {
      setGeneratingFinalIep(false);
    }
  };

  // ── IEP CRUD ──────────────────────────────────────────────────────────────

  const handleUpdateIep = async (iep, payload) => {
    try {
      let generatedDetails = payload.generatedDetails;
      if (typeof generatedDetails === "string") {
        try {
          generatedDetails = JSON.parse(generatedDetails);
        } catch {}
      }
      const updated = await iepAPI.update(iep.iepID, {
        baselineData: payload.baselineData,
        goals: payload.goals,
        accommodations: payload.accommodations,
        generatedDetails,
        ...(payload.difficulties !== undefined && {
          difficulties: payload.difficulties,
          learning_barriers: payload.learning_barriers,
          learning_facilitators: payload.learning_facilitators,
          learning_accommodations: payload.learning_accommodations,
        }),
      });
      const merged = { ...iep, ...updated, ...payload, generatedDetails };
      setIeps((prev) =>
        prev.map((item) => (item.iepID === iep.iepID ? merged : item)),
      );
      setSelectedIep(merged);
      setViewError("");
    } catch (err) {
      setViewError(err.message || "Unable to update IEP record.");
      throw err;
    }
  };

  const handleDeleteIep = async (iep) => {
    try {
      await iepAPI.delete(iep.iepID);
      setIeps((prev) => {
        const remaining = prev.filter((item) => item.iepID !== iep.iepID);
        setSelectedIep(remaining[0] || null);
        return remaining;
      });
      if (activeGeneratedIepId === iep.iepID) setActiveGeneratedIepId(null);
      setViewError("");
    } catch (err) {
      setViewError(err.message || "Unable to delete IEP record.");
      throw err;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <div className="iep-page-header">
        <h1>AI-Based IEP Generation</h1>
        <p>
          {activeView === "generate"
            ? "Generate a new individualized education plan using the standard IEP format."
            : "Search and view saved student IEP records."}
        </p>
      </div>

      {activeView === "generate" ? (
        <div className="form-card iep-card">
          {/* Step indicator */}
          <div className="iep-step-header">
            <div>
              <span>Generate IEP</span>
              <strong>Step {step} of 2</strong>
            </div>
            <div className="iep-progress">
              {[1, 2].map((n) => (
                <i key={n} className={n <= step ? "active" : ""} />
              ))}
            </div>
          </div>

          {/* Student search */}
          <section className="form-section">
            <SectionHeader
              title="Select Student"
              subtitle="Search and select the student profile first. The form will pre-fill from the saved student profile."
            />
            <div className="iep-view-controls">
              <StudentSearchBox
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedStudent={selectedStudent}
                onSelect={(student) => {
                  setSelectedStudent(student);
                  setGenerationDone(false);
                  setAiGeneratedGoals([]);
                  setGoalSaveStatus("");
                  setSelectedGoalCategory("");
                  setTeacherPrompt("");
                  setGeneratedAccommodations("");
                  setActiveGeneratedIepId(null);
                  setStep(1);
                }}
                filteredStudents={filteredStudents}
                loadingStudents={loadingStudents}
              />
              <div className="iep-selected-student-card">
                <span>Selected Student</span>
                <strong>
                  {getStudentName(selectedStudent) || "No student selected"}
                </strong>
                <small>
                  {selectedStudent
                    ? `Grade ${selectedStudent.grade || "—"} · Age ${selectedStudent.age || "—"}`
                    : "Choose a student before continuing."}
                </small>
              </div>
            </div>
          </section>

          {!selectedStudent ? (
            <div className="iep-empty-state compact">
              <div>⌕</div>
              <strong>Select a student to start Generate IEP</strong>
              <span>
                Search a student above to load their profile and begin filling
                out the IEP form.
              </span>
            </div>
          ) : (
            <>
              {/* ── Step 1: Section B ── */}
              {step === 1 && (
                <section className="form-section">
                  <SectionHeader
                    title="Considerations of Special Factors"
                    subtitle="Indicate all difficulties and assistive technology or devices needed."
                  />
                  <div className="form-two-col-sections">
                    <div>
                      <h3 className="iep-small-title">Difficulties</h3>
                      <p className="iep-muted">
                        Loaded from the saved student profile. Update the student
                        profile if these difficulties need to change.
                      </p>
                      <div className="iep-input-row-list">
                        {form.difficultyMarkers.length ? (
                          form.difficultyMarkers.map((item, i) => (
                            <div key={i} className="iep-input-row-item">
                              <input
                                className="form-input"
                                value={item}
                                placeholder={`Difficulty ${i + 1}`}
                                readOnly
                                aria-readonly="true"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="iep-muted">
                            No difficulties found in this student profile.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="iep-small-title">
                        Assistive Technologies Needed
                      </h3>
                      <div className="iep-input-row-list">
                        {form.assistiveTechnologies.map((item, i) => (
                          <div key={i} className="iep-input-row-item">
                            <input
                              className="form-input"
                              value={item}
                              placeholder={`Technology ${i + 1}`}
                              onChange={(e) =>
                                updateAssistiveTechRow(i, e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="iep-link-danger"
                              onClick={() => removeAssistiveTechRow(i)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-back iep-add-row-inline"
                          onClick={addAssistiveTechRow}
                        >
                          + Add Row
                        </button>
                      </div>
                    </div>
                  </div>

                  <TextAreaField
                    label="Other special factor notes"
                    placeholder="Add notes about behavior, communication, sensory, or other special factors."
                    value={form.specialFactorNotes}
                    onChange={setField("specialFactorNotes")}
                    rows={3}
                  />

                  <SectionHeader
                    title="Section B: Difficulties, Barriers, and Enabling Supports"
                    subtitle="Difficulties are loaded from the saved student profile and cannot be edited here. Identify barriers, facilitators, and accommodations for each entry."
                  />
                  <div className="iep-table-wrap">
                    <table className="iep-table">
                      <thead>
                        <tr>
                          <th>Difficulty</th>
                          <th>Learning Barriers</th>
                          <th>Learning Facilitators</th>
                          <th>Accommodation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.barrierRows.length === 0 && (
                          <tr>
                            <td colSpan={4} className="iep-muted">
                              No difficulties found in this student profile.
                            </td>
                          </tr>
                        )}
                        {form.barrierRows.map((row, i) => (
                          <tr key={i}>
                            <td>
                              <input
                                value={row.difficulty}
                                className="form-input"
                                placeholder="Difficulty from profile"
                                readOnly
                                aria-readonly="true"
                              />
                            </td>
                            <td>
                              <select
                                value={row.barrierQualifier}
                                className="form-select"
                                onChange={(e) =>
                                  updateBarrierRow(
                                    i,
                                    "barrierQualifier",
                                    e.target.value,
                                  )
                                }
                              >
                                {barrierQualifierOptions.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <textarea
                                value={row.facilitator}
                                rows={3}
                                placeholder="Type facilitator/s"
                                className="form-textarea iep-small-textarea"
                                onChange={(e) =>
                                  updateBarrierRow(
                                    i,
                                    "facilitator",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <textarea
                                value={row.accommodation}
                                rows={3}
                                placeholder="Type accommodation/s"
                                className="form-textarea iep-small-textarea"
                                onChange={(e) =>
                                  updateBarrierRow(
                                    i,
                                    "accommodation",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {generatedAccommodations && (
                    <InfoBlock title="AI-Generated Accommodations / Resources">
                      {generatedAccommodations}
                    </InfoBlock>
                  )}
                </section>
              )}

              {/* ── Step 2: Section C + Generate ── */}
              {step === 2 && (
                <section className="form-section">
                  <SectionHeader
                    title="Section C: Learner's Goals"
                    subtitle="Select one goal area. The AI will generate the actual goals and objectives when you click Generate Final IEP."
                  />

                  <div className="iep-ai-goal-toolbar multi">
                    <div className="form-group">
                      <label className="form-label">Goal Area:</label>
                      <select
                        className="form-select"
                        value={selectedGoalCategory}
                        onChange={(e) => {
                          setSelectedGoalCategory(e.target.value);
                          setTeacherPrompt("");
                          setGeneratedAccommodations("");
                          setGoalSaveStatus("");
                          setGenerationDone(false);
                          setAiGeneratedGoals([]);
                        }}
                      >
                        <option value="">Select a goal area</option>
                        {availableGoalTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!selectedGoalCategory ? (
                    <div className="iep-empty-state compact">
                      <div>🤖</div>
                      <strong>No learner goal area selected yet</strong>
                      <span>
                        Select a goal area above. The AI will generate learner
                        goals and objectives when you click Generate Final IEP.
                      </span>
                    </div>
                  ) : (
                    <div className="iep-selected-goal-summary">
                      <p className="iep-muted">
                        <strong style={{ color: "#333" }}>
                          {selectedGoalCategory}
                        </strong>{" "}
                        selected. This will be sent to the AI when you click
                        Generate Final IEP.
                      </p>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: "1.25rem" }}>
                    <label className="form-label">
                      Describe what you want the AI to focus on when generating
                      this student's IEP goals.
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      value={teacherPrompt}
                      onChange={(e) => setTeacherPrompt(e.target.value)}
                      placeholder={
                        "Provide any additional context or specific instructions to help the AI generate a high-quality IEP.\n\nExample: Focus on improving the learner's ability to initiate verbal requests during snack time. The student responds well to visual prompts and 1:1 adult support."
                      }
                    />
                    <p
                      className="iep-muted"
                      style={{ marginTop: "0.35rem", fontSize: "0.78rem" }}
                    >
                      The more specific you are, the better the AI can tailor
                      the goals to this learner.
                    </p>
                  </div>

                  <div className="iep-final-generate">
                    <button
                      type="button"
                      className="btn btn-submit"
                      onClick={handleGenerateFinalIep}
                      disabled={generatingFinalIep || savingGoals}
                    >
                      {generatingFinalIep
                        ? "GENERATING..."
                        : savingGoals
                          ? "SAVING GOALS..."
                          : "GENERATE FINAL IEP"}
                    </button>
                  </div>

                  {/* ── Result panel ── */}
                  {generationDone && (
                    <div ref={resultRef} className="iep-generation-result">
                      <div className="iep-result-banner">
                        <span className="iep-result-icon">✅</span>
                        <div>
                          <strong>IEP Generated Successfully!</strong>
                          <p>
                            The IEP has been saved and the AI goals are
                            displayed below. You can view or edit the full
                            record on the View IEP page.
                          </p>
                        </div>
                      </div>

                      {goalSaveStatus === "saving" && (
                        <p className="iep-muted" style={{ marginBottom: 12 }}>
                          💾 Saving goals to IEP record...
                        </p>
                      )}
                      {goalSaveStatus === "saved" && (
                        <p className="iep-save-ok">
                          ✅ All goals saved successfully to the IEP.
                        </p>
                      )}
                      {goalSaveStatus === "error" && (
                        <p className="iep-save-error">
                          ⚠ Some goals could not be saved. Please try again.
                        </p>
                      )}

                      {aiGeneratedGoals.length > 0 ? (
                        <>
                          <h3
                            className="iep-view-section-title"
                            style={{ marginTop: 18 }}
                          >
                            AI-Generated Goals
                          </h3>
                          {aiGeneratedGoals.map((goal, idx) => (
                            <div key={idx} className="iep-goal-preview">
                              <div className="iep-info-block">
                                <h3>{goal.subject_category} — Annual Goal</h3>
                                <p
                                  style={{
                                    margin: "4px 0 8px",
                                    color: "#444",
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {goal.annual_goal}
                                </p>
                                <small
                                  style={{ color: "#888", fontSize: 11.5 }}
                                >
                                  R-GORI Score: {goal._rgori_score}/100 ·{" "}
                                  {goal._rgori_feedback}
                                  {goal._rgori_warning && (
                                    <span style={{ color: "orange" }}>
                                      {" "}
                                      ⚠ {goal._rgori_warning}
                                    </span>
                                  )}
                                </small>
                              </div>
                              <ReadOnlyGoalTable
                                rows={(goal.objective_rows || []).map(
                                  (row, i) => ({
                                    id: i,
                                    objective: row.enroute_objectives,
                                    interventions: row.interventions_procedures,
                                    timeline: row.timeline_mins_session,
                                    responsible: row.individuals_responsible,
                                    evaluation: row.progress_instructional,
                                    remarks: row.remarks,
                                  }),
                                )}
                              />
                            </div>
                          ))}
                        </>
                      ) : (
                        <div
                          className="iep-info-block"
                          style={{ marginTop: 14 }}
                        >
                          <h3>IEP Saved</h3>
                          <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
                            No goal details were returned by the AI. The IEP
                            document has been saved — you can view it on the
                            View IEP page.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Step navigation */}
              <div className="form-actions">
                {step > 1 ? (
                  <button
                    type="button"
                    className="btn btn-back"
                    onClick={() => setStep(step - 1)}
                  >
                    BACK
                  </button>
                ) : (
                  <div />
                )}
                {step < 2 && (
                  <button
                    type="button"
                    className="btn btn-submit"
                    onClick={() => setStep(step + 1)}
                  >
                    NEXT
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <ViewIEPPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          filteredStudents={filteredStudents}
          loadingStudents={loadingStudents}
          ieps={ieps}
          selectedIep={selectedIep}
          setSelectedIep={setSelectedIep}
          loadingIeps={loadingIeps}
          viewError={viewError}
          onDeleteIep={handleDeleteIep}
          onUpdateIep={handleUpdateIep}
        />
      )}
    </div>
  );
}
