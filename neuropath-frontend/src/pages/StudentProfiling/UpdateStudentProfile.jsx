import { useEffect, useState, useId, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentsAPI } from "../../api/client";
import { Modal, Button } from "../../components/ui";
import {
  CheckIcon,
  CloseIcon,
  LightBulbIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from "../../components/ui/icons";
import { Ra10173ConsentModal } from "../../components/Ra10173ConsentModal";
import { toIsoDate, validatePastDate } from "../../utils/dateUtils";
import "../../styles/UpdateStudentProfile.css";

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

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

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

function FormField({ label, placeholder, value, onChange, type = "text", min, max }) {
  const generatedId = useId();
  const inputId = label
    ? `usp-field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : generatedId;
  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">{label}:</label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-input gray-input"
        min={min}
        max={max}
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange }) {
  const generatedId = useId();
  const selectId = label
    ? `usp-select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : generatedId;
  return (
    <div className="form-group">
      <label htmlFor={selectId} className="form-label">{label}:</label>
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className="form-select gray-input"
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
  const generatedId = useId();
  const areaId = label
    ? `usp-area-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : generatedId;
  return (
    <div className="form-group">
      <label htmlFor={areaId} className="form-label">{label}</label>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        id={areaId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="form-textarea gray-input"
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

function CheckOption({ label, checked, onChange, disabled = false }) {
  return (
    <label
      className={`iep-check-option ${
        disabled ? "opacity-60 cursor-not-allowed select-none" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

/* ── Success Modal ─────────────────────────────────────── */
function SuccessModal({ studentName, onClose }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Profile Updated!"
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose} className="w-full">
          Done
        </Button>
      }
    >
      <div className="text-center py-2">
        <div className="usp-modal-icon" aria-hidden="true">
          <CheckIcon className="w-7 h-7 text-blue-600" aria-hidden="true" />
        </div>
        <p className="usp-modal-body">
          <strong>{studentName}</strong>'s profile has been saved successfully.
        </p>
      </div>
    </Modal>
  );
}

export default function UpdateStudentProfile({ studentId: propStudentId, onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = propStudentId || id;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const errorRef = useRef(null);

  const scrollToError = () => {
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView?.({
          behavior: "smooth",
          block: "center",
        });
        errorRef.current.focus?.({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handleConfirmConsent = () => {
    setHasReadConsent(true);
    setForm((prev) => ({
      ...prev,
      parentalConsentObtained: true,
    }));
  };

  const handleBack = () => {
    if (onBack) onBack();
    if (studentId) {
      navigate(`/dashboard/students/${studentId}`);
    } else {
      navigate("/dashboard/students");
    }
  };

  useEffect(() => {
    if (!studentId) return;

    async function loadStudent() {
      setLoading(true);
      setError("");
      try {
        const response = await studentsAPI.get(studentId);
        const data = response?.data || response;
        const details = getProfileDetails(data);
        const hasConsent = Boolean(data.parental_consent_obtained);
        if (hasConsent) {
          setHasReadConsent(true);
        }

        setForm({
          school: details.school || "",
          schoolYear: details.schoolYear || "",
          learnerName:
            details.studentName || details.learnerName || data.name || "",
          age: data.age || "",
          gradeLevel: data.grade || "",
          gender: data.gender || "",
          birthdate: toIsoDate(details.birthdate || ""),
          disabilityCategory:
            details.disabilityCategory ||
            data.diagnosis ||
            "Autism Spectrum Disorder",
          diagnosisDetails:
            details.diagnosisDetails || data.asdBackground || "",
          difficultyMarkers: Array.isArray(details.difficultyMarkers)
            ? details.difficultyMarkers
            : [],
          presentEvaluation:
            details.presentEvaluation || data.assessmentResult || "",
          academicStrengths: details.academicStrengths || "",
          academicNeeds: details.academicNeeds || data.support_needs || "",
          parentalConcerns: details.parentalConcerns || "",
          curriculumImpact: details.curriculumImpact || "",
          parentalConsentObtained: hasConsent,
          consentDate: data.consent_date || new Date().toISOString().split("T")[0],
          guardianName: data.guardian_name || "",
          guardianRelationship: data.guardian_relationship || "Parent",
        });
      } catch (err) {
        setError(err.message || "Unable to load student profile.");
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [studentId]);

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

  const validateStepOne = () => {
    const requiredFields = [
      ["learnerName", "Student name is required."],
      ["age", "Age is required."],
      ["gradeLevel", "Grade level is required."],
      ["gender", "Gender is required."],
      ["disabilityCategory", "Diagnosis is required."],
    ];
    for (const [field, message] of requiredFields) {
      if (!String(form[field] || "").trim()) {
        setError(message);
        return false;
      }
    }

    if (!form.difficultyMarkers || form.difficultyMarkers.length === 0) {
      setError(
        "Please select at least one difficulty marker (needed before Generate IEP).",
      );
      return false;
    }

    if (form.birthdate && form.birthdate.trim()) {
      const { valid, error: dateError } = validatePastDate(form.birthdate);
      if (!valid) {
        setError(dateError);
        return false;
      }
    }

    if (form.parentalConsentObtained) {
      if (!String(form.guardianName || "").trim()) {
        setError("Guardian name is required when parental consent is obtained.");
        return false;
      }
      if (!String(form.consentDate || "").trim()) {
        setError("Consent date is required when parental consent is obtained.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const validateStepTwo = () => {
    const requiredFields = [
      [
        "presentEvaluation",
        "Please fill in the evaluation / assessment results before saving.",
      ],
      [
        "academicStrengths",
        "Please fill in the learner strengths before saving.",
      ],
      ["academicNeeds", "Please fill in the learner needs before saving."],
      [
        "parentalConcerns",
        "Please fill in the parental concerns before saving.",
      ],
      [
        "curriculumImpact",
        "Please fill in the curriculum impact before saving.",
      ],
    ];
    for (const [field, message] of requiredFields) {
      if (!String(form[field] || "").trim()) {
        setError(message);
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleNext = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();

    if (!validateStepOne()) {
      scrollToError();
      return;
    }
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (step !== 2) return;

    if (!validateStepOne()) {
      setStep(1);
      scrollToError();
      return;
    }
    if (!validateStepTwo()) {
      setStep(2);
      scrollToError();
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
      parental_consent_obtained: Boolean(form.parentalConsentObtained),
      consent_date: form.parentalConsentObtained ? form.consentDate : null,
      guardian_name: form.parentalConsentObtained ? form.guardianName.trim() : "",
      guardian_relationship: form.parentalConsentObtained ? form.guardianRelationship : "Parent",
    };

    try {
      await studentsAPI.update(studentId, payload);
      setShowSuccessModal(true); // ← show modal instead of alert()
    } catch (err) {
      setError(err.message || "Unable to update student profile.");
      scrollToError();
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    handleBack();
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
      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <SuccessModal
          studentName={form.learnerName}
          onClose={handleModalClose}
        />
      )}

      <div className="form-card iep-card">
        <div className="iep-step-header">
          <div>
            <span>Update Student Profile</span>
            <strong>Step {step} of 2</strong>
          </div>
          <div className="iep-progress">
            {[1, 2].map((number) => (
              <i key={number} className={number <= step ? "active" : ""} />
            ))}
          </div>
        </div>

        <div className="iep-form-intro">
          <span className="iep-form-intro-icon">
            <LightBulbIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
          </span>
          <div>
            <strong>Tip:</strong> NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts.
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-back" onClick={handleBack}>
            ←
          </button>
          {step === 2 ? (
            <button
              type="button"
              className="btn btn-submit"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
          ) : (
            <div />
          )}
        </div>

        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="iep-alert iep-alert-error outline-none"
          >
            {error}
          </div>
        )}

        {step === 1 && (
          <section className="form-section form-section-animated">
            <SectionHeader
              title="Section A: Personal Information"
              subtitle="Update the same student information used in Create Student Profile and View Student Profile."
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
                value={form.age}
                onChange={setField("age")}
              />
              <FormField
                label="Grade Level"
                placeholder="Enter grade level"
                type="number"
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
                type="date"
                value={toIsoDate(form.birthdate)}
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
              placeholder="Write the medical assessment, diagnosis, or other important student information."
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
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <h3
                    className="iep-small-title"
                    style={{
                      color: "#0f172a",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Republic Act 10173 (Data Privacy Act of 2012) Compliance
                  </h3>
                  <p
                    className="iep-muted"
                    style={{ fontSize: "0.85rem", margin: 0 }}
                  >
                    In compliance with Philippine RA 10173, processing sensitive personal information and automated AI analysis for minors require explicit parental or guardian consent.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                    onClick={() => setShowConsentModal(true)}
                  >
                    <DocumentTextIcon className="w-3.5 h-3.5 text-blue-600 inline" aria-hidden="true" />
                    Read Full Consent Agreement
                  </button>
                  {hasReadConsent ? (
                    <span
                      role="img"
                      title="Agreement reviewed"
                      aria-label="Agreement reviewed"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shrink-0"
                    >
                      <CheckIcon className="w-4 h-4 text-emerald-600 stroke-[2.5]" aria-hidden="true" />
                    </span>
                  ) : (
                    <span
                      role="img"
                      title="Agreement not reviewed"
                      aria-label="Agreement not reviewed"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 border border-rose-300 shrink-0"
                    >
                      <CloseIcon className="w-4 h-4 text-rose-600 stroke-[2.5]" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>

              <CheckOption
                label="Parental/Guardian Consent has been verified and obtained for this learner."
                checked={Boolean(form.parentalConsentObtained)}
                disabled={!hasReadConsent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    parentalConsentObtained: e.target.checked,
                  }))
                }
              />
              {!hasReadConsent && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#b45309",
                    marginTop: "0.35rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    margin: "4px 0 0 0",
                  }}
                >
                  <InformationCircleIcon className="w-3.5 h-3.5 text-amber-600 inline shrink-0" aria-hidden="true" />
                  Please review the Full Consent Agreement above before confirming parental consent.
                </p>
              )}

              {form.parentalConsentObtained && (
                <div
                  className="form-grid-2"
                  style={{ marginTop: "1rem" }}
                >
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
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="form-section form-section-animated">
            <SectionHeader title="Present Levels of Academic Achievement and/or Functional Performance" />
            <TextAreaField
              label="Results of initial or most recent evaluation and results of school assessments"
              placeholder="Example: The student fails to finish tasks most of the time, has difficulty in concentrating and paying attention, and may be unable to get what he wants."
              value={form.presentEvaluation}
              onChange={setField("presentEvaluation")}
              rows={4}
            />
            <TextAreaField
              label="Description of academic, developmental, and/or functional strengths"
              placeholder="Example: The student can spell random words using alphabet blocks and arranges alphabet sequentially."
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
              label="Parental concerns regarding the child's education"
              placeholder="Write concerns shared by the parent or guardian."
              value={form.parentalConcerns}
              onChange={setField("parentalConcerns")}
              rows={3}
            />
            <TextAreaField
              label="Impact of the disability on involvement and progress in the general education curriculum"
              placeholder="Example: The student has difficulty concentrating and needs support to listen well."
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
              onClick={() => setStep(step - 1)}
              className="btn btn-back"
            >
              BACK
            </button>
          ) : (
            <div />
          )}
          {step < 2 && (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-submit"
            >
              NEXT
            </button>
          )}
        </div>
      </div>
      <Ra10173ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConfirmConsent}
      />
    </div>
  );
}
