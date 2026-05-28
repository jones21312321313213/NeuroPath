import { useState, useEffect } from "react";
import "../styles/OutcomeMonitoring.css";
import "../styles/ViewStudentRecords.css";
import { studentsAPI } from "../api/client";
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
  aiAccommodations:
    "Provide a high-contrast visual schedule track, break multi-sentence tasks into single-step prompts, offer tactile tracking pointers, and allow sensory breaks after 15 minutes of continuous text interaction.",
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
  return (
    <div className="vsr-page">
      {/* Section B */}
      <h3 className="vsr-section-title">
        Section B: Difficulties, Barriers, and Enabling Supports
      </h3>
      <table className="vsr-table">
        <thead>
          <tr>
            <th>Difficulty</th>
            <th>Learning Barriers</th>
            <th>Learning Facilitators</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} className="vsr-table-empty">
              No Section B details available.
            </td>
          </tr>
        </tbody>
      </table>

      {/* AI Accommodations */}
      <div className="vsr-ai-box">
        <p className="vsr-ai-title">AI-Generated Accommodations / Resources</p>
        <p className="vsr-ai-text">
          {d.aiAccommodations || "No AI accommodations generated yet."}
        </p>
      </div>

      {/* Section C */}
      <h3 className="vsr-section-title" style={{ marginTop: 24 }}>
        Section C: Learner's Goals
      </h3>
      <div className="vsr-goals-box">
        <p className="vsr-goals-header">Goals</p>
        <p className="vsr-goals-empty">No information available.</p>
      </div>

      <div className="vsr-page-actions">
        <button className="btn btn-back" onClick={onBack}>
          ← Previous
        </button>
        <button className="btn om-export-btn">EXPORT</button>
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
      .then((res) => {
        const raw = res.data || res;
        // Merge top-level fields + profileDetails JSON into one flat object,
        // falling back to PLACEHOLDER so the UI is never empty.
        const pd = raw.profileDetails || {};
        setRecordData({
          ...PLACEHOLDER,
          name: raw.name || pd.studentName || PLACEHOLDER.name,
          studentID: String(
            raw.studentID || s.studentID || PLACEHOLDER.studentID,
          ),
          age: String(raw.age || PLACEHOLDER.age),
          grade: String(raw.grade || PLACEHOLDER.grade),
          gender: raw.gender || PLACEHOLDER.gender,
          school: pd.school || PLACEHOLDER.school,
          schoolYear: pd.schoolYear || PLACEHOLDER.schoolYear,
          birthdate: pd.birthdate || PLACEHOLDER.birthdate,
          disabilityCategory:
            pd.disabilityCategory ||
            raw.diagnosis ||
            PLACEHOLDER.disabilityCategory,
          profileStatus: raw.profileStatus ? "Active" : "Inactive",
          diagnosisDetails:
            pd.diagnosisDetails ||
            raw.asdBackground ||
            PLACEHOLDER.diagnosisDetails,
          difficultyMarkers:
            pd.difficultyMarkers || PLACEHOLDER.difficultyMarkers,
          presentEvaluation:
            pd.presentEvaluation ||
            raw.assessmentResult ||
            PLACEHOLDER.presentEvaluation,
          academicStrengths:
            pd.academicStrengths || PLACEHOLDER.academicStrengths,
          academicNeeds:
            pd.academicNeeds || raw.support_needs || PLACEHOLDER.academicNeeds,
          parentalConcerns: pd.parentalConcerns || PLACEHOLDER.parentalConcerns,
          curriculumImpact: pd.curriculumImpact || PLACEHOLDER.curriculumImpact,
          aiAccommodations:
            raw.aiAccommodations || PLACEHOLDER.aiAccommodations,
        });
      })
      .catch(() => {
        // If the API call fails, show placeholders so the UI still works
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
