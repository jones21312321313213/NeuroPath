import { useEffect, useMemo, useState } from "react";
import "../../styles/ViewSelectedStudentProfile.css";
import StudentInsightsTab from "./StudentInsightsTab";

function getProfileDetails(student) {
  if (student?.profileDetails && typeof student.profileDetails === "object") {
    return student.profileDetails;
  }

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

export default function ViewSelectedStudentProfile({ studentId, setActivePage }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);

    fetch(`http://localhost:8000/api/users/students/${studentId}/view/`)
      .then((res) => res.json())
      .then((response) => {
        setSelected(response?.data || response);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [studentId]);

  const details = useMemo(() => getProfileDetails(selected), [selected]);
  const handleBack = () => setActivePage("view-student-profile");
  const handleUpdate = () => setActivePage("update-student-profile");

  if (loading) {
    return (
      <div className="page-content">
        <div className="placeholder-page">Loading student details...</div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="page-content">
        <div className="placeholder-page">No student details found.</div>
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
            Generate AI Insights
          </button>
        </div>

        {activeTab === "info" && (
          <div className="tab-content">
            <section className="form-section">
              <h2 className="form-section-title">Section A: Personal Information</h2>
              <div className="form-grid-2">
                <ReadOnlyInput label="Student Name" value={details.studentName || details.learnerName || selected.name} />
                <ReadOnlyInput label="Age" value={selected.age} />
                <ReadOnlyInput label="Grade Level" value={selected.grade} />
                <ReadOnlyInput label="Gender" value={selected.gender} />
                <ReadOnlyInput label="School" value={details.school} />
                <ReadOnlyInput label="School Year" value={details.schoolYear} />
                <ReadOnlyInput label="Birthdate" value={details.birthdate} />
                <ReadOnlyInput label="Diagnosis" value={details.disabilityCategory || selected.diagnosis} />
              </div>

              <ReadOnlyTextArea
                label="Assessment / Diagnosis Details"
                value={details.diagnosisDetails || selected.asdBackground}
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
                value={details.presentEvaluation || selected.assessmentResult}
                rows={5}
              />
              <ReadOnlyTextArea
                label="Description of academic, developmental, and/or functional strengths"
                value={details.academicStrengths}
                rows={4}
              />
              <ReadOnlyTextArea
                label="Description of academic, developmental, and/or functional needs"
                value={details.academicNeeds || selected.support_needs}
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
          <StudentInsightsTab studentId={studentId} />
        )}
      </div>
    </div>
  );
}
