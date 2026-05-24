import { useEffect, useState } from "react";
import "../../styles/ViewSelectedStudentProfile.css";
import StudentInsightsTab from "./StudentInsightsTab";

export default function ViewSelectedStudentProfile({ studentId, setActivePage }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info"); // "info" or "insights"
  const [insights, setInsights] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    // Fetch student info
    fetch(`http://localhost:8000/api/users/students/${studentId}/`)
      .then((res) => res.json())
      .then((data) => {
        setSelected(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Fetch existing insights history
    fetch(`http://localhost:8000/api/users/students/${studentId}/generate-insight/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.insights) setInsights(data.insights);
      })
      .catch((err) => console.error(err));
  }, [studentId]);

  const handleBack = () => setActivePage("view-student-profile");
  const handleUpdate = () => setActivePage("update-student-profile");

  const handleGenerateInsight = () => {
    setGenerating(true);
    fetch(`http://localhost:8000/api/users/students/${studentId}/generate-insight/`, {
      method: "POST"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.insights) {
          setInsights(prev => [...prev, { timestamp: new Date(), items: data.insights }]);
        }
        setGenerating(false);
      })
      .catch((err) => {
        console.error(err);
        setGenerating(false);
      });
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="placeholder-page">Loading student details...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="form-card">

        {/* ACTION BUTTONS (top) */}
       {/* ACTION BUTTONS (top) */}
        <div className="form-actions">
        <button className="btn btn-back" onClick={handleBack}>←</button>

        {/* Only show UPDATE if activeTab === "info" */}
        {activeTab === "info" && (
            <button className="btn btn-submit" onClick={handleUpdate}>UPDATE</button>
        )}
        </div>


        {/* TAB HEADERS */}
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

        {/* TAB CONTENT */}
        {activeTab === "info" && (
          <div className="tab-content">
            {/* STUDENT INFORMATION */}
            <section className="form-section">
              <h2 className="form-section-title">Student Information</h2>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name:</label>
                  <input className="form-input" value={selected.name} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Student ID:</label>
                  <input className="form-input" value={selected.studentID} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Age:</label>
                  <input className="form-input" value={selected.age} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Grade Level:</label>
                  <input className="form-input" value={selected.grade} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender:</label>
                  <input className="form-input" value={selected.gender} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Status:</label>
                  <input className="form-input" value={selected.profileStatus ? "Active" : "Inactive"} readOnly />
                </div>
              </div>
            </section>

            {/* ASD BACKGROUND */}
            <section className="form-section">
              <h2 className="form-section-title">ASD Background</h2>
              <div className="form-group">
                <label className="form-label">Background Notes:</label>
                <textarea className="form-textarea" value={selected.asdBackground} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnosis:</label>
                <input className="form-input" value={selected.diagnosis || "—"} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Support Needs:</label>
                <input className="form-input" value={selected.supportNeeds || "—"} readOnly />
              </div>
            </section>

            {/* ASSESSMENT RESULTS */}
            <section className="form-section">
              <h2 className="form-section-title">Assessment Results</h2>
              <div className="form-group">
                <label className="form-label">Academic Level:</label>
                <input className="form-input" value={selected.academicLevel || "—"} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Behavioral Notes:</label>
                <textarea className="form-textarea" value={selected.behavioralNotes || "—"} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Assessment Result:</label>
                <textarea className="form-textarea" value={selected.assessmentResult} readOnly />
              </div>
            </section>

            {/* PREFERENCES */}
            <section className="form-section">
              <h2 className="form-section-title">Preferences</h2>
              <div className="form-grid-preferences">
                <div className="form-group">
                  <label className="form-label">Learning Style:</label>
                  <input className="form-input" value={selected.learningStyle || "—"} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Interests:</label>
                  <input className="form-input" value={selected.interests || "—"} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Sensory Preferences:</label>
                  <input className="form-input" value={selected.sensoryPreferences || "—"} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Other Preferences:</label>
                <textarea className="form-textarea" value={selected.preferences} readOnly />
              </div>
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
