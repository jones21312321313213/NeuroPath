import { useEffect, useMemo, useState } from "react";
import { iepAPI, studentsAPI } from "../api/client";

const difficultyOptions = [
  "Difficulty in Seeing",
  "Difficulty in Hearing",
  "Difficulty in Communicating",
  "Difficulty in Moving/Walking",
  "Difficulty in Concentrating/Paying Attention",
  "Difficulty in Remembering/Understanding",
  "With Medical Assessment/Diagnosis",
];

const assistiveTechnologyOptions = [
  "Picture Exchange Communication System (PECS)",
  "Visual Boards",
  "Visual communication books",
  "AAC device",
  "Tablet",
  "Visual schedule",
  "Digital task board apps",
  "Routine reminder devices",
];

const barrierQualifierOptions = [
  "No barrier",
  "Mild barrier",
  "Moderate barrier",
  "Severe barrier",
  "Severe barrier 5 and beyond",
];

const defaultGoalTypes = [
  "Care Skills",
  "Mathematical Skills",
  "Communication Skills",
  "Social / Interpersonal Skills",
  "Behavioral Skills",
  "Functional Academic Skills",
];

function getGoalTypesForGrade(grade) {
  const numericGrade = Number(grade);

  if (Number.isNaN(numericGrade)) return defaultGoalTypes;

  if (numericGrade <= 2) {
    return [
      "Care Skills",
      "Communication Skills",
      "Social / Interpersonal Skills",
      "Behavioral Skills",
      "Mathematical Skills",
    ];
  }

  if (numericGrade <= 6) {
    return [
      "Mathematical Skills",
      "Functional Academic Skills",
      "Communication Skills",
      "Social / Interpersonal Skills",
      "Behavioral Skills",
    ];
  }

  return [
    "Functional Academic Skills",
    "Communication Skills",
    "Social / Interpersonal Skills",
    "Behavioral Skills",
    "Mathematical Skills",
  ];
}

const goalTemplates = {
  "Care Skills": {
    annualGoal:
      "At the end of the year, the learner can demonstrate understanding of basic concepts in daily self-care routines, including identifying, selecting, and managing personal belongings with visual supports and minimal adult assistance.",
    rows: [
      {
        id: "care-1",
        objective:
          "Name and familiarize common self-care tools used in washing hands, such as water, soap, towel, and basin.",
        interventions:
          "Mother Tongue / Verbal\n• Demonstrate hand washing using step-by-step visual support.\n• Distinguish items needed in handwashing and toileting.",
        timeline:
          "Whole year round\n15 to 20 minutes every day based on learner’s ability",
        responsible: "SPED Teacher\nParents\nGuardian",
        evaluation:
          "Able to perform hand washing properly.\nCan identify or recognize things used in hand washing and toileting.",
        remarks: "Handwriting based on actual learning",
      },
    ],
  },
  "Mathematical Skills": {
    annualGoal:
      "At the end of the year, the learner can be able to count the numbers.",
    rows: [
      {
        id: "math-1",
        objective: "Recognize numbers from 0-10.",
        interventions:
          "Mother Tongue\nFamiliarize numbers or figures from 1-10 based on learner’s ability.",
        timeline: "1 week\n15-20 minutes every day based on learner’s ability",
        responsible: "SPED Teacher\nParents\nGuardians",
        evaluation: "Identify numbers from 0-10.",
        remarks: "",
      },
      {
        id: "math-2",
        objective:
          "Counting objects with one-to-one correspondence up to quantity of 10.",
        interventions:
          "Mother Tongue\nVisual count using real object counters 1-10 based on learner’s ability.",
        timeline: "2 weeks\n15-20 minutes every day based on learner’s ability",
        responsible: "SPED Teacher\nParents\nGuardians",
        evaluation: "Able to count visually objects from 0-10.",
        remarks: "",
      },
      {
        id: "math-3",
        objective:
          "Read/trace and write numbers up to 10 in symbols and words.",
        interventions:
          "Mother Tongue\nName, write, and trace numbers up to 10 in symbols and words based on learner’s ability.",
        timeline: "3 weeks\n15-20 minutes every day based on learner’s ability",
        responsible: "SPED Teacher\nParents\nGuardians",
        evaluation: "Able to write numbers from 1-10 in figure and in words.",
        remarks: "",
      },
    ],
  },
  "Communication Skills": {
    annualGoal:
      "At the end of the year, the learner can use appropriate communication methods to express basic needs, choices, and responses with visual or verbal prompts.",
    rows: [
      {
        id: "comm-1",
        objective:
          "Use picture cards, gestures, or simple words to request preferred items or activities.",
        interventions:
          "Use PECS, visual choice boards, modeling, and guided practice during classroom routines.",
        timeline: "4 weeks\nShort and frequent sessions",
        responsible: "SPED Teacher\nParents\nSpeech Therapist",
        evaluation: "Can request preferred items with reduced prompts.",
        remarks: "",
      },
    ],
  },
  "Social / Interpersonal Skills": {
    annualGoal:
      "At the end of the year, the learner can participate in simple peer interactions and classroom routines with adult guidance and positive reinforcement.",
    rows: [
      {
        id: "social-1",
        objective:
          "Engage in a cooperative play or turn-taking activity with at least one peer.",
        interventions:
          "Use structured play, visual rules, social stories, modeling, and positive reinforcement.",
        timeline: "6 weeks\n10 to 15 minutes per session",
        responsible: "SPED Teacher\nParents\nGuardian",
        evaluation: "Participates in cooperative play for at least 5 minutes.",
        remarks: "",
      },
    ],
  },
  "Behavioral Skills": {
    annualGoal:
      "At the end of the year, the learner can follow classroom routines and manage attention or behavior using visual supports, sensory breaks, and reinforcement strategies.",
    rows: [
      {
        id: "behavior-1",
        objective: "Follow a simple classroom routine using a visual schedule.",
        interventions:
          "Use visual schedules, first-then boards, sensory breaks, and consistent reinforcement.",
        timeline: "Whole year round\nDaily routine practice",
        responsible: "SPED Teacher\nParents\nGuardian",
        evaluation: "Completes routine with fewer verbal prompts.",
        remarks: "",
      },
    ],
  },
  "Functional Academic Skills": {
    annualGoal:
      "At the end of the year, the learner can complete functional academic tasks using structured activities, visual supports, and teacher guidance.",
    rows: [
      {
        id: "functional-1",
        objective:
          "Complete a short structured task with visual cues and minimal adult assistance.",
        interventions:
          "Use task cards, shortened activities, step-by-step prompts, and positive reinforcement.",
        timeline: "Whole year round\n15 to 20 minutes per session",
        responsible: "SPED Teacher\nParents\nGuardian",
        evaluation: "Completes task with improved attention and independence.",
        remarks: "",
      },
    ],
  },
};

const defaultGeneratedAccommodations =
  "AI will generate recommended accommodations, resources, and enabling supports based on the learner profile, identified difficulties, barriers, facilitators, assistive technology, and selected learner goal areas.";

function FormField({ label, placeholder, value, onChange, type = "text" }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-input"
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <select value={value} onChange={onChange} className="form-select">
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="iep-section-header">
      <h2 className="form-section-title">{title}</h2>
      {subtitle && <p className="iep-section-subtitle">{subtitle}</p>}
    </div>
  );
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label className="iep-check-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function IepSuccessModal({ studentName, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(26, 58, 74, 0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl"
        style={{
          background: "#fff",
          border: "1px solid rgba(130,199,255,0.3)",
          boxShadow: "0 24px 60px rgba(37,137,199,0.18)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5 text-3xl"
          style={{ background: "#e6f7ec", border: "2px solid #b7e4c7" }}
        >
          ✅
        </div>

        <h2
          className="text-xl font-black tracking-tight mb-2"
          style={{ color: "#1a3a4a" }}
        >
          IEP Generated!
        </h2>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "#4a7a94" }}
        >
          <span className="font-bold" style={{ color: "#1a6fa8" }}>
            {studentName || "The selected student"}
          </span>
          's IEP has been successfully generated and saved to View IEP.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
            boxShadow: "0 4px 14px rgba(130,199,255,0.4)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 6px 20px rgba(130,199,255,0.55)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 4px 14px rgba(130,199,255,0.4)")
          }
        >
          Done
        </button>
      </div>
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

function ObjectiveTable({ rows, updateRow }) {
  const columns = [
    ["objective", "ENROUTE OBJECTIVES / PROCEDURE"],
    ["interventions", "INTERVENTIONS / ACTIVITIES / PROCEDURE"],
    ["timeline", "TIMELINE / SESSION"],
    ["responsible", "INDIVIDUALS RESPONSIBLE"],
    ["evaluation", "PROGRESS / INSTRUCTIONAL EVALUATION"],
    ["remarks", "REMARKS"],
  ];

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
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              {columns.map(([field]) => (
                <td key={field}>
                  <textarea
                    value={row[field]}
                    onChange={(e) => updateRow(rowIndex, field, e.target.value)}
                    rows={field === "interventions" ? 5 : 4}
                    className="iep-table-textarea"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
          {rows.map((row, index) => (
            <tr key={row.id || index}>
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
      const parsed = JSON.parse(student.preferences);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof student.preferences === "object" ? student.preferences : {};
}

function getStudentName(student) {
  return (
    student?.name ||
    student?.studentName ||
    student?.learnerName ||
    student?.profileDetails?.studentName ||
    student?.profileDetails?.learnerName ||
    ""
  );
}

function getStudentId(student) {
  return student?.studentID || student?.id || student?.pk || null;
}

// Converts an IEPGoal + its objective_rows (DB shape) → the shape
// ReadOnlyGoalTable and the Section C renderer expect.
function normalizeDbGoal(dbGoal) {
  return {
    goalID: dbGoal.goalID,
    type: dbGoal.subject_category || dbGoal.goalName || "Goal",
    annualGoal: dbGoal.annual_goal || dbGoal.goalName || "—",
    rows: (dbGoal.objective_rows || []).map((row) => ({
      id: row.rowID,
      objective: row.enroute_objectives || "—",
      interventions: row.interventions_procedures || "—",
      timeline: row.timeline_mins_session || "—",
      responsible: row.individuals_responsible || "—",
      evaluation: row.progress_instructional || "—",
      remarks: row.remarks || "—",
    })),
  };
}

// Builds Section B rows from the flat DB fields stored on the IEP record
// when generatedDetails.barrierRows is absent.
function buildBarrierRowsFromFlat(iep) {
  if (!iep?.difficulties) return [];
  const difficulties = iep.difficulties.split("\n").filter(Boolean);
  const barriers = (iep.learning_barriers || "").split("\n").filter(Boolean);
  const facilitators = (iep.learning_facilitators || "")
    .split("\n")
    .filter(Boolean);
  const bQualifiers = (iep.barrier_qualifiers || "")
    .split("\n")
    .filter(Boolean);
  const accommodations = (iep.learning_accommodations || "")
    .split("\n")
    .filter(Boolean);
  return difficulties.map((diff, i) => ({
    difficulty: diff,
    barrierQualifier: bQualifiers[i] || barriers[i] || "—",
    facilitator: facilitators[i] || "—",
    accommodation: accommodations[i] || "—",
  }));
}

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
  const details = normalizeGeneratedDetails(selectedIep);
  const [isEditing, setIsEditing] = useState(false);
  const [editBarrierRows, setEditBarrierRows] = useState([]);
  const [editGoals, setEditGoals] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Section C: fetch IEPGoal rows for the selected IEP ─────────────────────
  const [iepGoals, setIepGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

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
        if (mounted) setIepGoals(list.map(normalizeDbGoal));
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

  // Section C: prefer DB goals; fall back to generatedDetails.learnerGoals
  const goalsToRender =
    iepGoals.length > 0 ? iepGoals : details?.learnerGoals || [];

  // Section B: prefer generatedDetails.barrierRows; fall back to flat DB fields
  const barrierRowsToRender =
    (details?.barrierRows?.length ? details.barrierRows : null) ||
    buildBarrierRowsFromFlat(selectedIep) ||
    [];

  useEffect(() => {
    setIsEditing(false);
    setEditBarrierRows([]); // will be populated when edit opens
    setEditGoals([]);
    setIepGoals([]); // reset goals when IEP changes so stale data never shows
  }, [selectedIep]);

  const setEditField = (field) => (e) =>
    setEditBarrierRows((prev) => ({ ...prev, [field]: e.target.value }));

  const openEdit = () => {
    // Seed the edit table from whatever is currently rendered
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
      goalsToRender.length
        ? goalsToRender.map((goal) => ({
            ...goal,
            rows: (goal.rows || []).map((row) => ({ ...row })),
          }))
        : [createEmptyEditGoal()],
    );
    setIsEditing(true);
  };

  const updateEditRow = (index, field, value) =>
    setEditBarrierRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
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

  const removeEditRow = (index) =>
    setEditBarrierRows((prev) => prev.filter((_, i) => i !== index));

  const createEmptyObjectiveRow = () => ({
    id: `new-row-${Date.now()}-${Math.random()}`,
    objective: "",
    interventions: "",
    timeline: "",
    responsible: "",
    evaluation: "",
    remarks: "",
  });

  const createEmptyEditGoal = () => ({
    goalID: null,
    type: "",
    annualGoal: "",
    rows: [createEmptyObjectiveRow()],
  });

  const updateEditGoal = (goalIndex, field, value) =>
    setEditGoals((prev) =>
      prev.map((goal, index) =>
        index === goalIndex ? { ...goal, [field]: value } : goal,
      ),
    );

  const updateEditGoalRow = (goalIndex, rowIndex, field, value) =>
    setEditGoals((prev) =>
      prev.map((goal, index) =>
        index === goalIndex
          ? {
              ...goal,
              rows: goal.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, [field]: value } : row,
              ),
            }
          : goal,
      ),
    );

  const addEditGoal = () =>
    setEditGoals((prev) => [...prev, createEmptyEditGoal()]);

  const removeEditGoal = (goalIndex) =>
    setEditGoals((prev) => prev.filter((_, index) => index !== goalIndex));

  const addEditGoalRow = (goalIndex) =>
    setEditGoals((prev) =>
      prev.map((goal, index) =>
        index === goalIndex
          ? { ...goal, rows: [...goal.rows, createEmptyObjectiveRow()] }
          : goal,
      ),
    );

  const removeEditGoalRow = (goalIndex, rowIndex) =>
    setEditGoals((prev) =>
      prev.map((goal, index) =>
        index === goalIndex
          ? {
              ...goal,
              rows:
                goal.rows.length > 1
                  ? goal.rows.filter((_, currentRowIndex) => currentRowIndex !== rowIndex)
                  : goal.rows,
            }
          : goal,
      ),
    );

  const goalToApiPayload = (goal) => ({
    iep: selectedIep.iepID,
    goalName: (goal.annualGoal || goal.type || "IEP Goal").slice(0, 200),
    subject_category: goal.type || "Goal",
    annual_goal: goal.annualGoal || "",
    objective_rows: (goal.rows || []).map((row) => ({
      enroute_objectives: row.objective || "",
      interventions_procedures: row.interventions || "",
      timeline_mins_session: row.timeline || "",
      individuals_responsible: row.responsible || "",
      progress_instructional: row.evaluation || "",
      remarks: row.remarks || "",
    })),
  });

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const cleanedGoals = editGoals.map((goal) => ({
        ...goal,
        type: goal.type || "Goal",
        annualGoal: goal.annualGoal || "",
        rows: (goal.rows || []).map((row) => ({ ...row })),
      }));

      const existingDetails = normalizeGeneratedDetails(selectedIep) || {};
      const updatedDetails = {
        ...existingDetails,
        barrierRows: editBarrierRows,
        learnerGoals: cleanedGoals,
      };

      const goalsText = cleanedGoals.length
        ? cleanedGoals
            .map((goal, index) => `${index + 1}. ${goal.type}: ${goal.annualGoal}`)
            .join("\n")
        : selectedIep.goals;

      await onUpdateIep(selectedIep, {
        baselineData: selectedIep.baselineData,
        goals: goalsText,
        accommodations: selectedIep.accommodations,
        generatedDetails: updatedDetails,
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

      const keptGoalIds = cleanedGoals.map((goal) => goal.goalID).filter(Boolean);
      const removedGoals = iepGoals.filter(
        (goal) => goal.goalID && !keptGoalIds.includes(goal.goalID),
      );

      await Promise.all(removedGoals.map((goal) => iepAPI.deleteGoal(goal.goalID)));

      for (const goal of cleanedGoals) {
        const payload = goalToApiPayload(goal);
        if (goal.goalID) {
          await iepAPI.updateGoal(goal.goalID, payload);
        } else {
          await iepAPI.createGoal(payload);
        }
      }

      const refreshedGoals = await iepAPI.listGoalsByIep(selectedIep.iepID);
      const refreshedList = Array.isArray(refreshedGoals)
        ? refreshedGoals
        : refreshedGoals.results || refreshedGoals.data || [];
      setIepGoals(refreshedList.map(normalizeDbGoal));
      setIsEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePickStudent = (student) => {
    setSelectedStudent(student);
    setSearchTerm(getStudentName(student));
  };

  return (
    <div className="form-card iep-card">
      <SectionHeader
        title="View IEP"
        subtitle="Search a student name, select a matching result, then choose the IEP version to view."
      />

      <div className="iep-view-controls">
        <div className="form-group iep-search-group">
          <label className="form-label">Search Student</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedStudent(null);
            }}
            placeholder="Type student name..."
            className="form-input"
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
                    onClick={() => handlePickStudent(student)}
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

        <div className="form-group iep-version-group">
          <label className="form-label">IEP Version</label>
          <select
            value={selectedIep?.iepID || ""}
            onChange={(e) => {
              const iep = ieps.find(
                (item) => String(item.iepID) === e.target.value,
              );
              setSelectedIep(iep || null);
            }}
            disabled={!selectedStudent || loadingIeps || ieps.length === 0}
            className="form-select"
          >
            <option value="">
              {loadingIeps ? "Loading..." : "Choose IEP"}
            </option>
            {ieps.map((iep) => (
              <option key={iep.iepID} value={iep.iepID}>
                Version {iep.version}{" "}
                {iep.formattedDate ? `· ${iep.formattedDate}` : ""}
              </option>
            ))}
          </select>
        </div>
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
      ) : selectedIep ? (
        <div className="iep-view-details">
          <div className="iep-view-header">
            <div>
              <span>Student</span>
              <h3>
                {selectedIep.studentName ||
                  getStudentName(selectedStudent) ||
                  "—"}
              </h3>
              <p>
                Grade {selectedStudent.grade} · Age {selectedStudent.age}
              </p>
            </div>
            <div className="iep-view-actions">
              <button className="btn btn-back" onClick={openEdit}>
                EDIT IEP
              </button>
              <button
                className="btn iep-btn-danger"
                onClick={() => onDeleteIep(selectedIep)}
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
                    {editBarrierRows.map((row, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            value={row.difficulty}
                            onChange={(e) =>
                              updateEditRow(index, "difficulty", e.target.value)
                            }
                            placeholder="Type difficulty"
                            className="form-input"
                          />
                        </td>
                        <td>
                          <select
                            value={row.barrierQualifier}
                            onChange={(e) =>
                              updateEditRow(
                                index,
                                "barrierQualifier",
                                e.target.value,
                              )
                            }
                            className="form-select"
                          >
                            {barrierQualifierOptions.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            value={row.facilitator}
                            onChange={(e) =>
                              updateEditRow(
                                index,
                                "facilitator",
                                e.target.value,
                              )
                            }
                            rows={3}
                            placeholder="Type facilitator/s"
                            className="form-textarea iep-small-textarea"
                          />
                        </td>
                        <td>
                          <textarea
                            value={row.accommodation}
                            onChange={(e) =>
                              updateEditRow(
                                index,
                                "accommodation",
                                e.target.value,
                              )
                            }
                            rows={3}
                            placeholder="Type accommodation/s"
                            className="form-textarea iep-small-textarea"
                          />
                        </td>
                        <td className="iep-action-cell">
                          <button
                            type="button"
                            className="iep-link-danger"
                            onClick={() => removeEditRow(index)}
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

              <div className="iep-edit-section-header">
                <h3>Edit Section C: Learner’s Goals</h3>
                <button
                  type="button"
                  className="btn btn-back iep-add-row-inline"
                  onClick={addEditGoal}
                >
                  + ADD SKILL
                </button>
              </div>

              {editGoals.map((goal, goalIndex) => (
                <div className="iep-edit-goal-card" key={goal.goalID || goalIndex}>
                  <div className="iep-edit-goal-head">
                    <div className="form-group">
                      <label className="form-label">Skill / Goal Area</label>
                      <input
                        value={goal.type}
                        onChange={(e) =>
                          updateEditGoal(goalIndex, "type", e.target.value)
                        }
                        placeholder="Example: Functional Academic Skills"
                        className="form-input"
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

                  <div className="form-group">
                    <label className="form-label">Annual Goal / Long Term</label>
                    <textarea
                      value={goal.annualGoal}
                      onChange={(e) =>
                        updateEditGoal(goalIndex, "annualGoal", e.target.value)
                      }
                      rows={3}
                      placeholder="Type annual goal"
                      className="form-textarea"
                    />
                  </div>

                  <div className="iep-table-wrap">
                    <table className="iep-table iep-goal-table">
                      <thead>
                        <tr>
                          <th>ENROUTE OBJECTIVES / PROCEDURE</th>
                          <th>INTERVENTIONS / ACTIVITIES / PROCEDURE</th>
                          <th>TIMELINE / SESSION</th>
                          <th>INDIVIDUALS RESPONSIBLE</th>
                          <th>PROGRESS / INSTRUCTIONAL EVALUATION</th>
                          <th>REMARKS</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(goal.rows || []).map((row, rowIndex) => (
                          <tr key={row.id || rowIndex}>
                            {[
                              ["objective", "Type objective"],
                              ["interventions", "Type intervention"],
                              ["timeline", "Type timeline"],
                              ["responsible", "Type responsible person/s"],
                              ["evaluation", "Type evaluation"],
                              ["remarks", "Type remarks"],
                            ].map(([field, placeholder]) => (
                              <td key={field}>
                                <textarea
                                  value={row[field] || ""}
                                  onChange={(e) =>
                                    updateEditGoalRow(
                                      goalIndex,
                                      rowIndex,
                                      field,
                                      e.target.value,
                                    )
                                  }
                                  rows={field === "interventions" ? 5 : 4}
                                  placeholder={placeholder}
                                  className="iep-table-textarea"
                                />
                              </td>
                            ))}
                            <td className="iep-action-cell">
                              <button
                                type="button"
                                className="iep-link-danger"
                                onClick={() => removeEditGoalRow(goalIndex, rowIndex)}
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
                    + ADD ROW
                  </button>
                </div>
              ))}

              <div className="iep-edit-actions iep-edit-actions-bottom">
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
                    barrierRowsToRender.map((row, index) => (
                      <tr key={index}>
                        <td>{row.difficulty}</td>
                        <td>{row.barrierQualifier}</td>
                        <td>{row.facilitator || "—"}</td>
                        <td>{row.accommodation || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No Section B details available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="iep-view-section-title">
              Section C: Learner’s Goals
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
              <InfoBlock title="Goals">
                {selectedIep.goals || "No goals recorded."}
              </InfoBlock>
            )}
          </div>
        </div>
      ) : (
        <div className="iep-empty-state">
          <div>📄</div>
          <strong>No IEP selected</strong>
          <span>
            {ieps.length === 0
              ? "No saved IEP records were found for this student."
              : "Choose an IEP version from the dropdown."}
          </span>
        </div>
      )}
    </div>
  );
}

export default function IEPGenerationPage({ mode = "generate" }) {
  const activeView = mode;
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("neuropath_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);
  const currentUserId =
    currentUser?.id || currentUser?.user_id || currentUser?.teacherID || null;
  const [step, setStep] = useState(3);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ieps, setIeps] = useState([]);
  const [selectedIep, setSelectedIep] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingIeps, setLoadingIeps] = useState(false);
  const [viewError, setViewError] = useState("");
  const [selectedGoalCategories, setSelectedGoalCategories] = useState([]);
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [generatedAccommodations, setGeneratedAccommodations] = useState(
    defaultGeneratedAccommodations,
  );
  const [generatedGoalDraft, setGeneratedGoalDraft] = useState("");
  const [generatingFinalIep, setGeneratingFinalIep] = useState(false);
  const [showIepSuccessModal, setShowIepSuccessModal] = useState(false);
  const [teacherPrompt, setTeacherPrompt] = useState("");

  const [form, setForm] = useState({
    region: "",
    division: "",
    school: "",
    schoolYear: "",
    learnerName: "",
    birthdate: "",
    learningCenter: "",
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
    learnerGoals: [],
  });

  useEffect(() => {
    setSearchTerm("");
    setSelectedStudent(null);
    setIeps([]);
    setSelectedIep(null);
    setViewError("");
  }, [activeView]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return students
      .filter((student) =>
        getStudentName(student).toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [students, searchTerm]);

  const availableGoalTypes = useMemo(
    () => getGoalTypesForGrade(selectedStudent?.grade),
    [selectedStudent],
  );

  useEffect(() => {
    let mounted = true;

    async function loadStudents() {
      if (activeView !== "view" && activeView !== "generate") return;

      if (!currentUserId) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      setViewError("");
      try {
        const data = await studentsAPI.list(currentUserId);
        const list = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        if (mounted) setStudents(list);
      } catch (error) {
        if (mounted) {
          setStudents([]);
          setViewError(error.message || "Unable to load student records.");
        }
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    }

    loadStudents();
    return () => {
      mounted = false;
    };
  }, [activeView, currentUserId]);

  useEffect(() => {
    let mounted = true;
    async function loadStudentIeps() {
      const selectedStudentId = getStudentId(selectedStudent);

      if (!selectedStudentId || !currentUserId) {
        setIeps([]);
        setSelectedIep(null);
        return;
      }
      setLoadingIeps(true);
      setViewError("");
      try {
        const data = await iepAPI.listByStudent(
          selectedStudentId,
          currentUserId,
        );
        const list = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        if (mounted) {
          setIeps(list);
          setSelectedIep(list[0] || null);
        }
      } catch (error) {
        if (mounted) {
          setIeps([]);
          setSelectedIep(null);
          setViewError(
            error.message || "Unable to load IEP records for this student.",
          );
        }
      } finally {
        if (mounted) setLoadingIeps(false);
      }
    }
    loadStudentIeps();
    return () => {
      mounted = false;
    };
  }, [selectedStudent, currentUserId]);

  useEffect(() => {
    if (activeView !== "generate" || !selectedStudent) return;
    const profileDetails = getStudentProfileDetails(selectedStudent);

    setForm((prev) => ({
      ...prev,
      school: profileDetails.school || prev.school,
      schoolYear: profileDetails.schoolYear || prev.schoolYear,
      learnerName:
        profileDetails.studentName ||
        profileDetails.learnerName ||
        getStudentName(selectedStudent) ||
        prev.learnerName,
      birthdate: profileDetails.birthdate || prev.birthdate,
      disabilityCategory:
        profileDetails.disabilityCategory ||
        selectedStudent.diagnosis ||
        prev.disabilityCategory,
      diagnosisDetails:
        profileDetails.diagnosisDetails ||
        selectedStudent.asdBackground ||
        selectedStudent.diagnosis ||
        prev.diagnosisDetails,
      difficultyMarkers: (() => {
        const raw = profileDetails.difficultyMarkers;
        if (!raw) return prev.difficultyMarkers;
        const arr = Array.isArray(raw) ? raw : [raw];
        return arr.length > 0 ? [arr[0]] : prev.difficultyMarkers;
      })(),
      presentEvaluation:
        profileDetails.presentEvaluation ||
        selectedStudent.assessmentResult ||
        prev.presentEvaluation,
      academicStrengths:
        profileDetails.academicStrengths || prev.academicStrengths,
      academicNeeds:
        profileDetails.academicNeeds ||
        selectedStudent.support_needs ||
        prev.academicNeeds,
      parentalConcerns:
        profileDetails.parentalConcerns || prev.parentalConcerns,
      curriculumImpact:
        profileDetails.curriculumImpact || prev.curriculumImpact,
    }));
  }, [activeView, selectedStudent]);

  useEffect(() => {
    setSelectedGoalCategories((prev) =>
      prev.filter((goalType) => availableGoalTypes.includes(goalType)),
    );
  }, [availableGoalTypes]);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleListValue = (field, value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  // Difficulty rows helpers
  const addDifficultyRow = () =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: [...prev.difficultyMarkers, ""],
    }));

  const updateDifficultyRow = (index, value) =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.map((item, i) =>
        i === index ? value : item,
      ),
    }));

  const removeDifficultyRow = (index) =>
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.filter((_, i) => i !== index),
    }));

  // Assistive technology rows helpers
  const addAssistiveTechRow = () =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: [...prev.assistiveTechnologies, ""],
    }));

  const updateAssistiveTechRow = (index, value) =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: prev.assistiveTechnologies.map((item, i) =>
        i === index ? value : item,
      ),
    }));

  const removeAssistiveTechRow = (index) =>
    setForm((prev) => ({
      ...prev,
      assistiveTechnologies: prev.assistiveTechnologies.filter(
        (_, i) => i !== index,
      ),
    }));

  const updateBarrierRow = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      barrierRows: prev.barrierRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addBarrierRow = () => {
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
  };

  const removeBarrierRow = (index) => {
    setForm((prev) => ({
      ...prev,
      barrierRows: prev.barrierRows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const updateGoalRow = (goalIndex, rowIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      learnerGoals: prev.learnerGoals.map((goal, currentGoalIndex) =>
        currentGoalIndex === goalIndex
          ? {
              ...goal,
              rows: goal.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, [field]: value } : row,
              ),
            }
          : goal,
      ),
    }));
  };

  const updateGoalAnnualGoal = (goalIndex, value) => {
    setForm((prev) => ({
      ...prev,
      learnerGoals: prev.learnerGoals.map((goal, currentGoalIndex) =>
        currentGoalIndex === goalIndex ? { ...goal, annualGoal: value } : goal,
      ),
    }));
  };

  const buildGoalFromTemplate = (goalType) => {
    const template = goalTemplates[goalType];
    return {
      type: goalType,
      annualGoal: template.annualGoal,
      rows: template.rows.map((row) => ({
        ...row,
        id: `${row.id}-${Date.now()}-${goalType}`,
      })),
    };
  };

  const getLearnerGoalsForSave = () => {
    if (form.learnerGoals.length) return form.learnerGoals;
    return selectedGoalCategories.map((goalType) => buildGoalFromTemplate(goalType));
  };

  const buildIepSavePayload = (accommodationText, goalDraftText = "") => {
    const learnerGoals = getLearnerGoalsForSave();
    const goalsText = goalDraftText?.trim()
      ? goalDraftText.trim()
      : learnerGoals.length
        ? learnerGoals
            .map(
              (goal, index) => `${index + 1}. ${goal.type}: ${goal.annualGoal}`,
            )
            .join("\n")
        : "No learner goals selected.";

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

    const generatedDetails = {
      ...form,
      learnerGoals,
      selectedGoalCategories,
      generatedAccommodations: accommodationText,
      generatedGoalDraft: goalDraftText,
    };

    return {
      teacherID: currentUserId,
      studentID: getStudentId(selectedStudent),
      baselineData: baselineText,
      goals: goalsText,
      accommodations: accommodationText,
      generatedDetails,
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
    };
  };

  const addSavedIepToViewList = (savedIep) => {
    if (!savedIep) return;
    setIeps((prev) => [
      savedIep,
      ...prev.filter((item) => item.iepID !== savedIep.iepID),
    ]);
    setSelectedIep(savedIep);
  };

  const toggleGoalCategory = (goalType) => {
    setSelectedGoalCategories(goalType ? [goalType] : []);
    setGeneratedGoalDraft("");
  };

  const handleGenerateSelectedGoal = () => {
    if (selectedGoalCategories.length === 0) {
      alert("Please select at least one goal area to generate.");
      return;
    }

    setForm((prev) => {
      const goalsToGenerate = selectedGoalCategories.map((goalType) => {
        const template = goalTemplates[goalType];
        return {
          type: goalType,
          annualGoal: template.annualGoal,
          rows: template.rows.map((row) => ({
            ...row,
            id: `${row.id}-${Date.now()}-${goalType}`,
          })),
        };
      });

      const goalsWithoutSelected = prev.learnerGoals.filter(
        (goal) => !selectedGoalCategories.includes(goal.type),
      );
      return {
        ...prev,
        learnerGoals: [...goalsWithoutSelected, ...goalsToGenerate],
      };
    });
  };

  const removeGoal = (goalType) => {
    setSelectedGoalCategories((prev) =>
      prev.filter((item) => item !== goalType),
    );
    setGeneratedGoalDraft("");
  };

  const buildGeneratedAccommodations = () => {
    const difficulties =
      form.barrierRows
        .map((row) => row.difficulty)
        .filter(Boolean)
        .join(", ") || "the identified learner difficulties";
    const supports =
      form.assistiveTechnologies.join(", ") ||
      "appropriate visual and classroom supports";
    const selectedGoals =
      selectedGoalCategories.join(", ") || "selected learner goal areas";

    return `Based on ${difficulties} and the selected goal areas (${selectedGoals}), AI recommends structured routines, shortened tasks, visual prompts, positive reinforcement, sensory or movement breaks when needed, and assistive supports such as ${supports}. The teacher may adjust these accommodations based on actual classroom observation and learner performance.`;
  };

  const handleGenerateFinalIep = async () => {
    if (!getStudentId(selectedStudent)) {
      alert("Please select a student first.");
      return;
    }

    if (selectedGoalCategories.length === 0) {
      alert("Please select at least one learner goal area.");
      return;
    }

    setGeneratingFinalIep(true);
    setGeneratedGoalDraft("");

    const accommodationText = buildGeneratedAccommodations();
    setGeneratedAccommodations(accommodationText);

    const baselineData = [
      `Student: ${form.learnerName || getStudentName(selectedStudent) || ""}`,
      `Diagnosis: ${form.disabilityCategory || ""}`,
      `Assessment / Diagnosis Details: ${form.diagnosisDetails || ""}`,
      `Present Evaluation: ${form.presentEvaluation || ""}`,
      `Academic Strengths: ${form.academicStrengths || ""}`,
      `Academic Needs: ${form.academicNeeds || ""}`,
      `Parental Concerns: ${form.parentalConcerns || ""}`,
      `Curriculum Impact: ${form.curriculumImpact || ""}`,
      `Section B Difficulties: ${form.barrierRows.map((row) => `${row.difficulty || "Unspecified difficulty"} - ${row.barrierQualifier || "No barrier listed"} - Facilitator/s: ${row.facilitator || "None listed"}`).join("; ")}`,
    ].join("\n");

    try {
      const result = await iepAPI.generate({
        studentID: getStudentId(selectedStudent),
        baselineData,
        domains: selectedGoalCategories.join(", "),
        teacherPrompt: teacherPrompt.trim() || undefined,
      });

      const draft = result?.draftData || result?.data || result;
      const draftGoals =
        draft?.draft_goals ||
        draft?.goals ||
        "AI generated the learner goals successfully.";
      const draftAccommodations =
        draft?.draft_accommodations || accommodationText;

      setGeneratedGoalDraft(draftGoals);
      setGeneratedAccommodations(draftAccommodations);

      const saved = await iepAPI.save(
        buildIepSavePayload(draftAccommodations, draftGoals),
      );
      const savedData = saved?.data || saved;
      addSavedIepToViewList(savedData);
      setShowIepSuccessModal(true);
    } catch (error) {
      alert(error.message || "Unable to generate and save the IEP content.");
    } finally {
      setGeneratingFinalIep(false);
    }
  };

  const handleSaveIep = async () => {
    if (!getStudentId(selectedStudent)) {
      alert("Please select a student first.");
      return;
    }

    const accommodationText = generatedAccommodations || buildGeneratedAccommodations();
    setGeneratedAccommodations(accommodationText);

    try {
      const saved = await iepAPI.save(
        buildIepSavePayload(accommodationText, generatedGoalDraft),
      );
      const savedData = saved?.data || saved;
      addSavedIepToViewList(savedData);
      alert("IEP saved successfully!");
    } catch (error) {
      alert(error.message || "Unable to save IEP.");
    }
  };

  const handleUpdateIep = async (iep, payload) => {
    try {
      let generatedDetails = payload.generatedDetails;
      if (generatedDetails && typeof generatedDetails === "string") {
        try {
          generatedDetails = JSON.parse(generatedDetails);
        } catch {
          /* keep as-is */
        }
      }

      const updatedResponse = await iepAPI.update(iep.iepID, {
        baselineData: payload.baselineData,
        goals: payload.goals,
        accommodations: payload.accommodations,
        generatedDetails,
        // Flat Section B fields — present when editing Section B rows
        ...(payload.difficulties !== undefined && {
          difficulties: payload.difficulties,
          learning_barriers: payload.learning_barriers,
          learning_facilitators: payload.learning_facilitators,
          learning_accommodations: payload.learning_accommodations,
        }),
      });

      const updated = updatedResponse?.data || updatedResponse;
      const newVersion = { ...updated, generatedDetails: updated.generatedDetails || generatedDetails };
      setIeps((prev) => [
        newVersion,
        ...prev.filter((item) => item.iepID !== newVersion.iepID),
      ]);
      setSelectedIep(newVersion);
      setViewError("");
    } catch (error) {
      setViewError(error.message || "Unable to update IEP record.");
      throw error;
    }
  };

  const handleDeleteIep = async (iep) => {
    const confirmed = window.confirm(
      `Delete IEP Version ${iep.version || ""}? This action cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await iepAPI.delete(iep.iepID);
      setIeps((prev) => prev.filter((item) => item.iepID !== iep.iepID));
      setSelectedIep(null);
      setViewError("");
    } catch (error) {
      setViewError(error.message || "Unable to delete IEP record.");
    }
  };

  const steps = [3, 4];

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

      {showIepSuccessModal && (
        <IepSuccessModal
          studentName={form.learnerName || getStudentName(selectedStudent)}
          onClose={() => setShowIepSuccessModal(false)}
        />
      )}

      {activeView === "generate" ? (
        <div className="form-card iep-card">
          <div className="iep-step-header">
            <div>
              <span>Generate IEP</span>
              <strong>Step {step === 3 ? 1 : 2} of 2</strong>
            </div>
            <div className="iep-progress">
              {steps.map((number) => (
                <i key={number} className={number <= step ? "active" : ""} />
              ))}
            </div>
          </div>

          <section className="form-section">
            <SectionHeader
              title="Select Student"
              subtitle="Search and select the student profile first. Generate IEP will use the saved student profile from Create Student Profiling."
            />
            <div className="iep-view-controls">
              <div className="form-group iep-search-group">
                <label className="form-label">Search Student</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedStudent(null);
                  }}
                  placeholder="Type student name..."
                  className="form-input"
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
                            setSelectedStudent(student);
                            setSearchTerm(getStudentName(student));
                          }}
                        >
                          <strong>{getStudentName(student)}</strong>
                          <span>
                            Grade {student.grade || "—"} · Age{" "}
                            {student.age || "—"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p>No similar student names found.</p>
                    )}
                  </div>
                )}
              </div>

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
                Steps 1 and 2 are now completed in Create Student Profiling.
                This page will continue with steps 3 and 4 after a student is
                selected.
              </span>
            </div>
          ) : (
            <>
              {step === 3 && (
                <section className="form-section">
                  <SectionHeader
                    title="Considerations of Special Factors"
                    subtitle="Indicate all difficulties and assistive technology or devices needed."
                  />
                  <div className="form-two-col-sections">
                    <div>
                      <h3 className="iep-small-title">Difficulties</h3>
                      <div className="iep-input-row-list">
                        {form.difficultyMarkers.map((item, index) => (
                          <div key={index} className="iep-input-row-item">
                            <input
                              className="form-input"
                              value={item}
                              onChange={(e) =>
                                updateDifficultyRow(index, e.target.value)
                              }
                              placeholder={`Difficulty ${index + 1}`}
                            />
                            <button
                              type="button"
                              className="iep-link-danger"
                              onClick={() => removeDifficultyRow(index)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-back iep-add-row-inline"
                          onClick={addDifficultyRow}
                        >
                          + Add Row
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="iep-small-title">
                        Assistive Technologies Needed
                      </h3>
                      <div className="iep-input-row-list">
                        {form.assistiveTechnologies.map((item, index) => (
                          <div key={index} className="iep-input-row-item">
                            <input
                              className="form-input"
                              value={item}
                              onChange={(e) =>
                                updateAssistiveTechRow(index, e.target.value)
                              }
                              placeholder={`Technology ${index + 1}`}
                            />
                            <button
                              type="button"
                              className="iep-link-danger"
                              onClick={() => removeAssistiveTechRow(index)}
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
                    subtitle="Type the difficulty manually, then identify barriers, facilitators, and accommodations for each entry."
                  />
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
                        {form.barrierRows.map((row, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                value={row.difficulty}
                                onChange={(e) =>
                                  updateBarrierRow(
                                    index,
                                    "difficulty",
                                    e.target.value,
                                  )
                                }
                                placeholder="Type difficulty"
                                className="form-input"
                              />
                            </td>
                            <td>
                              <select
                                value={row.barrierQualifier}
                                onChange={(e) =>
                                  updateBarrierRow(
                                    index,
                                    "barrierQualifier",
                                    e.target.value,
                                  )
                                }
                                className="form-select"
                              >
                                {barrierQualifierOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <textarea
                                value={row.facilitator}
                                onChange={(e) =>
                                  updateBarrierRow(
                                    index,
                                    "facilitator",
                                    e.target.value,
                                  )
                                }
                                rows={3}
                                placeholder="Type facilitator/s"
                                className="form-textarea iep-small-textarea"
                              />
                            </td>
                            <td>
                              <textarea
                                value={row.accommodation}
                                onChange={(e) =>
                                  updateBarrierRow(
                                    index,
                                    "accommodation",
                                    e.target.value,
                                  )
                                }
                                rows={3}
                                placeholder="Type accommodation/s"
                                className="form-textarea iep-small-textarea"
                              />
                            </td>
                            <td className="iep-action-cell">
                              <button
                                type="button"
                                className="iep-link-danger"
                                onClick={() => removeBarrierRow(index)}
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
                    onClick={addBarrierRow}
                  >
                    + ADD DIFFICULTY
                  </button>
                </section>
              )}

              {step === 4 && (
                <section className="form-section">
                  <SectionHeader
                    title="Section C: Learner’s Goals"
                    subtitle="Select one goal area. The final goals will be generated by the AI component after clicking Generate Final IEP."
                  />
                  <div className="iep-ai-goal-toolbar multi">
                    <div className="form-group">
                      <label className="form-label">Goal Area:</label>
                      <select
                        className="form-select"
                        value={selectedGoalCategories[0] || ""}
                        onChange={(e) => toggleGoalCategory(e.target.value)}
                      >
                        <option value="">Select a goal area</option>
                        {availableGoalTypes.map((goalType) => (
                          <option key={goalType} value={goalType}>
                            {goalType}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedGoalCategories.length === 0 ? (
                    <div className="iep-empty-state compact">
                      <div>🤖</div>
                      <strong>No learner goal area selected yet</strong>
                      <span>
                        Select a goal area like Care Skills, Mathematical
                        Skills, Communication Skills, or Social Skills. The AI
                        component will generate the actual learner goals.
                      </span>
                    </div>
                  ) : (
                    <div className="iep-selected-goal-summary">
                      <p className="iep-muted">
                        This selected area will be sent to the AI component when
                        you click Generate Final IEP.
                      </p>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: "1.25rem" }}>
                    <label className="form-label">
                      Describe what you want the AI to focus on when generating
                      this student's IEP goals for the selected subject.
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={5}
                      placeholder={
                        "Provide any additional context or specific instructions to help the AI generate a high-quality IEP.\n\nExample: Focus on improving the learner's ability to initiate verbal requests during snack time. The student responds well to visual prompts and 1:1 adult support."
                      }
                      value={teacherPrompt}
                      onChange={(e) => setTeacherPrompt(e.target.value)}
                    />
                    <p
                      className="iep-muted"
                      style={{ marginTop: "0.35rem", fontSize: "0.78rem" }}
                    >
                      The more specific you are, the better the AI can tailor
                      the goals and objectives to this learner.
                    </p>
                  </div>

                  {generatedGoalDraft && (
                    <InfoBlock title="AI-Generated Learner Goals">
                      {generatedGoalDraft}
                    </InfoBlock>
                  )}

                  <div className="iep-final-generate">
                    <button
                      type="button"
                      onClick={handleGenerateFinalIep}
                      className="btn btn-submit"
                      disabled={generatingFinalIep}
                    >
                      {generatingFinalIep
                        ? "GENERATING..."
                        : "GENERATE FINAL IEP"}
                    </button>
                  </div>
                </section>
              )}

              <div className="form-actions">
                {step > 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="btn btn-back"
                  >
                    BACK
                  </button>
                ) : (
                  <div />
                )}
                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="btn btn-submit"
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
