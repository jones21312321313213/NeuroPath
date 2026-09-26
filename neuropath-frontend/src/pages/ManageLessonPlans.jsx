import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ManageTeachingStrategies.css";
import "../styles/ManageLessonPlans.css";
import { iepAPI, lessonPlansAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import UnsavedChangesModal from "../components/ui/UnsavedChangesModal";
import {
  SparklesIcon,
  FolderIcon,
  InboxIcon,
  WarningIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  UserIcon,
  CheckIcon,
  ClipboardIcon,
  StarIcon,
  CalendarIcon,
  BookOpenIcon,
  TargetIcon,
  PencilIcon,
  ArrowPathIcon,
  DiskIcon,
  TrashIcon,
  CloseIcon,
} from "../components/ui/icons";

const TABS = [
  {
    key: "generate",
    label: "Generate",
    icon: <SparklesIcon className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: "manage",
    label: "Manage",
    icon: <FolderIcon className="w-4 h-4" aria-hidden="true" />,
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function Loading({ text = "Loading…" }) {
  return (
    <div className="ts-loading-wrap">
      <div className="ts-loading-dots">
        <div className="ts-loading-dot" />
        <div className="ts-loading-dot" />
        <div className="ts-loading-dot" />
      </div>
      <span className="ts-loading-text">{text}</span>
    </div>
  );
}

function EmptyState({
  icon = <InboxIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />,
  message = "No records found.",
  description,
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <div className="ts-empty">
      <span className="ts-empty-icon flex items-center justify-center">{icon}</span>
      <p className="ts-empty-text">{message}</p>
      {description && <p className="ts-empty-desc">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          className="ts-btn ts-btn-primary flex items-center gap-1.5"
          style={{ marginTop: 16 }}
          onClick={onAction}
        >
          {actionIcon && <span>{actionIcon}</span>}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="ts-error-banner flex items-center gap-2">
      <WarningIcon className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="ts-breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span className="ts-breadcrumb-sep">›</span>}
          {item.onClick ? (
            <button className="ts-breadcrumb-link" onClick={item.onClick}>
              {i === 0 && "← "}
              {item.label}
            </button>
          ) : (
            <span style={{ color: "#1a2b40", fontWeight: 600 }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatSavedIepGoal(goal) {
  const goalArea = goal.subject_category || goal.goalName || "IEP Goal";
  const annualGoal = goal.annual_goal || goal.goalName || "Saved IEP goal";
  return {
    ...goal,
    goalID: goal.goalID,
    goalArea,
    label: annualGoal,
  };
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span className={`lp-status-badge ${isActive ? "active" : "draft"}`}>
      {status}
    </span>
  );
}

// Advanced Bulletproof AI text renderer
function renderSafeText(content) {
  if (!content) return "";
  if (typeof content !== "object") return String(content);
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        typeof item === "object" ? renderSafeText(item) : `• ${item}`,
      )
      .join("\n");
  }
  if ("step_number" in content && "description" in content) {
    return `Step #${content.step_number}: ${content.description}`;
  }
  return Object.entries(content)
    .map(([key, value]) => {
      const cleanKey = key.replace(/_/g, " ").toUpperCase();
      const cleanValue = renderSafeText(value);
      const separator = typeof value === "object" ? "\n" : " ";
      return `${cleanKey}:${separator}${cleanValue}`;
    })
    .join("\n\n");
}

// Phase badge used in both Generate result and View detail
function PhaseBadge({ index }) {
  return (
    <span className="lp-phase-badge">
      Phase {index + 1}
    </span>
  );
}

// Renders a single lesson-plan phase block (used in Generate + View)
function LessonPhaseBlock({ plan, index, total }) {
  const isBordered = index !== total - 1;
  return (
    <div className={`lp-phase-block ${isBordered ? "bordered" : ""}`}>
      <h4 className="lp-phase-title">
        <PhaseBadge index={index} />
        {renderSafeText(plan.objective_focus)}
      </h4>

      {plan.introduction && (
        <div className="lp-phase-section">
          <span className="lp-phase-label">Introduction</span>
          <p className="lp-phase-body">{renderSafeText(plan.introduction)}</p>
        </div>
      )}
      {plan.core_activity && (
        <div className="lp-phase-section">
          <span className="lp-phase-label">Core Activity</span>
          <p className="lp-phase-body">{renderSafeText(plan.core_activity)}</p>
        </div>
      )}
      {plan.assessment && (
        <div className="lp-phase-section">
          <span className="lp-phase-label">Assessment</span>
          <p className="lp-phase-body">{renderSafeText(plan.assessment)}</p>
        </div>
      )}
      {plan.materials_needed && plan.materials_needed.length > 0 && (
        <div className="lp-phase-section">
          <span className="lp-phase-label">Materials Needed</span>
          <ul className="ts-strategy-list">
            {plan.materials_needed.map((m, i) => (
              <li key={i} className="ts-strategy-li">
                {renderSafeText(m)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Plan row list with contextual View, Edit, and Delete actions
function PlanRowList({
  plans,
  onView,
  onEdit,
  onDelete,
  actionLabel,
  onAction,
  actionClass = "ts-btn ts-btn-primary",
}) {
  return (
    <div className="ts-strategies-list">
      {plans.map((plan) => (
        <div key={plan.lessonID} className="ts-strategy-row">
          <div className="ts-strategy-row-icon flex items-center justify-center" aria-hidden="true">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="ts-strategy-row-info">
            <p className="ts-strategy-row-title">{plan.title}</p>
            <p className="ts-strategy-row-date">
              <span>{plan.studentName}</span>
              {plan.dateCreated && (
                <>
                  {" "}
                  &nbsp;·&nbsp;{" "}
                  <span>{new Date(plan.dateCreated).toLocaleDateString()}</span>
                </>
              )}
              {plan.status && (
                <>
                  {" "}
                  &nbsp;·&nbsp; <StatusBadge status={plan.status} />
                </>
              )}
            </p>
          </div>
          <div className="ts-strategy-row-actions">
            {onView ? (
              <>
                <button
                  type="button"
                  className="ts-btn ts-btn-primary"
                  onClick={() => onView(plan)}
                  aria-label={`View ${plan.title}`}
                >
                  View
                </button>
                {onEdit && (
                  <button
                    type="button"
                    className="ts-btn ts-btn-secondary"
                    onClick={() => onEdit(plan)}
                    aria-label={`Edit ${plan.title}`}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="ts-btn ts-btn-danger"
                    onClick={() => onDelete(plan)}
                    aria-label={`Delete ${plan.title}`}
                  >
                    Delete
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className={actionClass}
                onClick={() => onAction && onAction(plan)}
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Student grid (shared selector)
function StudentGrid({ students, selectedID, onSelect }) {
  return (
    <div className="ts-student-grid">
      {students.map((s) => {
        const isSelected = selectedID === s.studentID;
        return (
          <div
            key={s.studentID}
            className={`ts-student-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="ts-avatar">
              {getInitials(s.studentName || s.name)}
            </div>
            <div className="ts-student-meta">
              <div className="ts-student-name">{s.studentName || s.name}</div>
              {s.grade ? (
                <span className="ts-student-tag">Grade {s.grade}</span>
              ) : (
                <span className="ts-student-tag">Student</span>
              )}
            </div>
            <div className="ts-student-check">
              {isSelected && <CheckIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ onSave, setActivePage }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [availableIEPs, setAvailableIEPs] = useState([]);
  const [selectedIEP, setSelectedIEP] = useState(null);
  const [loadingIEPs, setLoadingIEPs] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    lessonPlansAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and IEP goals."))
      .finally(() => setLoadingDir(false));
  }, [user?.id]);

  const loadGoalsForIEP = async (iep, student = selectedStudent) => {
    setLoadingGoals(true);
    setError("");
    setSelectedGoal(null);

    try {
      const rawGoals = await iepAPI.listGoalsByIep(iep.iepID);
      const parsedGoals = (Array.isArray(rawGoals) ? rawGoals : rawGoals?.results || rawGoals?.data || [])
        .map(formatSavedIepGoal)
        .filter((g) => g.goalArea || g.label);

      setSelectedStudent((prev) => ({
        ...(prev || student),
        availableGoals: parsedGoals,
      }));
      if (parsedGoals.length === 1) {
        setSelectedGoal(parsedGoals[0]);
      } else {
        setSelectedGoal(null);
      }
    } catch {
      try {
        const fallbackGoals = await iepAPI.listLatestGoalsByStudent((student || selectedStudent)?.studentID);
        const parsed = (Array.isArray(fallbackGoals) ? fallbackGoals : fallbackGoals?.results || fallbackGoals?.data || [])
          .map(formatSavedIepGoal)
          .filter((g) => g.goalArea || g.label);
        setSelectedStudent((prev) => ({
          ...(prev || student),
          availableGoals: parsed,
        }));
        if (parsed.length === 1) {
          setSelectedGoal(parsed[0]);
        }
      } catch {
        const fallbackList = Array.isArray(student?.availableGoals) ? student.availableGoals : [];
        setSelectedStudent((prev) => ({
          ...(prev || student),
          availableGoals: fallbackList,
        }));
        if (fallbackList.length === 1) {
          setSelectedGoal(fallbackList[0]);
        }
      }
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleSelectIEP = async (iep) => {
    if (selectedIEP?.iepID === iep.iepID) return;
    setSelectedIEP(iep);
    await loadGoalsForIEP(iep);
  };

  const selectStudent = async (student) => {
    const baseStudent = { ...student, availableGoals: [] };
    setSelectedStudent(baseStudent);
    setSelectedIEP(null);
    setAvailableIEPs([]);
    setSelectedGoal(null);
    setGenerated(null);
    setError("");
    setSaved(false);
    setLoadingIEPs(true);

    let iepList = [];
    try {
      const fetchedIeps = await iepAPI.listByStudent(student.studentID);
      const rawIeps = Array.isArray(fetchedIeps) ? fetchedIeps : fetchedIeps?.results || fetchedIeps?.data || [];
      iepList = rawIeps.map((iep) => ({
        ...iep,
        iepID: iep.iepID || iep.id,
        version: iep.version || 1,
        createdDate: iep.formattedDate || (iep.createdDate ? new Date(iep.createdDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""),
        program_type: iep.program_type || "Graded",
        accommodations: iep.accommodations || "",
      }));
    } catch {
      if (Array.isArray(student.availableIEPs) && student.availableIEPs.length > 0) {
        iepList = student.availableIEPs.map((iep) => ({
          ...iep,
          iepID: iep.iepID || iep.id,
          version: iep.version || 1,
          createdDate: iep.createdDate || "",
          program_type: iep.program_type || "Graded",
          accommodations: iep.accommodations || "",
        }));
      }
    }

    iepList.sort((a, b) => (b.version || 0) - (a.version || 0));
    setAvailableIEPs(iepList);
    setLoadingIEPs(false);

    if (iepList.length > 0) {
      const defaultIEP = iepList[0];
      setSelectedIEP(defaultIEP);
      await loadGoalsForIEP(defaultIEP, student);
    } else {
      setSelectedStudent({
        ...student,
        availableGoals: Array.isArray(student.availableGoals) ? student.availableGoals : [],
      });
    }
  };

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedGoal) return;
    setLoading(true);
    setError("");
    setGenerated(null);
    setSaved(false);

    try {
      const res = await lessonPlansAPI.generate({
        studentID: selectedStudent.studentID,
        goalID: selectedGoal.goalID,
        goalArea: selectedGoal.goalArea,
        subject: selectedGoal.goalArea || "General",
        topic: selectedGoal.label || selectedGoal.goalArea || "IEP Goal",
        teacherPrompt: "",
      });
      setGenerated(res);
    } catch (err) {
      setError(err.message || "Failed to generate lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const plans = generated?.lesson_plans || generated?.data?.lesson_plans;
    if (!plans || !selectedStudent) return;
    setLoading(true);
    setError("");

    try {
      const savedPlan = await lessonPlansAPI.save({
        studentID: selectedStudent.studentID,
        goalID: selectedGoal?.goalID || null,
        title: `${selectedGoal?.goalArea || "ASD"} Lesson Plan`,
        content: plans,
      });
      setSaved(true);
      onSave(savedPlan);
    } catch (err) {
      setError(err.message || "Failed to save lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* Step 1 — Pick student */}
      <div className="ts-card">
        <div className="ts-step-badge">
          <span className="ts-step-num">1</span>Choose a Student
        </div>
        {loadingDir ? (
          <Loading text="Fetching students…" />
        ) : directory.length === 0 ? (
          <EmptyState
            icon={<AcademicCapIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
            message="No students found."
            description="You need at least one registered student profile before generating a lesson plan."
            actionLabel="Create Student Profile"
            actionIcon={<UserIcon className="w-4 h-4" aria-hidden="true" />}
            onAction={() => {
              navigate("/dashboard/students/create");
              if (setActivePage) setActivePage("create-student-profile");
            }}
          />
        ) : (
          <StudentGrid
            students={directory}
            selectedID={selectedStudent?.studentID}
            onSelect={selectStudent}
          />
        )}
      </div>

      {/* Step 2 — Select IEP Version */}
      {selectedStudent && !generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">2</span>Select an IEP Version
          </div>
          <p className="ts-form-intro">
            Choose an IEP version for{" "}
            <strong style={{ color: "#1a2b40" }}>
              {selectedStudent.studentName}
            </strong>{" "}
            to base instructional materials on:
          </p>
          {loadingIEPs ? (
            <Loading text="Fetching created IEPs…" />
          ) : availableIEPs.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
              message="No IEP records found for this student."
              description="Lesson plans require a created IEP. Generate and save an IEP for this student first."
              actionLabel="Generate IEP"
              actionIcon={<SparklesIcon className="w-4 h-4" aria-hidden="true" />}
              onAction={() => {
                navigate("/dashboard/iep/generate");
                if (setActivePage) setActivePage("iep-generation");
              }}
            />
          ) : (
            <div className="ts-iep-grid">
              {availableIEPs.map((iep, index) => {
                const isSelected = selectedIEP?.iepID === iep.iepID;
                const isLatest = index === 0;
                return (
                  <div
                    key={iep.iepID}
                    className={`ts-iep-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectIEP(iep)}
                  >
                    <div className="ts-iep-header">
                      <div className="ts-iep-title-wrap">
                        <input
                          type="radio"
                          name="selectedIEP"
                          className="ts-iep-radio"
                          checked={isSelected}
                          onChange={() => handleSelectIEP(iep)}
                        />
                        <span className="ts-iep-version-title">
                          {`IEP Version ${iep.version}`}
                        </span>
                      </div>
                      {isLatest && (
                        <span className="ts-iep-badge-latest flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                          <span>Latest</span>
                        </span>
                      )}
                    </div>
                    <div className="ts-iep-meta">
                      {iep.createdDate && (
                        <span className="ts-iep-tag flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{iep.createdDate}</span>
                        </span>
                      )}
                      {iep.program_type && (
                        <span className="ts-iep-tag flex items-center gap-1">
                          <BookOpenIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{iep.program_type}</span>
                        </span>
                      )}
                    </div>
                    {iep.accommodations && (
                      <div
                        className="ts-iep-accommodations"
                        title={iep.accommodations}
                      >
                        <strong>Accommodations:</strong> {iep.accommodations}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Select IEP Goal */}
      {selectedStudent && selectedIEP && !generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">3</span>Select an IEP Goal
          </div>
          <p className="ts-form-intro">
            Choose a goal from{" "}
            <strong style={{ color: "#1a2b40" }}>
              {`IEP Version ${selectedIEP.version}`}
            </strong>{" "}
            for{" "}
            <strong style={{ color: "#1a2b40" }}>
              {selectedStudent.studentName}
            </strong>
            :
          </p>
          {loadingGoals ? (
            <Loading text="Loading goals for selected IEP…" />
          ) : selectedStudent.availableGoals.length === 0 ? (
            <EmptyState
              icon={<TargetIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
              message={`No IEP goals found in Version ${selectedIEP.version}.`}
              description="This IEP version has no saved goals. Select another version or add goals to this IEP."
              actionLabel="Manage Goals"
              actionIcon={<PencilIcon className="w-4 h-4" aria-hidden="true" />}
              onAction={() => {
                navigate("/dashboard/iep/view");
                if (setActivePage) setActivePage("view-iep");
              }}
            />
          ) : (
            <>
              {selectedStudent.availableGoals.length === 1 && (
                <div className="ts-goal-auto-selected-badge flex items-center gap-1.5" data-testid="goal-auto-selected-badge">
                  <CheckIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Goal automatically selected from Version {selectedIEP.version}</span>
                </div>
              )}
              <div className="ts-goal-grid">
                {selectedStudent.availableGoals.map((goal) => {
                  const isSelected = selectedGoal?.goalID === goal.goalID;
                  return (
                    <label
                      key={goal.goalID}
                      className={`ts-goal-item ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedGoal(goal)}
                    >
                      <input
                        type="radio"
                        name="iepGoal"
                        className="ts-goal-radio"
                        checked={isSelected}
                        onChange={() => setSelectedGoal(goal)}
                      />
                      <span className="ts-goal-text">
                        <strong
                          style={{
                            display: "block",
                            marginBottom: 2,
                            color: "#1a2b40",
                          }}
                        >
                          {goal.goalArea}
                        </strong>
                        {goal.label && goal.label !== goal.goalArea && (
                          <span className="ts-goal-subtext">
                            {goal.label}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="ts-actions" style={{ marginTop: 22 }}>
                <button
                  className="ts-generate-btn flex items-center justify-center gap-2"
                  onClick={handleGenerate}
                  disabled={!selectedGoal}
                >
                  <SparklesIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Generate Lesson Plan</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading / AI generation */}
      {loading && (
        <div className="ts-card" role="status" aria-live="polite">
          <div className="ts-ai-generating">
            <div className="ts-ai-orb" aria-hidden="true">
              <svg
                style={{ width: 28, height: 28 }}
                className="animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="ts-ai-label">Creating Personalized Lesson Plan…</p>
            <p className="ts-ai-sub">
              Structuring instructional sequence and learning activities based on the IEP goal area
            </p>
          </div>
        </div>
      )}

      {/* Step 4 — Result */}
      {generated && !loading && (
        <div className="ts-card">
          <div className="ts-step-badge">
            <span className="ts-step-num">4</span>Review & Save
          </div>

          <div className="ts-detail-hero">
            <h2 className="ts-detail-title">
              {generated.data?.title || "AI-Generated Lesson Plan"}
            </h2>
            <div className="ts-detail-meta">
              <div className="ts-meta-chip flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{selectedStudent?.studentName}</span>
              </div>
              <div className="ts-meta-chip flex items-center gap-1.5">
                <TargetIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{selectedGoal?.goalArea}</span>
              </div>
            </div>
          </div>

          <div className="ts-output-box">
            <div className="ts-output-label">
              AI Lesson Plan Output
              <div className="ts-output-label-line" />
            </div>
            <div
              style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}
            >
              {generated.data?.lesson_plans?.length > 0 ? (
                generated.data.lesson_plans.map((plan, index) => (
                  <LessonPhaseBlock
                    key={index}
                    plan={plan}
                    index={index}
                    total={generated.data.lesson_plans.length}
                  />
                ))
              ) : (
                <p className="ts-empty-italic">
                  No lesson plan data was returned from the AI.
                </p>
              )}
            </div>
          </div>

          {generated.message && (
            <div className="ts-success-msg flex items-center gap-1.5">
              <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
              <span>{generated.message}</span>
            </div>
          )}
          {saved && (
            <div className="ts-success-msg flex items-center gap-1.5" style={{ marginTop: 8 }}>
              <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
              <span>Lesson plan saved successfully to student profile.</span>
            </div>
          )}

          <div className="ts-actions" style={{ marginTop: 20 }}>
            <button
              className="ts-btn ts-btn-secondary flex items-center gap-1.5"
              onClick={handleGenerate}
              disabled={loading}
            >
              <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
              <span>Regenerate</span>
            </button>
            <button
              className="ts-btn ts-btn-primary flex items-center gap-1.5"
              onClick={handleSave}
              disabled={loading || saved}
            >
              <DiskIcon className="w-4 h-4" aria-hidden="true" />
              <span>Confirm & Save Plan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manage Tab (Unified View, Edit, and Delete) ──────────────────────────────
function ManagePlansTab({ setActivePage, onGoToGenerate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formValue, setFormValue] = useState({ title: "", status: "Draft" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDeletePlan, setToDeletePlan] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  const isFormDirty = Boolean(
    editingPlan &&
      (formValue.title !== (editingPlan.title || "") ||
        formValue.status !== (editingPlan.status || "Draft")),
  );

  const { showPrompt, promptNavigation, confirmLeave, cancelLeave } =
    useUnsavedChanges({
      isDirty: isFormDirty,
    });

  useEffect(() => {
    let active = true;
    studentsAPI
      .list(user?.id)
      .then((data) => {
        if (active) {
          const studentList = Array.isArray(data)
            ? data
            : data?.results || data?.data || [];
          setStudents(studentList);
        }
      })
      .catch(() => {
        if (active) setError("Failed to load students.");
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const loadPlansForStudent = useCallback(async (student) => {
    setLoadingPlans(true);
    setError("");
    try {
      const res = await lessonPlansAPI.list({ studentID: student.studentID });
      const rawPlans = Array.isArray(res)
        ? res
        : res?.results || res?.data || [];
      setPlans(rawPlans);
    } catch {
      setError("Failed to load lesson plans.");
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setViewingPlan(null);
    setEditingPlan(null);
    setToDeletePlan(null);
    setError("");
    setSuccessMessage("");
    loadPlansForStudent(s);
  };

  const handleBackToStudents = () => {
    setSelectedStudent(null);
    setPlans([]);
    setViewingPlan(null);
    setEditingPlan(null);
    setToDeletePlan(null);
    setError("");
    setSuccessMessage("");
  };

  const handleBackToList = () => {
    setViewingPlan(null);
    setEditingPlan(null);
    setError("");
    setSuccessMessage("");
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormValue({
      title: plan.title || "",
      status: plan.status || "Draft",
    });
    setError("");
    setSuccessMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    if (!formValue.title.trim()) {
      setError("Plan title is required.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setSuccessMessage("");

    try {
      await lessonPlansAPI.update(editingPlan.lessonID, formValue);
      const updatedPlan = { ...editingPlan, ...formValue };

      setPlans((prev) =>
        prev.map((p) =>
          p.lessonID === editingPlan.lessonID ? updatedPlan : p
        )
      );

      if (viewingPlan?.lessonID === editingPlan.lessonID) {
        setViewingPlan(updatedPlan);
      }

      setSuccessMessage("Lesson plan saved successfully.");
      toast.success("Lesson plan saved successfully.");
      setEditingPlan(null);
    } catch (err) {
      setError(err.message || "Failed to update lesson plan.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDeletePlan) return;
    setDeleting(true);
    setError("");

    try {
      await lessonPlansAPI.delete(toDeletePlan.lessonID);
      setPlans((prev) =>
        prev.filter((p) => p.lessonID !== toDeletePlan.lessonID)
      );

      if (viewingPlan?.lessonID === toDeletePlan.lessonID) {
        setViewingPlan(null);
      }

      if (editingPlan?.lessonID === toDeletePlan.lessonID) {
        setEditingPlan(null);
      }

      const deletedTitle = toDeletePlan.title;
      setSuccessMessage(`Lesson plan "${deletedTitle}" was deleted.`);
      toast.success(`Lesson plan "${deletedTitle}" was deleted.`);
      setToDeletePlan(null);
    } catch (err) {
      setError(err.message || "Failed to delete lesson plan.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchName = (s.name || s.studentName || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchGrade = filterGrade
      ? Number(s.grade) === Number(filterGrade)
      : true;
    const matchAge = filterAge ? Number(s.age) === Number(filterAge) : true;
    return matchName && matchGrade && matchAge;
  });

  // Screen 4: Edit Mode
  if (editingPlan) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Students", onClick: handleBackToStudents },
            {
              label: selectedStudent?.name || "Student",
              onClick: handleBackToList,
            },
            ...(viewingPlan
              ? [
                  {
                    label: viewingPlan.title || "Lesson Plan",
                    onClick: () => promptNavigation(() => setEditingPlan(null)),
                  },
                ]
              : []),
            { label: "Edit Plan" },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon flex items-center justify-center" aria-hidden="true">
            <PencilIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="ts-card-title">Edit Lesson Plan</p>
            <p className="ts-card-subtitle">Make changes and save</p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {successMessage && (
          <div className="ts-success-msg" role="status">
            {successMessage}
          </div>
        )}
        <div className="ts-form-group">
          <label htmlFor="lp-edit-title" className="ts-form-label">
            Plan Title
          </label>
          <input
            id="lp-edit-title"
            className="ts-form-input"
            value={formValue.title}
            onChange={(e) =>
              setFormValue((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>
        <div className="ts-form-group">
          <label htmlFor="lp-edit-status" className="ts-form-label">
            Status
          </label>
          <select
            id="lp-edit-status"
            className="ts-form-input"
            value={formValue.status}
            onChange={(e) =>
              setFormValue((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
        <div className="ts-actions space-between" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="ts-btn ts-btn-ghost"
            onClick={() => promptNavigation(() => setEditingPlan(null))}
            disabled={savingEdit}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ts-btn ts-btn-primary"
            onClick={handleSaveEdit}
            disabled={savingEdit || !formValue.title.trim()}
          >
            {savingEdit ? "Saving…" : "Save Changes"}
          </button>
        </div>
        <UnsavedChangesModal
          isOpen={showPrompt}
          onConfirm={confirmLeave}
          onCancel={cancelLeave}
        />
      </div>
    );
  }

  // Screen 3: Detail View
  if (viewingPlan) {
    let lessonsArray = [];
    try {
      let rawText = viewingPlan.lessonContent || viewingPlan.content || "{}";
      let parsed = typeof rawText === "string" ? JSON.parse(rawText) : rawText;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      lessonsArray = Array.isArray(parsed)
        ? parsed
        : parsed?.lesson_plans || [];
    } catch (e) {
      console.error("Failed to parse saved lesson plan JSON.", e);
    }

    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Students", onClick: handleBackToStudents },
            {
              label: selectedStudent?.name || "Student",
              onClick: handleBackToList,
            },
            { label: viewingPlan.title || "Lesson Plan" },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon flex items-center justify-center" aria-hidden="true">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="ts-card-title">{viewingPlan.title}</p>
            <p className="ts-card-subtitle">
              <span>{viewingPlan.studentName || selectedStudent?.name}</span>
              {viewingPlan.dateCreated && (
                <>
                  {" "}
                  &nbsp;·&nbsp;{" "}
                  <span>
                    {new Date(viewingPlan.dateCreated).toLocaleDateString()}
                  </span>
                </>
              )}
              {viewingPlan.status && (
                <>
                  {" "}
                  &nbsp;·&nbsp; <StatusBadge status={viewingPlan.status} />
                </>
              )}
            </p>
          </div>
        </div>

        <ErrorBanner message={error} />
        {successMessage && (
          <div className="ts-success-msg" role="status">
            {successMessage}
          </div>
        )}

        <div className="lp-goal-area-display" style={{ marginBottom: 24 }}>
          <span className="lp-goal-area-label">Target IEP Goal Area</span>
          <span className="lp-goal-area-value">
            {viewingPlan.goalArea || "ASD Functional Learning Area"}
          </span>
          <span className="lp-goal-area-note">
            Targeted instructional intervention tailored for this learner.
          </span>
        </div>

        <div className="ts-output-box">
          <div className="ts-output-label">
            <span>Lesson Plan Phases</span>
            <div className="ts-output-label-line" />
          </div>
          <div className="ts-strategy-body">
            {lessonsArray.length > 0 ? (
              lessonsArray.map((plan, index) => (
                <LessonPhaseBlock
                  key={index}
                  plan={plan}
                  index={index}
                  total={lessonsArray.length}
                />
              ))
            ) : (
              <p className="ts-empty-italic">
                No lesson plan content available to display.
              </p>
            )}
          </div>
        </div>

        <div className="ts-actions space-between" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="ts-btn ts-btn-ghost"
            onClick={handleBackToList}
          >
            ← Back to List
          </button>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="ts-btn ts-btn-secondary"
              onClick={() => handleOpenEdit(viewingPlan)}
            >
              Edit Plan
            </button>
            <button
              type="button"
              className="ts-btn ts-btn-danger"
              onClick={() => setToDeletePlan(viewingPlan)}
            >
              Delete Plan
            </button>
          </div>
        </div>

        {toDeletePlan && (
          <div
            className="ts-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-modal-title"
          >
            <div className="ts-modal">
              <div className="ts-modal-icon" aria-hidden="true">
                <TrashIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <p id="lp-modal-title" className="ts-modal-title">Delete Lesson Plan?</p>
              <p className="ts-modal-body">
                You are about to permanently delete{" "}
                <strong>"{toDeletePlan?.title}"</strong>. This action cannot be
                undone.
              </p>
              <div className="ts-modal-actions">
                <button
                  type="button"
                  className="ts-btn ts-btn-ghost"
                  onClick={() => setToDeletePlan(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ts-btn ts-btn-danger-solid"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Screen 2: Plan list for selected student
  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Students", onClick: handleBackToStudents },
            { label: selectedStudent.name || selectedStudent.studentName },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon" aria-hidden="true">
            <BookOpenIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="ts-card-title">Lesson Plans</p>
            <p className="ts-card-subtitle">
              For {selectedStudent.name || selectedStudent.studentName}
            </p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {successMessage && (
          <div className="ts-success-msg" role="status">
            {successMessage}
          </div>
        )}
        {loadingPlans ? (
          <Loading text="Loading lesson plans…" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
            message="No lesson plans found for this student."
            description="Create an AI-generated lesson plan tailored to this student's IEP goals."
            actionLabel="Generate Lesson Plan"
            actionIcon={<SparklesIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
            onAction={onGoToGenerate}
          />
        ) : (
          <PlanRowList
            plans={plans}
            onView={(p) => setViewingPlan(p)}
            onEdit={(p) => handleOpenEdit(p)}
            onDelete={(p) => setToDeletePlan(p)}
          />
        )}

        {toDeletePlan && (
          <div
            className="ts-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-modal-title"
          >
            <div className="ts-modal">
              <div className="ts-modal-icon" aria-hidden="true">
                <TrashIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <p id="lp-modal-title" className="ts-modal-title">Delete Lesson Plan?</p>
              <p className="ts-modal-body">
                You are about to permanently delete{" "}
                <strong>"{toDeletePlan?.title}"</strong>. This action cannot be
                undone.
              </p>
              <div className="ts-modal-actions">
                <button
                  type="button"
                  className="ts-btn ts-btn-ghost"
                  onClick={() => setToDeletePlan(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ts-btn ts-btn-danger-solid"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Screen 1: Student selection
  return (
    <div className="ts-card">
      <div className="ts-card-header">
        <div className="ts-card-icon" aria-hidden="true">
          <BookOpenIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
        </div>
        <div>
          <p className="ts-card-title">Manage Lesson Plans</p>
          <p className="ts-card-subtitle">
            Select a student to view, edit, or delete their lesson plans
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {successMessage && (
        <div className="ts-success-msg" role="status">
          {successMessage}
        </div>
      )}

      <div className="lp-search-bar" style={{ marginBottom: 16 }}>
        <input
          aria-label="Search students"
          className="ts-form-input"
          style={{ flex: 1, minWidth: 180 }}
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="lp-filter-label">Filter:</span>
          <select
            aria-label="Filter by Grade"
            className="ts-form-input"
            style={{ width: "auto", minWidth: 100, padding: "10px 12px" }}
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
            aria-label="Filter by Age"
            className="ts-form-input"
            style={{ width: "auto", minWidth: 80, padding: "10px 12px" }}
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

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<AcademicCapIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
          message={
            search || filterGrade || filterAge
              ? "No students match your filter."
              : "No students found."
          }
          description={
            search || filterGrade || filterAge
              ? "Try adjusting your search query or filters."
              : "Register a student profile first to manage and view lesson plans."
          }
          actionLabel={
            search || filterGrade || filterAge
              ? "Clear Filters"
              : "Create Student Profile"
          }
          actionIcon={
            search || filterGrade || filterAge ? (
              <CloseIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
            ) : (
              <UserIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
            )
          }
          onAction={() => {
            if (search || filterGrade || filterAge) {
              setSearch("");
              setFilterGrade("");
              setFilterAge("");
            } else {
              navigate("/dashboard/students/create");
              if (setActivePage) setActivePage("create-student-profile");
            }
          }}
        />
      ) : (
        <StudentGrid
          students={filteredStudents}
          selectedID={null}
          onSelect={handleSelectStudent}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageLessonPlans({ setActivePage }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [, setLessonPlans] = useState([]);
  const { toast } = useToast();

  const saveLessonPlan = (plan) => {
    if (plan) {
      setLessonPlans((prev) => [plan, ...prev]);
      toast.success("Lesson plan saved to library!");
    }
  };

  const isManageTab =
    activeTab === "manage" ||
    activeTab === "view" ||
    activeTab === "edit" ||
    activeTab === "delete";

  return (
    <div className="page-content ts-page">
      <div className="ts-page-hero">
        <div className="ts-hero-top">
          <div>
            <div className="ts-hero-eyebrow">
              <div className="ts-hero-eyebrow-dot" />
              NeuroPath · AI-Powered Tools
            </div>
            <h1 className="ts-hero-title">Manage Lesson Plans</h1>
            <p className="ts-hero-subtitle">
              Generate, review, edit, and manage AI-crafted lesson plans for
              each student
            </p>
          </div>
        </div>
        <div className="ts-tab-bar" role="tablist">
          {TABS.map((tab) => {
            const isActive =
              activeTab === tab.key ||
              (tab.key === "manage" && isManageTab && activeTab !== "generate");
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                className={`ts-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="ts-tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ts-body">
        {activeTab === "generate" && (
          <GenerateTab
            onSave={saveLessonPlan}
            setActivePage={setActivePage}
          />
        )}
        {isManageTab && (
          <ManagePlansTab
            setActivePage={setActivePage}
            onGoToGenerate={() => setActiveTab("generate")}
          />
        )}
      </div>
    </div>
  );
}
