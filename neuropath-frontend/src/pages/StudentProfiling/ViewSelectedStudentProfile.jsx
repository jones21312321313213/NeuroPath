import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/ViewSelectedStudentProfile.css";
import StudentInsightsTab from "./StudentInsightsTab";
import { useStudent } from "../../hooks/queries";
import { Badge } from "../../components/ui";

function getProfileDetails(student) {
  const record = student?.data || student;
  if (record?.profileDetails && typeof record.profileDetails === "object") {
    return record.profileDetails;
  }

  if (!record?.preferences) return {};

  if (typeof record.preferences === "string") {
    try {
      const parsed = JSON.parse(record.preferences);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof record.preferences === "object" ? record.preferences : {};
}

function ReadOnlyInput({ label, value }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <input className="form-input" value={value || "—"} readOnly />
    </div>
  );
}

function ReadOnlyTextArea({ label, value, rows = 4 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" rows={rows} value={value || "—"} readOnly />
    </div>
  );
}

export default function ViewSelectedStudentProfile({ studentId: propStudentId, setActivePage }) {
  const params = useParams();
  const navigate = useNavigate();
  const studentId = propStudentId || params?.id;
  const [activeTab, setActiveTab] = useState("info");

  const {
    data: selected,
    isLoading,
    isError,
    error: queryError,
  } = useStudent(studentId);

  const student = selected?.data || selected;
  const details = useMemo(() => getProfileDetails(selected), [selected]);

  const handleBack = () => {
    if (setActivePage) setActivePage("view-student-profile");
    navigate("/dashboard/students");
  };
  const handleUpdate = () => {
    if (setActivePage) setActivePage("update-student-profile");
    navigate(`/dashboard/students/${studentId}/edit`);
  };

  if (isLoading && !selected) {
    return (
      <div className="page-content">
        <div className="placeholder-page">Loading student details...</div>
      </div>
    );
  }

  if (isError || !selected) {
    return (
      <div className="page-content">
        <div className="placeholder-page">
          {queryError?.message || "No student details found."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="form-card iep-card">
        <div className="form-actions">
          <button className="btn btn-back" onClick={handleBack}>←</button>
          {activeTab === "info" && (
            <button className="btn btn-submit" onClick={handleUpdate}>UPDATE</button>
          )}
        </div>

        <div className="tab-header">
          <button
            className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            Student Info
          </button>
          <button
            className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            Quick Student Summary
          </button>
        </div>

        {activeTab === "info" && (
          <div className="tab-content">
            <section className="form-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h2 className="form-section-title" style={{ margin: 0 }}>Section A: Personal Information</h2>
                {student?.parental_consent_obtained ? (
                  <Badge variant="success">
                    ✅ RA 10173 Consent Verified (Guardian: {student.guardian_name || "Parent/Guardian"})
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    ⚠️ RA 10173 Consent Pending — AI Processing Restricted
                  </Badge>
                )}
              </div>
              <div className="form-grid-2">
                <ReadOnlyInput label="Student Name" value={details.studentName || details.learnerName || student.name} />
                <ReadOnlyInput label="Age" value={student.age} />
                <ReadOnlyInput label="Grade Level" value={student.grade} />
                <ReadOnlyInput label="Gender" value={student.gender} />
                <ReadOnlyInput label="School" value={details.school} />
                <ReadOnlyInput label="School Year" value={details.schoolYear} />
                <ReadOnlyInput label="Birthdate" value={details.birthdate} />
                <ReadOnlyInput label="Diagnosis" value={details.disabilityCategory || student.diagnosis} />
              </div>

              <ReadOnlyTextArea
                label="Assessment / Diagnosis Details"
                value={details.diagnosisDetails || student.asdBackground}
                rows={3}
              />

              <ReadOnlyTextArea
                label="Difficulties marked based on assessment"
                value={(details.difficultyMarkers || []).join("\n") || "—"}
                rows={4}
              />
            </section>

            <section className="form-section">
              <h2 className="form-section-title">Present Levels of Academic Achievement and/or Functional Performance</h2>
              <ReadOnlyTextArea
                label="Results of initial or most recent evaluation and results of school assessments"
                value={details.presentEvaluation || student.assessmentResult}
                rows={5}
              />
              <ReadOnlyTextArea
                label="Description of academic, developmental, and/or functional strengths"
                value={details.academicStrengths}
                rows={4}
              />
              <ReadOnlyTextArea
                label="Description of academic, developmental, and/or functional needs"
                value={details.academicNeeds || student.support_needs}
                rows={4}
              />
              <ReadOnlyTextArea
                label="Parental concerns regarding the child’s education"
                value={details.parentalConcerns}
                rows={3}
              />
              <ReadOnlyTextArea
                label="Impact of the disability on involvement and progress in the general education curriculum"
                value={details.curriculumImpact}
                rows={3}
              />
            </section>
          </div>
        )}

        {activeTab === "insights" && (
          <StudentInsightsTab
            studentId={studentId}
            setActivePage={setActivePage}
            student={student}
          />
        )}
      </div>
    </div>
  );
}
