import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/ViewSelectedStudentProfile.css";
import StudentInsightsTab from "./StudentInsightsTab";
import { useStudent, useDeleteStudent } from "../../hooks/queries";
import { Badge, Modal } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import ErrorState from "../../components/ui/ErrorState";
import { CheckIcon, WarningIcon } from "../../components/ui/icons";

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
  const inputId = label
    ? `view-field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">{label}:</label>
      <input id={inputId} className="form-input" value={value || "—"} readOnly />
    </div>
  );
}

function ReadOnlyTextArea({ label, value, rows = 4 }) {
  const areaId = label
    ? `view-area-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    : undefined;
  return (
    <div className="form-group">
      <label htmlFor={areaId} className="form-label">{label}</label>
      <textarea id={areaId} className="form-textarea" rows={rows} value={value || "—"} readOnly />
    </div>
  );
}

export default function ViewSelectedStudentProfile({ studentId: propStudentId, setActivePage }) {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const studentId = propStudentId || params?.id;
  const [activeTab, setActiveTab] = useState("info");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    data: selected,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useStudent(studentId);

  const deleteStudentMutation = useDeleteStudent();

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

  const handleDelete = async () => {
    try {
      await deleteStudentMutation.mutateAsync(studentId);
      toast.success("Student profile deleted successfully.");
      setShowDeleteModal(false);
      if (setActivePage) setActivePage("view-student-profile");
      navigate("/dashboard/students");
    } catch (err) {
      toast.error(err?.message || "Failed to delete student profile.");
    }
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
        <div className="form-card">
          <ErrorState
            title="Student Record Not Found"
            message={queryError?.message || "We could not find the student profile record."}
            onRetry={() => refetch()}
            retryLabel="Try Again"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="form-card iep-card">
        <div className="form-actions">
          <button className="btn btn-back" onClick={handleBack} title="Back to students list">←</button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              DELETE
            </button>
            {activeTab === "info" && (
              <button className="btn btn-submit" onClick={handleUpdate}>UPDATE</button>
            )}
          </div>
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
                  <Badge variant="success" className="inline-flex items-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <span>RA 10173 Consent Verified (Guardian: {student.guardian_name || "Parent/Guardian"})</span>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="inline-flex items-center gap-1.5">
                    <WarningIcon className="w-4 h-4 text-amber-700" aria-hidden="true" />
                    <span>RA 10173 Consent Pending — AI Processing Restricted</span>
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleteStudentMutation.isPending && setShowDeleteModal(false)}
        title="Delete Student Profile"
        size="md"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              className="btn btn-back"
              style={{ background: "#94a3b8" }}
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteStudentMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#334155" }}>
          Are you sure you want to permanently delete{" "}
          <strong>{student?.name || "this student"}</strong>? All associated
          Individualized Education Plans (IEPs), progress tracking logs, and generated instructional
          resources will also be permanently removed. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
