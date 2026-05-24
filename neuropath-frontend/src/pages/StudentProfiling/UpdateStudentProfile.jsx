import { useEffect, useState } from "react";
import "../../styles/UpdateStudentProfile.css";

const SUPPORT_NEEDS = ['Minimal Support', 'Moderate Support', 'Substantial Support', 'Full Support'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const ACADEMIC_LEVELS = ['Below Grade Level', 'At Grade Level', 'Above Grade Level'];
const LEARNING_STYLES = ['Visual', 'Auditory', 'Kinesthetic', 'Read/Write'];
const INTERESTS = ['Arts & Crafts', 'Music', 'Sports', 'Technology', 'Nature', 'Reading'];
const SENSORY_PREFS = ['Low Stimulation', 'Moderate Stimulation', 'High Stimulation'];

function SelectField({ id, options, value, onChange, placeholder = 'Choose' }) {
  return (
    <select id={id} className="form-select gray-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export default function UpdateStudentProfile({ studentId, onBack }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetch(`http://localhost:8000/api/users/students/${studentId}/`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          fullName: data.name || "—",
          age: data.age || "—",
          gradeLevel: data.grade || "—",
          gender: data.gender || "",
          asdBackground: data.asdBackground || "—",
          diagnosis: data.diagnosis || "—",
          supportNeeds: data.supportNeeds || "",
          academicLevel: data.academicLevel || "",
          behavioralNotes: data.behavioralNotes || "—",
          assessmentResult: data.assessmentResult || "—",
          learningStyle: data.learningStyle || "",
          interests: data.interests || "",
          sensoryPreferences: data.sensoryPreferences || "",
          preferences: data.preferences || "—",
          profileStatus: data.profileStatus ? "Active" : "Inactive",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [studentId]);

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8000/api/users/students/${studentId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update student");
        return res.json();
      })
      .then(() => {
        alert("Student profile updated successfully!");
        onBack();
      })
      .catch((err) => {
        console.error(err);
        alert("Error updating student profile.");
      });
  };

  if (loading || !form) {
    return (
      <div className="page-content">
        <div className="placeholder-page">Loading student profile...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="form-card">

        {/* ACTION BUTTONS */}
        <div className="form-actions">
          <button className="btn btn-back" onClick={onBack}>←</button>
          <button className="btn btn-submit" onClick={handleSubmit}>SAVE</button>
        </div>

        {/* STUDENT INFORMATION */}
        <section className="form-section">
          <h2 className="form-section-title">Update Student Information</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name:</label>
              <input className="form-input gray-input" value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Age:</label>
              <input className="form-input gray-input" type="number" value={form.age} onChange={(e) => set("age")(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Grade Level:</label>
              <input className="form-input gray-input" value={form.gradeLevel} onChange={(e) => set("gradeLevel")(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender:</label>
              <SelectField id="gender" options={GENDER_OPTIONS} value={form.gender} onChange={set("gender")} />
            </div>
          </div>
        </section>

        {/* ASD BACKGROUND */}
        <section className="form-section">
          <h2 className="form-section-title">ASD Background</h2>
          <div className="form-group">
            <label className="form-label">Background Notes:</label>
            <textarea className="form-textarea gray-input" value={form.asdBackground} onChange={(e) => set("asdBackground")(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Diagnosis:</label>
            <input className="form-input gray-input" value={form.diagnosis} onChange={(e) => set("diagnosis")(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Support Needs:</label>
            <SelectField id="supportNeeds" options={SUPPORT_NEEDS} value={form.supportNeeds} onChange={set("supportNeeds")} />
          </div>
        </section>

        {/* ASSESSMENT RESULTS */}
        <section className="form-section">
          <h2 className="form-section-title">Assessment Results</h2>
          <div className="form-group">
            <label className="form-label">Academic Level:</label>
            <SelectField id="academicLevel" options={ACADEMIC_LEVELS} value={form.academicLevel} onChange={set("academicLevel")} />
          </div>
          <div className="form-group">
            <label className="form-label">Behavioral Notes:</label>
            <textarea className="form-textarea gray-input" value={form.behavioralNotes} onChange={(e) => set("behavioralNotes")(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Assessment Result:</label>
            <textarea className="form-textarea gray-input" value={form.assessmentResult} onChange={(e) => set("assessmentResult")(e.target.value)} />
          </div>
        </section>

        {/* PREFERENCES */}
        <section className="form-section">
          <h2 className="form-section-title">Preferences</h2>
          <div className="form-grid-preferences">
            <div className="form-group">
              <label className="form-label">Learning Style:</label>
              <SelectField id="learningStyle" options={LEARNING_STYLES} value={form.learningStyle} onChange={set("learningStyle")} />
            </div>
            <div className="form-group">
              <label className="form-label">Interests:</label>
              <SelectField id="interests" options={INTERESTS} value={form.interests} onChange={set("interests")} />
            </div>
            <div className="form-group">
              <label className="form-label">Sensory Preferences:</label>
              <SelectField id="sensoryPreferences" options={SENSORY_PREFS} value={form.sensoryPreferences} onChange={set("sensoryPreferences")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Other Preferences:</label>
            <textarea className="form-textarea gray-input" value={form.preferences} onChange={(e) => set("preferences")(e.target.value)} />
          </div>
        </section>

      </div>
    </div>
  );
}
