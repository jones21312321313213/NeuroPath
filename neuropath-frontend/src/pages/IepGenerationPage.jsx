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
  const goals = details?.learnerGoals || [];
  const [isEditing, setIsEditing] = useState(false);
  const [editPayload, setEditPayload] = useState({
    baselineData: "",
    goals: "",
    accommodations: "",
    generatedDetails: "",
  });

  useEffect(() => {
    setIsEditing(false);
    setEditPayload({
      baselineData: selectedIep?.baselineData || "",
      goals: selectedIep?.goals || "",
      accommodations: selectedIep?.accommodations || "",
      generatedDetails: selectedIep?.generatedDetails
        ? JSON.stringify(normalizeGeneratedDetails(selectedIep), null, 2)
        : "",
    });
  }, [selectedIep]);

  const setEditField = (field) => (e) =>
    setEditPayload((prev) => ({ ...prev, [field]: e.target.value }));

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
              <button
                className="btn btn-back"
                onClick={() => setIsEditing(true)}
              >
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
              <h3>Edit IEP Details</h3>
              <TextAreaField
                label="Baseline Data"
                value={editPayload.baselineData}
                onChange={setEditField("baselineData")}
                rows={4}
              />
              <TextAreaField
                label="Goals"
                value={editPayload.goals}
                onChange={setEditField("goals")}
                rows={4}
              />
              <TextAreaField
                label="AI-Generated Accommodations / Resources"
                value={editPayload.accommodations}
                onChange={setEditField("accommodations")}
                rows={4}
              />
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
                  onClick={async () => {
                    await onUpdateIep(selectedIep, editPayload);
                    setIsEditing(false);
                  }}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          )}

          <InfoBlock title="Section A: Personal Information">
            {details
              ? `School: ${details.school || "—"}\nSchool Year: ${details.schoolYear || "—"}\nStudent Name: ${details.studentName || details.learnerName || selectedIep.studentName || getStudentName(selectedStudent)}\nBirthdate: ${details.birthdate || "—"}\nDiagnosis: ${details.disabilityCategory || "—"}\nDifficulties: ${(details.difficultyMarkers || []).join(", ") || "—"}`
              : selectedIep.baselineData}
          </InfoBlock>

          <InfoBlock title="Present Levels of Academic Achievement and Functional Performance">
            {details
              ? `Evaluation / Assessment Results:\n${details.presentEvaluation || "—"}\n\nStrengths:\n${details.academicStrengths || "—"}\n\nNeeds:\n${details.academicNeeds || "—"}\n\nParental Concerns:\n${details.parentalConcerns || "—"}\n\nCurriculum Impact:\n${details.curriculumImpact || "—"}`
              : selectedIep.baselineData}
          </InfoBlock>

          <InfoBlock title="Considerations of Special Factors">
            {details
              ? `Assistive Technologies Needed:\n${(details.assistiveTechnologies || []).join(", ") || "—"}\n\nOther Notes:\n${details.specialFactorNotes || "—"}`
              : selectedIep.accommodations}
          </InfoBlock>

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
                  </tr>
                </thead>
                <tbody>
                  {(details?.barrierRows || []).length ? (
                    details.barrierRows.map((row, index) => (
                      <tr key={index}>
                        <td>{row.difficulty}</td>
                        <td>{row.barrierQualifier}</td>
                        <td>{row.facilitator || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No Section B details available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <InfoBlock title="AI-Generated Accommodations / Resources">
              {details?.generatedAccommodations ||
                selectedIep.accommodations ||
                defaultGeneratedAccommodations}
            </InfoBlock>
          </div>

          <div>
            <h3 className="iep-view-section-title">
              Section C: Learner’s Goals
            </h3>
            {goals.length ? (
              goals.map((goal) => (
                <div key={goal.type} className="iep-goal-preview">
                  <InfoBlock title={`${goal.type} — Annual Goal / Long Term`}>
                    {goal.annualGoal}
                  </InfoBlock>
                  <ReadOnlyGoalTable rows={goal.rows} />
                </div>
              ))
            ) : (
              <InfoBlock title="Goals">{selectedIep.goals}</InfoBlock>
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
      setGeneratedGoalDraft(
        draft?.draft_goals ||
          draft?.goals ||
          "AI generated the learner goals successfully.",
      );
      setGeneratedAccommodations(
        draft?.draft_accommodations || accommodationText,
      );
    } catch (error) {
      alert(error.message || "Unable to generate final IEP content.");
    } finally {
      setGeneratingFinalIep(false);
    }
  };

  const handleSaveIep = async () => {
    if (!getStudentId(selectedStudent)) {
      alert("Please select a student first.");
      return;
    }

    const accommodationText = buildGeneratedAccommodations();
    setGeneratedAccommodations(accommodationText);

    const goalsText = form.learnerGoals.length
      ? form.learnerGoals
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
      generatedAccommodations: accommodationText,
    };

    try {
      const saved = await iepAPI.save({
        studentID: getStudentId(selectedStudent),
        baselineData: baselineText,
        goals: goalsText,
        accommodations: accommodationText,
        generatedDetails,
      });

      const savedData = saved?.data || saved;
      setIeps((prev) => [savedData, ...prev]);
      setSelectedIep(savedData);
      alert("IEP saved successfully!");
    } catch (error) {
      alert(error.message || "Unable to save IEP.");
    }
  };

  const handleUpdateIep = async (iep, payload) => {
    try {
      let generatedDetails = payload.generatedDetails;
      if (generatedDetails) {
        try {
          generatedDetails = JSON.parse(generatedDetails);
        } catch {
          /* keep as plain text if invalid JSON */
        }
      }

      const updated = await iepAPI.update(iep.iepID, {
        baselineData: payload.baselineData,
        goals: payload.goals,
        accommodations: payload.accommodations,
        generatedDetails,
      });

      const merged = { ...iep, ...updated, ...payload, generatedDetails };
      setIeps((prev) =>
        prev.map((item) => (item.iepID === iep.iepID ? merged : item)),
      );
      setSelectedIep(merged);
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
                      <div className="iep-check-grid single">
                        {[
                          "Difficulty in Communicating",
                          "Difficulty in displaying Interpersonal Behavior",
                        ].map((option) => (
                          <label key={option} className="iep-check-option">
                            <input
                              type="radio"
                              name="difficultyMarkers"
                              checked={form.difficultyMarkers.includes(option)}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  difficultyMarkers: [option],
                                }))
                              }
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="iep-small-title">
                        Assistive Technologies Needed
                      </h3>
                      <div className="iep-check-grid single scrollable">
                        {assistiveTechnologyOptions.map((option) => (
                          <CheckOption
                            key={option}
                            label={option}
                            checked={form.assistiveTechnologies.includes(
                              option,
                            )}
                            onChange={() =>
                              toggleListValue("assistiveTechnologies", option)
                            }
                          />
                        ))}
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
                  <InfoBlock title="AI-Generated Accommodations / Resources">
                    {generatedAccommodations}
                  </InfoBlock>
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
                      Additional Instructions for AI{" "}
                      <span className="iep-muted" style={{ fontWeight: 400 }}>
                        (optional)
                      </span>
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
