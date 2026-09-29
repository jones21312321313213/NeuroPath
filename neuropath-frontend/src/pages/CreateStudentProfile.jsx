import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { studentsAPI } from "../api/client";
import { queryClient } from "../queryClient";
import { queryKeys } from "../hooks/queries";
import { useAuth } from "../context/AuthContext";
import {
  CheckIcon,
  CloseIcon,
  LightBulbIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from "../components/ui/icons";
import { Ra10173ConsentModal } from "../components/Ra10173ConsentModal";
import { toIsoDate, validatePastDate } from "../utils/dateUtils";
import UnsavedChangesModal from "../components/ui/UnsavedChangesModal";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { useToast } from "../context/ToastContext";

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
  maxLength = type === "number" || type === "date" ? undefined : 255,
  required = false,
  error,
}) {
  const inputId = label
    ? `field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">
        {label}:{required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`form-input ${error ? "has-error border-rose-500" : ""}`}
        min={min}
        max={max}
        maxLength={maxLength}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
  required = false,
  error,
}) {
  const selectId = label
    ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div className="form-group">
      <label htmlFor={selectId} className="form-label">
        {label}:{required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className={`form-select ${error ? "has-error border-rose-500" : ""}`}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value = "",
  onChange,
  rows = 3,
  helpText,
  maxLength,
  showCharCount = Boolean(maxLength),
  required = false,
  error,
}) {
  const areaId = label
    ? `area-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  const errorId = areaId ? `${areaId}-error` : undefined;
  const charCountId = areaId ? `${areaId}-char-count` : undefined;
  const currentLength = typeof value === "string" ? value.length : 0;

  const describedBy = [
    error ? errorId : null,
    maxLength && showCharCount ? charCountId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="form-group">
      <div className="flex justify-between items-baseline gap-2">
        <label htmlFor={areaId} className="form-label">
          {label}{required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
        {maxLength && showCharCount && (
          <span
            id={charCountId}
            className="form-char-count text-xs text-slate-500 font-mono shrink-0"
            aria-live="polite"
          >
            {currentLength} / {maxLength}
          </span>
        )}
      </div>
      {helpText && <span className="iep-field-help">{helpText}</span>}
      <textarea
        id={areaId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`form-textarea ${error ? "has-error border-rose-500" : ""}`}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <p id={errorId} className="form-field-error" role="alert">
          {error}
        </p>
      )}
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

function CheckOption({ label, checked, onChange, disabled }) {
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
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "#e6f7ec", border: "2px solid #b7e4c7" }}
        >
          <CheckIcon className="w-8 h-8 text-emerald-600" aria-hidden="true" />
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
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [hasReadConsent, setHasReadConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const errorRef = useRef(null);

  const { showPrompt, promptNavigation, confirmLeave, cancelLeave } =
    useUnsavedChanges({
      isDirty: isDirty && !showSuccessModal,
    });

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
    setIsDirty(true);
    setHasReadConsent(true);
    setForm((prev) => ({
      ...prev,
      parentalConsentObtained: true,
    }));
    if (fieldErrors.parentalConsentObtained) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.parentalConsentObtained;
        return next;
      });
    }
  };

  const handleBack = () => {
    promptNavigation(() => {
      if (onBack) onBack();
      navigate("/dashboard/students");
    });
  };

  const [form, setForm] = useState(initialFormState);

  const setField = (field) => (e) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) {
      setError("");
    }
  };

  const toggleDifficulty = (difficulty) => {
    setIsDirty(true);
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.includes(difficulty)
        ? prev.difficultyMarkers.filter((item) => item !== difficulty)
        : [...prev.difficultyMarkers, difficulty],
    }));
    if (fieldErrors.difficultyMarkers) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.difficultyMarkers;
        return next;
      });
    }
    if (error) {
      setError("");
    }
  };

  const validateStepOne = () => {
    const errors = {};
    const requiredFields = [
      ["learnerName", "Student name is required."],
      ["age", "Age is required."],
      ["gradeLevel", "Grade level is required."],
      ["gender", "Gender is required."],
      ["disabilityCategory", "Diagnosis is required."],
    ];

    for (const [field, message] of requiredFields) {
      if (!String(form[field] || "").trim()) {
        errors[field] = message;
      }
    }

    if (!errors.learnerName && form.learnerName) {
      if (!/^[a-zA-Z\s.'-]+$/.test(form.learnerName.trim())) {
        errors.learnerName = "Student name should contain letters only.";
      }
    }

    if (!errors.age && form.age !== "") {
      const age = Number(form.age);
      if (isNaN(age) || age < 2 || age > 18) {
        errors.age = "Age must be between 2 and 18.";
      }
    }

    if (!errors.gradeLevel && form.gradeLevel !== "") {
      const grade = Number(form.gradeLevel);
      if (isNaN(grade) || grade < 1 || grade > 10) {
        errors.gradeLevel = "Grade level must be between 1 and 10.";
      }
    }

    const ageNum = Number(form.age);
    const gradeNum = Number(form.gradeLevel);
    if (!errors.age && !errors.gradeLevel) {
      if (ageNum < 4 && gradeNum > 0) {
        errors.gradeLevel =
          "A student under 4 years old cannot be in a grade higher than Kindergarten.";
      } else if (ageNum < 6 && gradeNum > 1) {
        errors.gradeLevel =
          "A student under 6 years old is unlikely to be above Grade 1.";
      } else if (ageNum > 12 && gradeNum < 4) {
        errors.gradeLevel =
          "Grade level seems too low for the student's age.";
      }
    }

    if (form.birthdate && form.birthdate.trim()) {
      const { valid, error: dateError } = validatePastDate(form.birthdate);
      if (!valid) {
        errors.birthdate = dateError;
      }
    }

    if (form.schoolYear && form.schoolYear.trim()) {
      const syRegex = /^\d{4}\s*-\s*\d{4}$/;
      if (!syRegex.test(form.schoolYear.trim())) {
        errors.schoolYear =
          "School year must be in YYYY - YYYY format (e.g. 2025 - 2026).";
      }
    }

    if (!form.difficultyMarkers || form.difficultyMarkers.length === 0) {
      errors.difficultyMarkers =
        "Please select at least one difficulty marker (needed before Generate IEP).";
    }

    if (!String(form.guardianName || "").trim()) {
      errors.guardianName = "Guardian name is required.";
    }

    if (!String(form.guardianRelationship || "").trim()) {
      errors.guardianRelationship = "Guardian relationship is required.";
    }

    if (!String(form.consentDate || "").trim()) {
      errors.consentDate = "Consent date is required.";
    }

    if (!form.parentalConsentObtained) {
      errors.parentalConsentObtained =
        "Parental/guardian consent agreement / statement is required.";
    }

    setFieldErrors(errors);

    const firstError = Object.values(errors)[0];
    if (firstError) {
      setError(firstError);
      return false;
    }

    setError("");
    return true;
  };

  const validateStepTwo = () => {
    const errors = {};
    const requiredFields = [
      ["presentEvaluation", "Evaluation / assessment results are required."],
      ["academicStrengths", "Learner strengths are required."],
      ["academicNeeds", "Learner needs are required."],
      ["parentalConcerns", "Parental concerns are required."],
      ["curriculumImpact", "Curriculum impact is required."],
    ];

    for (const [field, message] of requiredFields) {
      if (!String(form[field] || "").trim()) {
        errors[field] = message;
      }
    }

    setFieldErrors(errors);

    const firstError = Object.values(errors)[0];
    if (firstError) {
      setError(firstError);
      return false;
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
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (step !== 2) return;

    if (!validateStepTwo()) {
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
      setIsDirty(false);

      if (queryClient) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["students"] }),
          queryClient.invalidateQueries({ queryKey: ["student"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.recentActivity() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.iepStats() }),
        ]);
      }

      toast.success(`Student profile created for ${form.learnerName}!`);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message || "Unable to save student profile.");
      scrollToError();
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
    setIsDirty(false);
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
          <span className="iep-form-intro-icon">
            <LightBulbIcon className="w-5 h-5 text-amber-500" aria-hidden="true" />
          </span>
          <div>
            <strong>Tip:</strong> NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts.
          </div>
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

        <form onSubmit={(e) => e.preventDefault()}>
          {step === 1 && (
            <section className="form-section form-section-animated">
              <SectionHeader
                title="Section A: Personal Information"
                subtitle="Enter learner information and mark the appropriate difficulty or diagnosis based on assessment."
              />
              <div className="form-grid-2">
                <FormField
                  label="Student Name"
                  placeholder="Enter student name"
                  required={true}
                  maxLength={255}
                  value={form.learnerName}
                  onChange={setField("learnerName")}
                  error={fieldErrors.learnerName}
                />
                <FormField
                  label="School"
                  placeholder="School name"
                  maxLength={255}
                  value={form.school}
                  onChange={setField("school")}
                  error={fieldErrors.school}
                />
                <FormField
                  label="School Year"
                  placeholder="2025 - 2026"
                  maxLength={50}
                  value={form.schoolYear}
                  onChange={setField("schoolYear")}
                  error={fieldErrors.schoolYear}
                />
                <FormField
                  label="Age"
                  placeholder="Enter age"
                  type="number"
                  min={2}
                  max={18}
                  required={true}
                  value={form.age}
                  onChange={setField("age")}
                  error={fieldErrors.age}
                />
                <FormField
                  label="Grade Level"
                  placeholder="Enter grade level"
                  type="number"
                  min={1}
                  max={10}
                  required={true}
                  value={form.gradeLevel}
                  onChange={setField("gradeLevel")}
                  error={fieldErrors.gradeLevel}
                />
                <SelectField
                  label="Gender"
                  required={true}
                  value={form.gender}
                  onChange={setField("gender")}
                  options={genderOptions}
                  error={fieldErrors.gender}
                />
                <FormField
                  label="Birthdate"
                  type="date"
                  value={toIsoDate(form.birthdate)}
                  onChange={setField("birthdate")}
                  error={fieldErrors.birthdate}
                />
                <SelectField
                  label="Diagnosis"
                  value={form.disabilityCategory}
                  onChange={setField("disabilityCategory")}
                  options={diagnosisOptions}
                  error={fieldErrors.disabilityCategory}
                />
              </div>
              <TextAreaField
                label="Assessment / Diagnosis Details"
                placeholder="Write the medical assessment, diagnosis, or other important learner information."
                value={form.diagnosisDetails}
                onChange={setField("diagnosisDetails")}
                maxLength={1000}
                rows={3}
                error={fieldErrors.diagnosisDetails}
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
                {fieldErrors.difficultyMarkers && (
                  <p className="form-field-error" role="alert">
                    {fieldErrors.difficultyMarkers}
                  </p>
                )}
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

                <div className="form-grid-2">
                  <FormField
                    label="Guardian Full Name"
                    placeholder="Enter parent or guardian name"
                    required={true}
                    maxLength={255}
                    value={form.guardianName}
                    onChange={setField("guardianName")}
                    error={fieldErrors.guardianName}
                  />
                  <SelectField
                    label="Guardian Relationship"
                    required={true}
                    value={form.guardianRelationship}
                    onChange={setField("guardianRelationship")}
                    options={["Parent", "Mother", "Father", "Legal Guardian", "Other"]}
                    error={fieldErrors.guardianRelationship}
                  />
                  <FormField
                    label="Consent Verification Date"
                    type="date"
                    required={true}
                    value={form.consentDate}
                    onChange={setField("consentDate")}
                    error={fieldErrors.consentDate}
                  />
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <CheckOption
                    label="Consent Agreement / Statement: I confirm that parental/guardian consent has been verified and obtained for this learner in compliance with Republic Act 10173."
                    checked={Boolean(form.parentalConsentObtained)}
                    disabled={!hasReadConsent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        parentalConsentObtained: checked,
                      }));
                      if (checked && fieldErrors.parentalConsentObtained) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.parentalConsentObtained;
                          return next;
                        });
                      }
                    }}
                  />
                  {fieldErrors.parentalConsentObtained && (
                    <p className="form-field-error" role="alert">
                      {fieldErrors.parentalConsentObtained}
                    </p>
                  )}
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
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="form-section form-section-animated">
              <SectionHeader title="Present Levels of Academic Achievement and/or Functional Performance" />
              <TextAreaField
                label="Results of initial or most recent evaluation and results of school assessments"
                placeholder="Example: The learner fails to finish tasks most of the time, has difficulty in concentrating and paying attention, and may be unable to get what he wants."
                required={true}
                maxLength={2000}
                value={form.presentEvaluation}
                onChange={setField("presentEvaluation")}
                rows={4}
                error={fieldErrors.presentEvaluation}
              />
              <TextAreaField
                label="Description of academic, developmental, and/or functional strengths"
                placeholder="Example: The learner can spell random words using alphabet blocks and arranges alphabet sequentially."
                required={true}
                maxLength={2000}
                value={form.academicStrengths}
                onChange={setField("academicStrengths")}
                rows={4}
                error={fieldErrors.academicStrengths}
              />
              <TextAreaField
                label="Description of academic, developmental, and/or functional needs"
                placeholder="Example: Needs structured routines, visual task supports, shortened activities, sensory breaks, and positive reinforcement."
                required={true}
                maxLength={2000}
                value={form.academicNeeds}
                onChange={setField("academicNeeds")}
                rows={4}
                error={fieldErrors.academicNeeds}
              />
              <TextAreaField
                label="Parental concerns regarding the child’s education"
                placeholder="Write concerns shared by the parent or guardian."
                required={true}
                maxLength={2000}
                value={form.parentalConcerns}
                onChange={setField("parentalConcerns")}
                rows={3}
                error={fieldErrors.parentalConcerns}
              />
              <TextAreaField
                label="Impact of the disability on involvement and progress in the general education curriculum"
                placeholder="Example: The learner has difficulty concentrating and needs support to listen well."
                required={true}
                maxLength={2000}
                value={form.curriculumImpact}
                onChange={setField("curriculumImpact")}
                rows={3}
                error={fieldErrors.curriculumImpact}
              />
            </section>
          )}

          <div className="form-actions">
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-back"
                onClick={() => {
                  setFieldErrors({});
                  setError("");
                  setStep(step - 1);
                }}
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
                key="step1-next"
                type="button"
                className="btn btn-submit"
                onClick={handleNext}
              >
                NEXT
              </button>
            ) : (
              <button
                key="step2-submit"
                type="button"
                className="btn btn-submit"
                onClick={handleSubmit}
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
      <Ra10173ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConfirm={handleConfirmConsent}
        learnerName={form.learnerName}
        guardianName={form.guardianName}
        guardianRelationship={form.guardianRelationship}
        school={form.school}
        schoolYear={form.schoolYear}
        consentDate={form.consentDate}
      />
      <UnsavedChangesModal
        isOpen={showPrompt}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </div>
  );
}
