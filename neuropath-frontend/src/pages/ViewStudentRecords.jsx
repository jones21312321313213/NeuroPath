import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import "../styles/ViewStudentRecords.css";
import { iepAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StudentShimmer from "../components/StudentShimmer";

// ── Placeholder data shown when backend fields are missing ─────────────────
const PLACEHOLDER = {
  name: "Juan dela Cruz",
  age: "11",
  grade: "6",
  gender: "Male",
  school: "CIT",
  schoolYear: "2026-2027",
  birthdate: "10-15-1920",
  disabilityCategory: "Autism Spectrum Disorder",
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
  aiAccommodations: "",
  barrierRows: [],
  learnerGoals: [],
  iepVersion: "",
  iepDate: "",
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

// ── Read-only textarea used in Section A & B ───────────────────────────────
function RecordTextarea({ label, value }) {
  return (
    <div className="vsr-field-group vsr-field-full">
      <span className="vsr-field-label">{label}</span>
      <div className="vsr-field-textarea">{value || "—"}</div>
    </div>
  );
}

function normalizeGeneratedDetails(iep) {
  const raw = iep?.generatedDetails || iep?.details || null;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

function buildBarrierRowsFromIep(iep) {
  const details = normalizeGeneratedDetails(iep);
  if (Array.isArray(details.barrierRows) && details.barrierRows.length) {
    return details.barrierRows;
  }
  const difficulties = (iep?.difficulties || "").split("\n").filter(Boolean);
  const barriers = (iep?.learning_barriers || "").split("\n").filter(Boolean);
  const facilitators = (iep?.learning_facilitators || "").split("\n").filter(Boolean);
  const accommodations = (iep?.learning_accommodations || "").split("\n").filter(Boolean);
  return difficulties.map((difficulty, i) => ({
    difficulty,
    barrierQualifier: barriers[i] || "—",
    facilitator: facilitators[i] || "—",
    accommodation: accommodations[i] || "—",
  }));
}

function normalizeGoal(goal) {
  return {
    type: goal.subject_category || goal.goalName || goal.type || "Goal",
    annualGoal: goal.annual_goal || goal.annualGoal || goal.goalName || "—",
    rows: (goal.objective_rows || goal.rows || []).map((row, idx) => ({
      id: row.rowID || row.id || idx,
      objective: row.enroute_objectives || row.objective || "—",
      interventions: row.interventions_procedures || row.interventions || "—",
      timeline: row.timeline_mins_session || row.timeline || "—",
      responsible: row.individuals_responsible || row.responsible || "—",
      evaluation: row.progress_instructional || row.evaluation || "—",
      remarks: row.remarks || "—",
    })),
  };
}

function GoalTable({ rows = [] }) {
  if (!rows.length) return null;
  const columns = [
    ["objective", "Enroute Objectives / Procedure"],
    ["interventions", "Interventions / Activities / Procedure"],
    ["timeline", "Timeline / Session"],
    ["responsible", "Individuals Responsible"],
    ["evaluation", "Progress / Instructional Evaluation"],
    ["remarks", "Remarks"],
  ];
  return (
    <div className="vsr-table-scroll">
      <table className="vsr-table vsr-goal-table">
        <thead>
          <tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
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

// ── Step progress indicator ────────────────────────────────────────────────
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
        <RecordField label="Age" value={d.age} />
        <RecordField label="Grade Level" value={d.grade} />
        <RecordField label="Gender" value={d.gender} />
        <RecordField label="School" value={d.school} />
        <RecordField label="School Year" value={d.schoolYear} />
        <RecordField label="Birthdate" value={d.birthdate} />
        <RecordField label="Diagnosis" value={d.disabilityCategory} />
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
        <button className="btn btn-back" onClick={onBack}>
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
        <button className="btn btn-back" onClick={onBack}>
          ← Previous
        </button>
        <button className="btn btn-submit" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── PAGE 3: Section B + AI + Section C ────────────────────────────────────
function PageSectionBC({ d, onBack }) {
  const handleExport = () => {
    const goalHtml = (d.learnerGoals || [])
      .map(
        (goal) => `
          <section class="pdf-card">
            <h3>${goal.type || "Goal"} — Annual Goal / Long Term</h3>
            <p>${goal.annualGoal || "—"}</p>
            ${
              goal.rows?.length
                ? `<table><thead><tr><th>Enroute Objectives / Procedure</th><th>Interventions / Activities / Procedure</th><th>Timeline / Session</th><th>Individuals Responsible</th><th>Progress / Instructional Evaluation</th><th>Remarks</th></tr></thead><tbody>${goal.rows
                    .map(
                      (row) => `<tr><td>${row.objective || "—"}</td><td>${row.interventions || "—"}</td><td>${row.timeline || "—"}</td><td>${row.responsible || "—"}</td><td>${row.evaluation || "—"}</td><td>${row.remarks || "—"}</td></tr>`,
                    )
                    .join("")}</tbody></table>`
                : ""
            }
          </section>`,
      )
      .join("");

    const barrierHtml = (d.barrierRows || []).length
      ? (d.barrierRows || [])
          .map(
            (row) => `<tr><td>${row.difficulty || "—"}</td><td>${row.barrierQualifier || "—"}</td><td>${row.facilitator || "—"}</td><td>${row.accommodation || "—"}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="4">No Section B details available.</td></tr>`;

    const html = `<!doctype html><html><head><title>Student Record</title><style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; line-height: 1.45; }
      h1 { font-size: 18px; margin: 0 0 8px; color: #111; }
      h2 { font-size: 14px; margin: 18px 0 8px; color: #111; }
      h3 { font-size: 12px; margin: 0 0 8px; color: #111; }
      .meta { margin-bottom: 12px; color: #111; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; margin-bottom: 14px; }
      .field strong { display: inline-block; min-width: 110px; }
      .box, .pdf-card { border: 1px solid #cfd8e3; border-radius: 6px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; page-break-inside: auto; }
      th, td { border: 1px solid #cfd8e3; padding: 7px; vertical-align: top; color: #111; }
      th { background: #f2f4f7; font-weight: 700; }
      p { margin: 4px 0 8px; }
    </style></head><body>
      <h1>Student Record</h1>
      <div class="meta">IEP Version: ${d.iepVersion || "—"} ${d.iepDate ? `• ${d.iepDate}` : ""}</div>
      <div class="grid">
        <div class="field"><strong>Name:</strong> ${d.name || "—"}</div>
        <div class="field"><strong>Age:</strong> ${d.age || "—"}</div>
        <div class="field"><strong>Grade:</strong> ${d.grade || "—"}</div>
        <div class="field"><strong>Gender:</strong> ${d.gender || "—"}</div>
        <div class="field"><strong>School:</strong> ${d.school || "—"}</div>
        <div class="field"><strong>School Year:</strong> ${d.schoolYear || "—"}</div>
        <div class="field"><strong>Birthdate:</strong> ${d.birthdate || "—"}</div>
        <div class="field"><strong>Diagnosis:</strong> ${d.disabilityCategory || "—"}</div>
      </div>
      <h2>Present Levels</h2>
      <div class="box"><strong>Evaluation:</strong><p>${d.presentEvaluation || "—"}</p></div>
      <div class="box"><strong>Strengths:</strong><p>${d.academicStrengths || "—"}</p></div>
      <div class="box"><strong>Needs:</strong><p>${d.academicNeeds || "—"}</p></div>
      <div class="box"><strong>Parental Concerns:</strong><p>${d.parentalConcerns || "—"}</p></div>
      <div class="box"><strong>Curriculum Impact:</strong><p>${d.curriculumImpact || "—"}</p></div>
      <h2>Section B: Difficulties, Barriers, and Enabling Supports</h2>
      <table><thead><tr><th>Difficulty</th><th>Learning Barriers</th><th>Learning Facilitators</th><th>Accommodation</th></tr></thead><tbody>${barrierHtml}</tbody></table>
      ${d.aiAccommodations ? `<div class="box"><strong>AI-Generated Accommodations / Resources</strong><p>${d.aiAccommodations}</p></div>` : ""}
      <h2>Section C: Learner's Goals</h2>
      ${goalHtml || "<p>No learner goals available.</p>"}
      <script>window.onload = () => { window.print(); };</script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="vsr-page">
      <h3 className="vsr-section-title">
        Section B: Difficulties, Barriers, and Enabling Supports
      </h3>
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
            {d.barrierRows?.length ? (
              d.barrierRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.difficulty || "—"}</td>
                  <td>{row.barrierQualifier || "—"}</td>
                  <td>{row.facilitator || "—"}</td>
                  <td>{row.accommodation || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="vsr-table-empty">
                  No Section B details available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="vsr-section-title" style={{ marginTop: 24 }}>
        Section C: Learner's Goals
      </h3>
      {d.learnerGoals?.length ? (
        d.learnerGoals.map((goal, idx) => (
          <div key={`${goal.type}-${idx}`} className="vsr-goal-card">
            <h4>{goal.type} — Annual Goal / Long Term</h4>
            <p>{goal.annualGoal}</p>
            <GoalTable rows={goal.rows} />
          </div>
        ))
      ) : (
        <div className="vsr-goals-box">
          <p className="vsr-goals-empty">No learner goals available.</p>
        </div>
      )}

      <div className="vsr-page-actions">
        <button className="btn btn-back" onClick={onBack}>
          ← Previous
        </button>
        <button className="btn om-export-btn vsr-export-pdf-btn" onClick={handleExport}>
          EXPORT PDF
        </button>
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

  const handleSelect = (s) => {
    setSelected(s);
    setRecordStep(1);
    setLoadingDetail(true);

    studentsAPI
      .get(s.studentID)
      .then(async (res) => {
        const raw = res.data || res;
        const pd = raw.profileDetails || {};

        let latestIep = null;
        let learnerGoals = [];
        try {
          const iepRes = await iepAPI.listByStudent(s.studentID, user?.id);
          const iepList = Array.isArray(iepRes) ? iepRes : iepRes.results || iepRes.data || [];
          latestIep = iepList[0] || null;
          if (latestIep?.iepID) {
            const goalRes = await iepAPI.listGoalsByIep(latestIep.iepID);
            const goalList = Array.isArray(goalRes) ? goalRes : goalRes.results || goalRes.data || [];
            learnerGoals = goalList
              .filter((goal) => goal.subject_category !== "GENERAL" || goal.annual_goal)
              .map(normalizeGoal);

            const details = normalizeGeneratedDetails(latestIep);
            if (!learnerGoals.length && Array.isArray(details.learnerGoals)) {
              learnerGoals = details.learnerGoals.map(normalizeGoal);
            }
          }
        } catch {
          latestIep = null;
          learnerGoals = [];
        }

        const latestDetails = normalizeGeneratedDetails(latestIep);
        setRecordData({
          ...PLACEHOLDER,
          name: raw.name || pd.studentName || s.name || PLACEHOLDER.name,
          age: String(raw.age || s.age || PLACEHOLDER.age),
          grade: String(raw.grade || s.grade || PLACEHOLDER.grade),
          gender: raw.gender || PLACEHOLDER.gender,
          school: pd.school || PLACEHOLDER.school,
          schoolYear: pd.schoolYear || PLACEHOLDER.schoolYear,
          birthdate: pd.birthdate || PLACEHOLDER.birthdate,
          disabilityCategory:
            pd.disabilityCategory || raw.diagnosis || PLACEHOLDER.disabilityCategory,
          diagnosisDetails:
            pd.diagnosisDetails || raw.asdBackground || PLACEHOLDER.diagnosisDetails,
          difficultyMarkers: pd.difficultyMarkers || PLACEHOLDER.difficultyMarkers,
          presentEvaluation:
            pd.presentEvaluation || raw.assessmentResult || PLACEHOLDER.presentEvaluation,
          academicStrengths: pd.academicStrengths || PLACEHOLDER.academicStrengths,
          academicNeeds: pd.academicNeeds || raw.support_needs || PLACEHOLDER.academicNeeds,
          parentalConcerns: pd.parentalConcerns || PLACEHOLDER.parentalConcerns,
          curriculumImpact: pd.curriculumImpact || PLACEHOLDER.curriculumImpact,
          aiAccommodations: latestDetails.generatedAccommodations || latestIep?.accommodations || "",
          barrierRows: buildBarrierRowsFromIep(latestIep),
          learnerGoals,
          iepVersion: latestIep?.version || "",
          iepDate: latestIep?.formattedDate || "",
        });
      })
      .catch(() => {
        setRecordData({
          ...PLACEHOLDER,
          name: s.name,
          grade: String(s.grade),
          age: String(s.age),
        });
      })
      .finally(() => setLoadingDetail(false));
  };

  const handleBackToList = () => {
    setSelected(null);
    setRecordData(null);
    setRecordStep(1);
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
