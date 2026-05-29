import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import "../styles/ViewStudentRecords.css";
import { studentsAPI, iepAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

// ── Placeholder data shown when backend fields are missing ─────────────────
const PLACEHOLDER = {
  name: "Juan dela Cruz",
  studentID: "12",
  age: "11",
  grade: "6",
  gender: "Male",
  school: "CIT",
  schoolYear: "2026-2027",
  birthdate: "10-15-1920",
  disabilityCategory: "Autism Spectrum Disorder",
  profileStatus: "Active",
  diagnosisDetails: "Cannot eat without eating.",
  difficultyMarkers: [],
  presentEvaluation:
    "Based on the Q1 diagnostic reading inventory, the learner decodes individual words at a Grade 3 level but demonstrates a Grade 1 level in deep inferential comprehension.",
  academicStrengths:
    "The learner excels significantly in mathematics, particularly in arithmetic operations and pattern identification.",
  academicNeeds:
    "Requires direct, explicit instruction in reading comprehension strategies.",
  parentalConcerns:
    "Parents are deeply concerned about his reading frustration leading to task avoidance behaviors at home.",
  curriculumImpact:
    "The learner's reading processing deficits significantly restrict his ability to comprehend word problems independently.",
};

function EmptyState({ message }) {
  return (
    <div className="om-empty">
      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>
        📭
      </span>
      {message}
    </div>
  );
}

// ── Read-only field row used in Section A ──────────────────────────────────
function RecordField({ label, value }) {
  return (
    <div className="vsr-field-group">
      <span className="vsr-field-label">{label}:</span>
      <div className="vsr-field-input">{value || "—"}</div>
    </div>
  );
}

// ── Read-only textarea used in Section A & Present Levels ──────────────────
function RecordTextarea({ label, value }) {
  return (
    <div className="vsr-field-group vsr-field-full">
      <span className="vsr-field-label">{label}</span>
      <div className="vsr-field-textarea">{value || "—"}</div>
    </div>
  );
}

function normalizeGeneratedDetails(iep) {
  const raw =
    iep?.generatedDetails || iep?.standardContents || iep?.formData || iep?.details;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

function buildBarrierRowsFromFlat(iep) {
  if (!iep?.difficulties) return [];
  const difficulties = String(iep.difficulties).split("\n").filter(Boolean);
  const barriers = String(iep.learning_barriers || "").split("\n").filter(Boolean);
  const facilitators = String(iep.learning_facilitators || "").split("\n").filter(Boolean);
  const qualifiers = String(iep.barrier_qualifiers || "").split("\n").filter(Boolean);
  const accommodations = String(iep.learning_accommodations || "").split("\n").filter(Boolean);

  return difficulties.map((difficulty, index) => ({
    difficulty,
    barrierQualifier: qualifiers[index] || barriers[index] || "—",
    facilitator: facilitators[index] || "—",
    accommodation: accommodations[index] || "—",
  }));
}

function normalizeDbGoal(goal) {
  return {
    type: goal.subject_category || goal.goalName || "Goal",
    annualGoal: goal.annual_goal || goal.goalName || "—",
    rows: (goal.objective_rows || []).map((row) => ({
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

function getIepSectionBRows(iep) {
  if (!iep) return [];
  const details = normalizeGeneratedDetails(iep);
  if (Array.isArray(details.barrierRows) && details.barrierRows.length) {
    return details.barrierRows.map((row) => ({
      difficulty: row.difficulty || "—",
      barrierQualifier: row.barrierQualifier || row.learningBarrier || row.barrier || "—",
      facilitator: row.facilitator || row.learningFacilitator || "—",
      accommodation: row.accommodation || row.learningAccommodation || "—",
    }));
  }
  return buildBarrierRowsFromFlat(iep);
}

function getIepFallbackGoals(iep) {
  if (!iep) return [];
  const details = normalizeGeneratedDetails(iep);
  if (Array.isArray(details.learnerGoals) && details.learnerGoals.length) {
    return details.learnerGoals;
  }
  if (iep.goals) {
    return [
      {
        type: "Goals",
        annualGoal: iep.goals,
        rows: [],
      },
    ];
  }
  return [];
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildStudentRecordHtml(d) {
  const difficulties = d.difficultyMarkers?.length
    ? d.difficultyMarkers
    : ["No difficulty markers recorded."];
  const sectionBRows = d.sectionBRows?.length ? d.sectionBRows : [];
  const learnerGoals = d.learnerGoals?.length ? d.learnerGoals : [];

  const row = (label, value) => `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value || "—")}</td>
    </tr>`;

  const sectionBHtml = sectionBRows.length
    ? sectionBRows
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.difficulty || "—")}</td>
            <td>${escapeHtml(item.barrierQualifier || "—")}</td>
            <td>${escapeHtml(item.facilitator || "—")}</td>
            <td>${escapeHtml(item.accommodation || "—")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="4">No Section B details available.</td></tr>`;

  const goalRowsHtml = (rows = []) =>
    rows.length
      ? rows
          .map(
            (row) => `
            <tr>
              <td>${escapeHtml(row.objective || "—")}</td>
              <td>${escapeHtml(row.interventions || "—")}</td>
              <td>${escapeHtml(row.timeline || "—")}</td>
              <td>${escapeHtml(row.responsible || "—")}</td>
              <td>${escapeHtml(row.evaluation || "—")}</td>
              <td>${escapeHtml(row.remarks || "—")}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="6">No objective rows available.</td></tr>`;

  const goalsHtml = learnerGoals.length
    ? learnerGoals
        .map(
          (goal) => `
          <h3>${escapeHtml(goal.type || "Goal")} — Annual Goal / Long Term</h3>
          <div class="box">${escapeHtml(goal.annualGoal || "—")}</div>
          <table>
            <thead>
              <tr>
                <th>Enroute Objectives / Procedure</th>
                <th>Interventions / Activities / Procedure</th>
                <th>Timeline / Session</th>
                <th>Individuals Responsible</th>
                <th>Progress / Instructional Evaluation</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${goalRowsHtml(goal.rows)}</tbody>
          </table>`,
        )
        .join("")
    : `<div class="box">No learner goals available.</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Record - ${escapeHtml(d.name || "Student")}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45; padding: 24px; }
    h1 { margin: 0 0 8px; color: #5aabf0; }
    h2 { margin: 24px 0 10px; color: #5aabf0; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    h3 { color: #2d7fc4; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; text-align: left; }
    th { width: 32%; background: #eef6fd; color: #2d7fc4; }
    thead th { background: #5aabf0; color: #ffffff; }
    .box { border: 1px solid #d1d5db; padding: 10px; margin: 8px 0; white-space: pre-wrap; }
    ul { margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Student Record</h1>
  <p><strong>Generated for:</strong> ${escapeHtml(d.name || "—")}</p>

  <h2>Section A: Personal Information</h2>
  <table>
    ${row("Student Name", d.name)}
    ${row("Student ID", d.studentID)}
    ${row("Age", d.age)}
    ${row("Grade Level", d.grade)}
    ${row("Gender", d.gender)}
    ${row("School", d.school)}
    ${row("School Year", d.schoolYear)}
    ${row("Birthdate", d.birthdate)}
    ${row("Diagnosis", d.disabilityCategory)}
    ${row("Status", d.profileStatus)}
  </table>
  <h2>Assessment / Diagnosis Details</h2>
  <div class="box">${escapeHtml(d.diagnosisDetails || "—")}</div>
  <h2>Difficulties marked based on assessment</h2>
  <ul>${difficulties.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>

  <h2>Present Levels of Academic Achievement and/or Functional Performance</h2>
  <h3>Evaluation and school assessments</h3>
  <div class="box">${escapeHtml(d.presentEvaluation || "—")}</div>
  <h3>Academic, developmental, and/or functional strengths</h3>
  <div class="box">${escapeHtml(d.academicStrengths || "—")}</div>
  <h3>Academic, developmental, and/or functional needs</h3>
  <div class="box">${escapeHtml(d.academicNeeds || "—")}</div>
  <h3>Parental concerns</h3>
  <div class="box">${escapeHtml(d.parentalConcerns || "—")}</div>
  <h3>Impact on general education curriculum</h3>
  <div class="box">${escapeHtml(d.curriculumImpact || "—")}</div>

  <h2>Section B: Difficulties, Barriers, and Enabling Supports</h2>
  ${d.latestIepMeta ? `<p><strong>Source IEP:</strong> ${escapeHtml(d.latestIepMeta)}</p>` : ""}
  <table>
    <thead>
      <tr>
        <th>Difficulty</th>
        <th>Learning Barriers</th>
        <th>Learning Facilitators</th>
        <th>Accommodation</th>
      </tr>
    </thead>
    <tbody>${sectionBHtml}</tbody>
  </table>

  <h2>Section C: Learner's Goals</h2>
  ${goalsHtml}
</body>
</html>`;
}

function StepIndicator({ step }) {
  const steps = ["Section A", "Present Levels", "Section B & C"];
  return (
    <div className="vsr-steps">
      {steps.map((label, i) => (
        <div
          key={i}
          className={`vsr-step ${i + 1 === step ? "vsr-step-active" : i + 1 < step ? "vsr-step-done" : ""}`}
        >
          <div className="vsr-step-circle">{i + 1 < step ? "✓" : i + 1}</div>
          <span className="vsr-step-label">{label}</span>
          {i < steps.length - 1 && <div className="vsr-step-line" />}
        </div>
      ))}
    </div>
  );
}

// ── PAGE 1: Section A ──────────────────────────────────────────────────────
function PageSectionA({ d, onNext, onBack }) {
  const difficulties = d.difficultyMarkers?.length
    ? d.difficultyMarkers
    : ["No difficulty markers recorded."];

  return (
    <div className="vsr-page">
      <h3 className="vsr-section-title">Section A: Personal Information</h3>

      <div className="vsr-grid-2">
        <RecordField label="Student Name" value={d.name} />
        <RecordField label="Student ID" value={d.studentID} />
        <RecordField label="Age" value={d.age} />
        <RecordField label="Grade Level" value={d.grade} />
        <RecordField label="Gender" value={d.gender} />
        <RecordField label="School" value={d.school} />
        <RecordField label="School Year" value={d.schoolYear} />
        <RecordField label="Birthdate" value={d.birthdate} />
        <RecordField label="Diagnosis" value={d.disabilityCategory} />
        <RecordField label="Status" value={d.profileStatus} />
      </div>

      <RecordTextarea
        label="Assessment / Diagnosis Details"
        value={d.diagnosisDetails}
      />

      <div className="vsr-field-group vsr-field-full">
        <span className="vsr-field-label">
          Difficulties marked based on assessment
        </span>
        <div className="vsr-difficulty-list">
          {difficulties.map((item, i) => (
            <div key={i} className="vsr-difficulty-chip">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="vsr-page-actions">
        <button className="btn vsr-theme-btn" onClick={onBack}>
          ← Back to List
        </button>
        <button className="btn btn-submit" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── PAGE 2: Present Levels ─────────────────────────────────────────────────
function PagePresentLevels({ d, onNext, onBack }) {
  return (
    <div className="vsr-page">
      <h3 className="vsr-section-title">
        Present Levels of Academic Achievement and/or Functional Performance
      </h3>

      <RecordTextarea
        label="Results of initial or most recent evaluation and results of school assessments"
        value={d.presentEvaluation}
      />
      <RecordTextarea
        label="Description of academic, developmental, and/or functional strengths"
        value={d.academicStrengths}
      />
      <RecordTextarea
        label="Description of academic, developmental, and/or functional needs"
        value={d.academicNeeds}
      />
      <RecordTextarea
        label="Parental concerns regarding the child's education"
        value={d.parentalConcerns}
      />
      <RecordTextarea
        label="Impact of the disability on involvement and progress in the general education curriculum"
        value={d.curriculumImpact}
      />

      <div className="vsr-page-actions">
        <button className="btn vsr-theme-btn" onClick={onBack}>
          ← Previous
        </button>
        <button className="btn btn-submit" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── PAGE 3: Section B + Section C from saved IEP ───────────────────────────
function LearnerGoalTable({ rows = [] }) {
  const columns = [
    ["objective", "ENROUTE OBJECTIVES / PROCEDURE"],
    ["interventions", "INTERVENTIONS / ACTIVITIES / PROCEDURE"],
    ["timeline", "TIMELINE / SESSION"],
    ["responsible", "INDIVIDUALS RESPONSIBLE"],
    ["evaluation", "PROGRESS / INSTRUCTIONAL EVALUATION"],
    ["remarks", "REMARKS"],
  ];

  if (!rows.length) {
    return <p className="vsr-goals-empty">No objective rows available.</p>;
  }

  return (
    <div className="vsr-table-scroll">
      <table className="vsr-table vsr-goal-table">
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map(([field]) => (
                <td key={field}>{row[field] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageSectionBC({ d, onBack, onExportPdf }) {
  const sectionBRows = d.sectionBRows || [];
  const learnerGoals = d.learnerGoals || [];

  return (
    <div className="vsr-page">
      <h3 className="vsr-section-title">
        Section B: Difficulties, Barriers, and Enabling Supports
      </h3>

      {d.latestIepMeta && (
        <p className="vsr-source-note">Showing saved IEP contents from {d.latestIepMeta}.</p>
      )}

      <div className="vsr-table-scroll">
        <table className="vsr-table">
          <thead>
            <tr>
              <th>Difficulty</th>
              <th>Learning Barriers</th>
              <th>Learning Facilitators</th>
              <th>Accommodation</th>
            </tr>
          </thead>
          <tbody>
            {sectionBRows.length ? (
              sectionBRows.map((row, index) => (
                <tr key={index}>
                  <td>{row.difficulty || "—"}</td>
                  <td>{row.barrierQualifier || "—"}</td>
                  <td>{row.facilitator || "—"}</td>
                  <td>{row.accommodation || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="vsr-table-empty">
                  No Section B details available from a saved IEP.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="vsr-section-title" style={{ marginTop: 24 }}>
        Section C: Learner's Goals
      </h3>

      {learnerGoals.length ? (
        learnerGoals.map((goal, index) => (
          <div className="vsr-goal-card" key={goal.type || index}>
            <p className="vsr-goals-header">
              {goal.type || "Goal"} — Annual Goal / Long Term
            </p>
            <div className="vsr-goal-annual">{goal.annualGoal || "—"}</div>
            <LearnerGoalTable rows={goal.rows || []} />
          </div>
        ))
      ) : (
        <div className="vsr-goals-box">
          <p className="vsr-goals-header">Goals</p>
          <p className="vsr-goals-empty">No learner goals available from a saved IEP.</p>
        </div>
      )}

      <div className="vsr-page-actions">
        <button className="btn vsr-theme-btn" onClick={onBack}>
          ← Previous
        </button>
        <div className="vsr-export-actions">
          <button className="btn vsr-export-pdf-btn" onClick={onExportPdf}>
            ↗ Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ViewStudentRecords() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");

  // Record detail state
  const [selected, setSelected] = useState(null); // raw student row
  const [recordData, setRecordData] = useState(null); // merged display data
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [recordStep, setRecordStep] = useState(1); // 1 | 2 | 3

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (s) => {
    setSelected(s);
    setRecordStep(1);
    setLoadingDetail(true);

    const selectedStudentId = s.studentID || s.id || s.pk;

    try {
      const [studentResponse, iepListResponse] = await Promise.all([
        studentsAPI.get(selectedStudentId),
        user?.id ? iepAPI.listByStudent(selectedStudentId, user.id) : Promise.resolve([]),
      ]);

      const raw = studentResponse.data || studentResponse;
      const pd = raw.profileDetails || {};
      const iepList = Array.isArray(iepListResponse)
        ? iepListResponse
        : iepListResponse.results || iepListResponse.data || [];
      const latestIep = [...iepList].sort((a, b) => {
        const versionDiff = Number(b.version || 0) - Number(a.version || 0);
        if (versionDiff) return versionDiff;
        return new Date(b.created_at || b.dateCreated || 0) - new Date(a.created_at || a.dateCreated || 0);
      })[0] || null;

      let learnerGoals = getIepFallbackGoals(latestIep);
      if (latestIep?.iepID) {
        try {
          const goalResponse = await iepAPI.listGoalsByIep(latestIep.iepID);
          const dbGoals = Array.isArray(goalResponse)
            ? goalResponse
            : goalResponse.results || goalResponse.data || [];
          if (dbGoals.length) learnerGoals = dbGoals.map(normalizeDbGoal);
        } catch {
          learnerGoals = getIepFallbackGoals(latestIep);
        }
      }

      setRecordData({
        ...PLACEHOLDER,
        name: raw.name || pd.studentName || PLACEHOLDER.name,
        studentID: String(raw.studentID || selectedStudentId || PLACEHOLDER.studentID),
        age: String(raw.age || PLACEHOLDER.age),
        grade: String(raw.grade || PLACEHOLDER.grade),
        gender: raw.gender || PLACEHOLDER.gender,
        school: pd.school || PLACEHOLDER.school,
        schoolYear: pd.schoolYear || PLACEHOLDER.schoolYear,
        birthdate: pd.birthdate || PLACEHOLDER.birthdate,
        disabilityCategory:
          pd.disabilityCategory || raw.diagnosis || PLACEHOLDER.disabilityCategory,
        profileStatus: raw.profileStatus ? "Active" : "Inactive",
        diagnosisDetails:
          pd.diagnosisDetails || raw.asdBackground || PLACEHOLDER.diagnosisDetails,
        difficultyMarkers: pd.difficultyMarkers || PLACEHOLDER.difficultyMarkers,
        presentEvaluation:
          pd.presentEvaluation || raw.assessmentResult || PLACEHOLDER.presentEvaluation,
        academicStrengths: pd.academicStrengths || PLACEHOLDER.academicStrengths,
        academicNeeds: pd.academicNeeds || raw.support_needs || PLACEHOLDER.academicNeeds,
        parentalConcerns: pd.parentalConcerns || PLACEHOLDER.parentalConcerns,
        curriculumImpact: pd.curriculumImpact || PLACEHOLDER.curriculumImpact,
        sectionBRows: getIepSectionBRows(latestIep),
        learnerGoals,
        latestIepMeta: latestIep
          ? `Version ${latestIep.version || "—"}${latestIep.formattedDate ? ` · ${latestIep.formattedDate}` : ""}`
          : "",
      });
    } catch {
      setRecordData({
        ...PLACEHOLDER,
        name: s.name,
        grade: String(s.grade),
        age: String(s.age),
        sectionBRows: [],
        learnerGoals: [],
        latestIepMeta: "",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setSelected(null);
    setRecordData(null);
    setRecordStep(1);
  };


  const handleExportPdf = () => {
    if (!recordData) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to export the student record as PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildStudentRecordHtml(recordData));
    printWindow.document.close();
    printWindow.document.title = `Student Record - ${recordData.name || "Student"}`;
    printWindow.focus();
    setTimeout(() => {
      printWindow.document.title = `Student Record - ${recordData.name || "Student"}`;
      printWindow.print();
    }, 500);
  };


  const filtered = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true;
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // ── Record detail view (3 steps) ──────────────────────────────────────
  if (selected) {
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Student Records</span>
        </div>
        <div className="om-body">
          <div className="vsr-record-wrap">
            <StepIndicator step={recordStep} />

            {loadingDetail ? (
              <div className="om-card">
                <p className="om-empty">Loading record…</p>
              </div>
            ) : (
              <>
                {recordStep === 1 && (
                  <PageSectionA
                    d={recordData}
                    onNext={() => setRecordStep(2)}
                    onBack={handleBackToList}
                  />
                )}
                {recordStep === 2 && (
                  <PagePresentLevels
                    d={recordData}
                    onNext={() => setRecordStep(3)}
                    onBack={() => setRecordStep(1)}
                  />
                )}
                {recordStep === 3 && (
                  <PageSectionBC
                    d={recordData}
                    onBack={() => setRecordStep(2)}
                    onExportPdf={handleExportPdf}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Student list ───────────────────────────────────────────────────────
  return (
    <div className="page-content">
      <div className="om-header">
        <span className="om-header-title">View Student Records</span>
      </div>
      <div className="om-body">
        <div className="om-card">
          <h2 className="om-list-title">List of Students</h2>
          {error && (
            <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>
              ⚠️ {error}
            </p>
          )}
          <div className="om-search-bar">
            <input
              className="form-input om-search-input"
              placeholder="Search Student Records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="om-filters">
              <span className="om-filter-label">Filter:</span>
              <select
                className="form-select om-filter-select"
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
                className="form-select om-filter-select"
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

          <div className="om-student-list">
            {loading ? (
              <StudentShimmer />
            ) : filtered.length === 0 ? (
              <EmptyState message="No students found." />
            ) : (
              filtered.map((s) => (
                <div key={s.studentID} className="om-student-row">
                  <div className="va-student-avatar" />
                  <div className="va-student-info">
                    <span className="va-student-name">{s.name}</span>
                    <span className="va-student-grade">Grade – {s.grade}</span>
                  </div>
                  <button
                    className="va-select-btn"
                    onClick={() => handleSelect(s)}
                  >
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
