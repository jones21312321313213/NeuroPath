import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ValidationModal } from "../components/ui";

const difficultyOptions = [
  "Difficulty in Seeing",
  "Difficulty in Hearing",
  "Difficulty in Communicating",
  "Difficulty in Moving/Walking",
  "Difficulty in Concentrating/Paying Attention",
  "Difficulty in Remembering/Understanding",
  "With Medical Assessment/Diagnosis",
];

const diagnosisOptions = ["Autism Spectrum Disorder"];

const genderOptions = ["Male", "Female"];

function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  min,
  max,
}) {
  const inputId = label
    ? `field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">
        {label}:
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-input"
        min={min}
        max={max}
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  const selectId = label
    ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={selectId} className="form-label">
        {label}:
      </label>
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className="form-select"
      >
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  helpText,
}) {
  const areaId = label
    ? `area-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={areaId} className="form-label">
        {label}
      </label>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        id={areaId}
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
const initialFormState = {
  school: "",
  schoolYear: "",
  learnerName: "",
  age: "",
  gradeLevel: "",
  gender: "",
  birthdate: "",
  disabilityCategory: "Autism Spectrum Disorder",
  diagnosisDetails: "",
  difficultyMarkers: [],
  presentEvaluation: "",
  academicStrengths: "",
  academicNeeds: "",
  parentalConcerns: "",
  curriculumImpact: "",
  parentalConsentObtained: false,
  consentDate: new Date().toISOString().split("T")[0],
  guardianName: "",
  guardianRelationship: "Parent",
};

function SuccessModal({
  studentName,
  onGenerateIEP,
  onViewProfile,
  onAddAnother,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(26, 58, 74, 0.45)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl"
        style={{
          background: "#fff",
          border: "1px solid rgba(130,199,255,0.3)",
          boxShadow: "0 24px 60px rgba(37,137,199,0.18)",
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
          style={{ background: "#e6f7ec", border: "2px solid #b7e4c7" }}
        >
          <svg
            className="w-8 h-8 text-emerald-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <h2
          className="text-xl font-black tracking-tight mb-2"
          style={{ color: "#1a3a4a" }}
        >
          Profile Created!
        </h2>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "#4a7a94" }}
        >
          <span className="font-bold" style={{ color: "#1a6fa8" }}>
            {studentName}
          </span>
          's student profile has been successfully added to NeuroPath.
        </p>

        {/* Next Step Action CTAs */}
        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onGenerateIEP}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
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
            <span>Generate IEP for this student</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            onClick={onViewProfile}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
            style={{
              background: "#f0f7fc",
              color: "#1a6fa8",
              border: "1px solid rgba(130,199,255,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e3f1fb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f0f7fc";
            }}
          >
            View student profile
          </button>

          <button
            type="button"
            onClick={onAddAnother}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer"
            style={{
              background: "transparent",
              color: "#5b7a8c",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#1a3a4a";
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#5b7a8c";
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Add another student
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateStudentProfile({
  onBack,
  setActivePage,
  setSelectedStudentId,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  const handleBack = () => {
    setError("");
    setValidationErrors([]);
    setShowValidationModal(false);
    if (onBack) onBack();
    navigate("/dashboard/students");
  };

  const handleStepBack = () => {
    setError("");
    setValidationErrors([]);
    setShowValidationModal(false);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const [form, setForm] = useState(initialFormState);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleDifficulty = (difficulty) => {
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.includes(difficulty)
        ? prev.difficultyMarkers.filter((item) => item !== difficulty)
        : [...prev.difficultyMarkers, difficulty],
    }));
  };

  const getStepOneIssues = () => {
    const errors = [];

    if (!String(form.learnerName || "").trim()) {
      errors.push({
        step: 1,
        field: "Student Name",
        message: "Student name is required.",
      });
    } else if (!/^[a-zA-Z\s.'-]+$/.test(form.learnerName.trim())) {
      errors.push({
        step: 1,
        field: "Student Name",
        message: "Student name should contain letters only.",
      });
    }

    if (!String(form.age || "").trim()) {
      errors.push({ step: 1, field: "Age", message: "Age is required." });
    } else {
      const age = Number(form.age);
      if (age < 2 || age > 18) {
        errors.push({
          step: 1,
          field: "Age",
          message: "Age must be between 2 and 18.",
        });
      }
    }

    if (!String(form.gradeLevel || "").trim()) {
      errors.push({
        step: 1,
        field: "Grade Level",
        message: "Grade level is required.",
      });
    } else {
      const grade = Number(form.gradeLevel);
      if (grade < 1 || grade > 10) {
        errors.push({
          step: 1,
          field: "Grade Level",
          message: "Grade level must be between 1 and 10.",
        });
      }
    }

    if (form.age && form.gradeLevel) {
      const age = Number(form.age);
      const grade = Number(form.gradeLevel);
      if (age < 4 && grade > 0) {
        errors.push({
          step: 1,
          field: "Grade Level",
          message:
            "A student under 4 years old cannot be in a grade higher than Kindergarten.",
        });
      }
      if (age < 6 && grade > 1) {
        errors.push({
          step: 1,
          field: "Grade Level",
          message: "A student under 6 years old is unlikely to be above Grade 1.",
        });
      }
      if (age > 12 && grade < 4) {
        errors.push({
          step: 1,
          field: "Grade Level",
          message: "Grade level seems too low for the student's age.",
        });
      }
    }

    if (!String(form.gender || "").trim()) {
      errors.push({ step: 1, field: "Gender", message: "Gender is required." });
    }

    if (!String(form.disabilityCategory || "").trim()) {
      errors.push({
        step: 1,
        field: "Diagnosis",
        message: "Diagnosis is required.",
      });
    }

    if (form.birthdate.trim()) {
      const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/;
      if (!dateRegex.test(form.birthdate.trim())) {
        errors.push({
          step: 1,
          field: "Birthdate",
          message: "Birthdate must be in MM-DD-YYYY format.",
        });
      } else {
        const [month, day, year] = form.birthdate.split("-").map(Number);
        const birthDate = new Date(year, month - 1, day);
        if (birthDate >= new Date()) {
          errors.push({
            step: 1,
            field: "Birthdate",
            message: "Birthdate must be a date in the past.",
          });
        }
      }
    }

    if (form.schoolYear.trim()) {
      const syRegex = /^\d{4}\s*-\s*\d{4}$/;
      if (!syRegex.test(form.schoolYear.trim())) {
        errors.push({
          step: 1,
          field: "School Year",
          message:
            "School year must be in YYYY - YYYY format (e.g. 2025 - 2026).",
        });
      }
    }

    if (!form.difficultyMarkers || form.difficultyMarkers.length === 0) {
      errors.push({
        step: 1,
        field: "Difficulty Markers",
        message:
          "Please select at least one difficulty marker (needed before Generate IEP).",
      });
    }

    if (!String(form.guardianName || "").trim()) {
      errors.push({
        step: 1,
        field: "Guardian Full Name",
        message: "Guardian name is required.",
      });
    }

    if (!String(form.guardianRelationship || "").trim()) {
      errors.push({
        step: 1,
        field: "Guardian Relationship",
        message: "Guardian relationship is required.",
      });
    }

    if (!String(form.consentDate || "").trim()) {
      errors.push({
        step: 1,
        field: "Consent Verification Date",
        message: "Consent date is required.",
      });
    }

    if (!form.parentalConsentObtained) {
      errors.push({
        step: 1,
        field: "RA 10173 Consent Agreement",
        message: "Parental/guardian consent agreement / statement is required.",
      });
    }

    return errors;
  };

  const getStepTwoIssues = () => {
    const requiredFields = [
      [
        "presentEvaluation",
        "Evaluation Results",
        "Please fill in the evaluation / assessment results before saving.",
      ],
      [
        "academicStrengths",
        "Learner Strengths",
        "Please fill in the learner strengths before saving.",
      ],
      [
        "academicNeeds",
        "Learner Needs",
        "Please fill in the learner needs before saving.",
      ],
      [
        "parentalConcerns",
        "Parental Concerns",
        "Please fill in the parental concerns before saving.",
      ],
      [
        "curriculumImpact",
        "Curriculum Impact",
        "Please fill in the curriculum impact before saving.",
      ],
    ];

    const errors = [];
    for (const [field, label, message] of requiredFields) {
      if (!String(form[field] || "").trim()) {
        errors.push({ step: 2, field: label, message });
      }
    }
    return errors;
  };

  const handleNext = () => {
    setError("");
    const stepOneErrors = getStepOneIssues();

    if (stepOneErrors.length > 0) {
      setValidationErrors(stepOneErrors);
      setShowValidationModal(true);
      return;
    }

    setValidationErrors([]);
    setShowValidationModal(false);
    setStep(2);
  };

  const handleCloseValidationModal = () => {
    setShowValidationModal(false);
    if (validationErrors.some((err) => err.step === 1)) {
      setStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step !== 2) return;

    const stepOneErrors = getStepOneIssues();
    const stepTwoErrors = getStepTwoIssues();
    const allErrors = [...stepOneErrors, ...stepTwoErrors];

    if (allErrors.length > 0) {
      setError("");
      setValidationErrors(allErrors);
      setShowValidationModal(true);
      return;
    }

    setSaving(true);
    setError("");

    const studentProfileDetails = {
      school: form.school,
      schoolYear: form.schoolYear,
      studentName: form.learnerName,
      learnerName: form.learnerName,
      birthdate: form.birthdate,
      disabilityCategory: form.disabilityCategory,
      diagnosisDetails: form.diagnosisDetails,
      difficultyMarkers: form.difficultyMarkers,
      presentEvaluation: form.presentEvaluation,
      academicStrengths: form.academicStrengths,
      academicNeeds: form.academicNeeds,
      parentalConcerns: form.parentalConcerns,
      curriculumImpact: form.curriculumImpact,
      guardianName: form.guardianName.trim(),
      guardianRelationship: form.guardianRelationship || "Parent",
      consentDate: form.consentDate,
      parentalConsentObtained: true,
      consentAgreement: true,
    };

    const payload = {
      name: form.learnerName,
      age: Number(form.age) || 0,
      grade: Number(form.gradeLevel) || 0,
      gender: form.gender,
      diagnosis: form.disabilityCategory,
      support_needs: form.academicNeeds,
      asdBackground: form.diagnosisDetails,
      assessmentResult: form.presentEvaluation,
      preferences: JSON.stringify(studentProfileDetails),
      profileDetails: studentProfileDetails,
      learning_style: "",
      interests: "",
      sensory_preferences: "",
      teacher_user_id: user?.id,
      parental_consent_obtained: true,
      consent_date: form.consentDate,
      guardian_name: form.guardianName.trim(),
      guardian_relationship: form.guardianRelationship || "Parent",
    };

    try {
      const created = await studentsAPI.create(payload);
      const createdId =
        created?.studentID ??
        created?.id ??
        created?.pk ??
        created?.data?.studentID ??
        created?.data?.id ??
        null;
      setCreatedStudent({ id: createdId, name: form.learnerName });
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message || "Unable to save student profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateIEP = () => {
    if (createdStudent?.id && setSelectedStudentId) {
      setSelectedStudentId(createdStudent.id);
    }
    if (setActivePage) {
      setActivePage("generate-iep");
    }
    if (createdStudent?.id) {
      navigate(`/dashboard/students/${createdStudent.id}/iep`);
    } else {
      navigate("/dashboard/iep");
    }
  };

  const handleViewProfile = () => {
    if (createdStudent?.id && setSelectedStudentId) {
      setSelectedStudentId(createdStudent.id);
    }
    if (setActivePage) {
      setActivePage("view-student-detail");
    }
    if (createdStudent?.id) {
      navigate(`/dashboard/students/${createdStudent.id}`);
    } else {
      navigate("/dashboard/students");
    }
  };

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    setStep(1);
    setError("");
    setCreatedStudent(null);
    setForm(initialFormState);
  };

  return (
    <div className="page-content">
      <div className="form-card iep-card">
        <div className="iep-step-header">
          <div>
            <span>Create Student Profile</span>
            <strong>Step {step} of 2</strong>
          </div>
          <div className="iep-progress">
            {[1, 2].map((number) => (
              <i key={number} className={number <= step ? "active" : ""} />
            ))}
          </div>
        </div>

        <div className="iep-form-intro">
          <span className="iep-form-intro-icon" aria-hidden="true">
            <svg
              className="w-4 h-4 text-amber-600 inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.439v-2.25m-6 2.25v-2.25m6-4.5a4.5 4.5 0 10-6 0m6 0a3.75 3.75 0 01-6 0"
              />
            </svg>
          </span>
          <div>
            <strong>Tip:</strong> NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts.
          </div>
        </div>

        {error && <div className="iep-alert iep-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <section className="form-section">
              <SectionHeader
                title="Section A: Personal Information"
                subtitle="Enter learner information and mark the appropriate difficulty or diagnosis based on assessment."
              />
              <div className="form-grid-2">
                <FormField
                  label="Student Name"
                  placeholder="Enter student name"
                  value={form.learnerName}
                  onChange={setField("learnerName")}
                />
                <FormField
                  label="School"
                  placeholder="School name"
                  value={form.school}
                  onChange={setField("school")}
                />
                <FormField
                  label="School Year"
                  placeholder="2025 - 2026"
                  value={form.schoolYear}
                  onChange={setField("schoolYear")}
                />
                <FormField
                  label="Age"
                  placeholder="Enter age"
                  type="number"
                  min={2}
                  max={18}
                  value={form.age}
                  onChange={setField("age")}
                />
                <FormField
                  label="Grade Level"
                  placeholder="Enter grade level"
                  type="number"
                  min={1}
                  max={10}
                  value={form.gradeLevel}
                  onChange={setField("gradeLevel")}
                />
                <SelectField
                  label="Gender"
                  value={form.gender}
                  onChange={setField("gender")}
                  options={genderOptions}
                />
                <FormField
                  label="Birthdate"
                  placeholder="MM-DD-YYYY"
                  value={form.birthdate}
                  onChange={setField("birthdate")}
                />
                <SelectField
                  label="Diagnosis"
                  value={form.disabilityCategory}
                  onChange={setField("disabilityCategory")}
                  options={diagnosisOptions}
                />
              </div>
              <TextAreaField
                label="Assessment / Diagnosis Details"
                placeholder="Write the medical assessment, diagnosis, or other important learner information."
                value={form.diagnosisDetails}
                onChange={setField("diagnosisDetails")}
                rows={3}
              />
              <div>
                <h3 className="iep-small-title">
                  Difficulties — mark the appropriate box based on assessment
                  <span className="iep-small-title-help">
                    (Needed before Generate IEP)
                  </span>
                </h3>
                <div className="iep-check-grid">
                  {difficultyOptions.map((option) => (
                    <CheckOption
                      key={option}
                      label={option}
                      checked={form.difficultyMarkers.includes(option)}
                      onChange={() => toggleDifficulty(option)}
                    />
                  ))}
                </div>
              </div>

              <div
                className="ra10173-consent-section"
                style={{
                  marginTop: "1.5rem",
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                }}
              >
                <h3
                  className="iep-small-title"
                  style={{
                    color: "#0f172a",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                  }}
                >
                  Republic Act 10173 (Data Privacy Act of 2012) Compliance
                </h3>
                <p
                  className="iep-muted"
                  style={{ fontSize: "0.85rem", marginBottom: "1rem" }}
                >
                  In compliance with Philippine RA 10173, processing sensitive personal information and automated AI analysis for minors require explicit parental or guardian consent.
                </p>
                <div className="form-grid-2">
                  <FormField
                    label="Guardian Full Name"
                    placeholder="Enter parent or guardian name"
                    value={form.guardianName}
                    onChange={setField("guardianName")}
                  />
                  <SelectField
                    label="Guardian Relationship"
                    value={form.guardianRelationship}
                    onChange={setField("guardianRelationship")}
                    options={["Parent", "Mother", "Father", "Legal Guardian", "Other"]}
                  />
                  <FormField
                    label="Consent Verification Date"
                    type="date"
                    value={form.consentDate}
                    onChange={setField("consentDate")}
                  />
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <CheckOption
                    label="Consent Agreement / Statement: I confirm that parental/guardian consent has been verified and obtained for this learner in compliance with Republic Act 10173."
                    checked={Boolean(form.parentalConsentObtained)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        parentalConsentObtained: e.target.checked,
                      }))
                    }
                  />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="form-section">
              <SectionHeader
                title="Present Levels of Academic Achievement and/or Functional Performance"
                subtitle="Present level details are used by the AI engine to draft tailored IEP goals, accommodations, and instructional strategies."
              />
              <TextAreaField
                label="Results of initial or most recent evaluation and results of school assessments"
                placeholder="Example: The learner fails to finish tasks most of the time, has difficulty in concentrating and paying attention, and may be unable to get what he wants."
                value={form.presentEvaluation}
                onChange={setField("presentEvaluation")}
                rows={4}
              />
              <TextAreaField
                label="Description of academic, developmental, and/or functional strengths"
                placeholder="Example: The learner can spell random words using alphabet blocks and arranges alphabet sequentially."
                value={form.academicStrengths}
                onChange={setField("academicStrengths")}
                rows={4}
              />
              <TextAreaField
                label="Description of academic, developmental, and/or functional needs"
                placeholder="Example: Needs structured routines, visual task supports, shortened activities, sensory breaks, and positive reinforcement."
                value={form.academicNeeds}
                onChange={setField("academicNeeds")}
                rows={4}
              />
              <TextAreaField
                label="Parental concerns regarding the child’s education"
                placeholder="Write concerns shared by the parent or guardian."
                value={form.parentalConcerns}
                onChange={setField("parentalConcerns")}
                rows={3}
              />
              <TextAreaField
                label="Impact of the disability on involvement and progress in the general education curriculum"
                placeholder="Example: The learner has difficulty concentrating and needs support to listen well."
                value={form.curriculumImpact}
                onChange={setField("curriculumImpact")}
                rows={3}
              />
            </section>
          )}

          <div className="form-actions">
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-back"
                onClick={handleStepBack}
              >
                BACK
              </button>
            ) : (
              <button type="button" className="btn btn-back" onClick={handleBack}>
                BACK
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                className="btn btn-submit"
                onClick={handleNext}
              >
                NEXT
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-submit"
                disabled={saving}
              >
                {saving ? "SAVING..." : "SUBMIT"}
              </button>
            )}
          </div>
        </form>
      </div>
      {showSuccessModal && (
        <SuccessModal
          studentName={createdStudent?.name || form.learnerName}
          onGenerateIEP={handleGenerateIEP}
          onViewProfile={handleViewProfile}
          onAddAnother={handleAddAnother}
        />
      )}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={handleCloseValidationModal}
        title="Incomplete or Invalid Information"
        subtitle="Please address the following items before proceeding:"
        errors={validationErrors}
        confirmLabel="Review & Correct"
      />
    </div>
  );
}
