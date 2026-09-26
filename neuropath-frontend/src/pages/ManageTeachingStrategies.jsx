import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ManageTeachingStrategies.css";
import { iepAPI, teachingStrategiesAPI } from "../api/client";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Strategy Markdown Renderer ────────────────────────────────────────────────
function StrategyRenderer({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  const nodes = [];
  let bulletBuffer = [];

  const flushBullets = (key) => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${key}`} className="ts-strategy-list">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="ts-strategy-li">
            {renderInline(b)}
          </li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushBullets(idx);
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    const headingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    if (headingMatch) {
      flushBullets(idx);
      nodes.push(
        <p key={idx} className="ts-strategy-heading">
          {headingMatch[1].replace(/:$/, "")}
        </p>,
      );
      return;
    }
    flushBullets(idx);
    nodes.push(
      <p key={idx} className="ts-strategy-para">
        {renderInline(line)}
      </p>,
    );
  });
  flushBullets("end");

  return <div className="ts-strategy-body">{nodes}</div>;
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
    label: `${goalArea} — ${annualGoal}`,
  };
}

// ── Strategy Row List ─────────────────────────────────────────────────────────
function StrategyRowList({
  strategies,
  onView,
  onEdit,
  onDelete,
  actionLabel,
  onAction,
  actionClass = "ts-btn ts-btn-primary",
}) {
  return (
    <div className="ts-strategies-list">
      {strategies.map((s) => (
        <div key={s.strategyID} className="ts-strategy-row">
          <div className="ts-strategy-row-icon flex items-center justify-center" aria-hidden="true">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="ts-strategy-row-info">
            <p className="ts-strategy-row-title">{s.title}</p>
            <p className="ts-strategy-row-date">{s.formattedDate}</p>
          </div>
          <div className="ts-strategy-row-actions">
            {onView ? (
              <>
                <button
                  type="button"
                  className="ts-btn ts-btn-primary"
                  onClick={() => onView(s)}
                  aria-label={`View ${s.title}`}
                >
                  View
                </button>
                {onEdit && (
                  <button
                    type="button"
                    className="ts-btn ts-btn-secondary"
                    onClick={() => onEdit(s)}
                    aria-label={`Edit ${s.title}`}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="ts-btn ts-btn-danger"
                    onClick={() => onDelete(s)}
                    aria-label={`Delete ${s.title}`}
                  >
                    Delete
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className={actionClass}
                onClick={() => onAction && onAction(s)}
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => setDirectory(data.directory || []))
      .catch(() => setError("Failed to load students and goals."))
      .finally(() => setLoadingDir(false));
  }, [user?.id]);

  const loadGoalsForIEP = async (iep, student = selectedStudent) => {
    setLoadingGoals(true);
    setError("");
    setSelectedGoal(null);

    try {
      const rawGoals = await iepAPI.listGoalsByIep(iep.iepID);
      const goalList = Array.isArray(rawGoals) ? rawGoals : rawGoals?.results || rawGoals?.data || [];
      const parsedGoals = goalList.map(formatSavedIepGoal);
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
        const goalList = Array.isArray(fallbackGoals) ? fallbackGoals : fallbackGoals?.results || fallbackGoals?.data || [];
        const parsed = goalList.map(formatSavedIepGoal);
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
      const data = await teachingStrategiesAPI.generate({
        goalID: selectedGoal.goalID,
      });
      setGenerated(data);
    } catch (err) {
      setError(
        err.message || "AI Generation pipeline failed. Is Ollama running?",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generated || !selectedGoal || saving || saved) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        iep_goal: selectedGoal.goalID,
        title: generated.data?.title || `Strategy for: ${selectedGoal.label || "IEP Goal"}`,
        strategyContent: generated.data?.strategyContent || "",
      };
      const response = await teachingStrategiesAPI.save(payload);
      setSaved(true);
      if (onSave) {
        onSave(response?.data || generated.data);
      }
    } catch (err) {
      setError(err.message || "Failed to save teaching strategy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* Step 1 */}
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
            description="You need at least one registered student profile before generating a teaching strategy."
            actionLabel="Create Student Profile"
            actionIcon={<UserIcon className="w-4 h-4" aria-hidden="true" />}
            onAction={() => {
              navigate("/dashboard/students/create");
              if (setActivePage) setActivePage("create-student-profile");
            }}
          />
        ) : (
          <div className="ts-student-grid">
            {directory.map((student) => {
              const isSelected =
                selectedStudent?.studentID === student.studentID;
              return (
                <div
                  key={student.studentID}
                  className={`ts-student-card ${isSelected ? "selected" : ""}`}
                  onClick={() => selectStudent(student)}
                >
                  <div className="ts-avatar">
                    {getInitials(student.studentName)}
                  </div>
                  <div className="ts-student-meta">
                    <div className="ts-student-name">{student.studentName}</div>
                    <span className="ts-student-tag">Student</span>
                  </div>
                  <div className="ts-student-check">
                    {isSelected && <CheckIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />}
                  </div>
                </div>
              );
            })}
          </div>
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
            to base instructional strategies on:
          </p>
          {loadingIEPs ? (
            <Loading text="Fetching created IEPs…" />
          ) : availableIEPs.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
              message="No IEP records found for this student."
              description="Teaching strategies require a created IEP. Generate and save an IEP for this student first."
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

      {/* Step 3 — IEP Goals */}
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
              description="Teaching strategies are generated directly from saved IEP goals. Generate and save an IEP with goals for this student first."
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
                      <span className="ts-goal-text">{goal.label}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
          <div className="ts-actions" style={{ marginTop: 22 }}>
            <button
              className="ts-generate-btn flex items-center justify-center gap-2"
              onClick={handleGenerate}
              disabled={!selectedGoal}
            >
              <SparklesIcon className="w-4 h-4" aria-hidden="true" />
              <span>Generate Teaching Strategy</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading / AI generation */}
      {loading && (
        <div className="ts-card">
          <div className="ts-ai-generating">
            <div className="ts-ai-orb flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-blue-600 animate-pulse" aria-hidden="true" />
            </div>
            <p className="ts-ai-label">Invoking Llama AI Pipeline…</p>
            <p className="ts-ai-sub">
              Crafting a personalised teaching strategy based on the IEP goal
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
              {generated.data?.title || "AI-Generated Teaching Strategy"}
            </h2>
            <div className="ts-detail-meta">
              <div className="ts-meta-chip flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>{selectedStudent?.studentName}</span>
              </div>
              <div className="ts-meta-chip flex items-center gap-1.5">
                <TargetIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>
                  {selectedGoal?.label?.slice(0, 48)}
                  {selectedGoal?.label?.length > 48 ? "…" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="ts-output-box">
            <div className="ts-output-label">
              AI Strategy Output
              <div className="ts-output-label-line" />
            </div>
            <StrategyRenderer content={generated.data?.strategyContent} />
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
              <span>Strategy saved successfully to student profile.</span>
            </div>
          )}

          <div className="ts-actions" style={{ marginTop: 20 }}>
            <button
              className="ts-btn ts-btn-secondary flex items-center gap-1.5"
              onClick={handleGenerate}
              disabled={loading || saving}
            >
              <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
              <span>Regenerate</span>
            </button>
            <button
              className="ts-btn ts-btn-primary flex items-center gap-1.5"
              onClick={handleSave}
              disabled={loading || saving || saved}
            >
              {saving ? (
                "Saving…"
              ) : saved ? (
                <>
                  <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <DiskIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm & Save Strategy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Strategy Detail View ──────────────────────────────────────────────────────
function StrategyDetails({ strategy, onBack, onEdit, onDelete }) {
  return (
    <div className="ts-card">
      <Breadcrumb
        items={[
          { label: "All Students", onClick: onBack },
          { label: strategy.title },
        ]}
      />

      <div className="ts-detail-hero">
        <h2 className="ts-detail-title">{strategy.title}</h2>
        <div className="ts-detail-meta">
          <div className="ts-meta-chip flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>{strategy.studentName}</span>
          </div>
          <div className="ts-meta-chip flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>{strategy.formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="ts-output-box">
        <div className="ts-output-label">
          Strategy Content
          <div className="ts-output-label-line" />
        </div>
        <StrategyRenderer content={strategy.strategyContent} />
      </div>

      <div className="ts-actions space-between" style={{ marginTop: 20 }}>
        <button type="button" className="ts-btn ts-btn-ghost" onClick={onBack}>
          ← Back to List
        </button>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={teachingStrategiesAPI.exportUrl(strategy.strategyID)}
            target="_blank"
            rel="noreferrer"
            className="ts-btn ts-btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Export PDF
          </a>
          {onEdit && (
            <button
              type="button"
              className="ts-btn ts-btn-secondary"
              onClick={() => onEdit(strategy)}
            >
              Edit Strategy
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="ts-btn ts-btn-danger"
              onClick={() => onDelete(strategy)}
            >
              Delete Strategy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manage Tab (Unified View, Edit, and Delete) ──────────────────────────────
function ManageStrategiesTab({ setActivePage, onGoToGenerate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [directory, setDirectory] = useState([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [loadingStrats, setLoadingStrats] = useState(false);
  const [viewingStrategy, setViewingStrategy] = useState(null);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [formValue, setFormValue] = useState({
    title: "",
    strategyContent: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDeleteStrategy, setToDeleteStrategy] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  const isFormDirty = Boolean(
    editingStrategy &&
      (formValue.title !== (editingStrategy.title || "") ||
        formValue.strategyContent !== (editingStrategy.strategyContent || "")),
  );

  const { showPrompt, promptNavigation, confirmLeave, cancelLeave } =
    useUnsavedChanges({
      isDirty: isFormDirty,
    });

  useEffect(() => {
    let active = true;
    teachingStrategiesAPI
      .getDirectory(user?.id)
      .then((data) => {
        if (active) setDirectory(data?.directory || []);
      })
      .catch(() => {
        if (active) setError("Failed to load students.");
      })
      .finally(() => {
        if (active) setLoadingDir(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const loadStrategiesForStudent = useCallback(async (student) => {
    setLoadingStrats(true);
    setError("");
    try {
      const data = await teachingStrategiesAPI.list(student.studentID);
      const rawStrategies = Array.isArray(data)
        ? data
        : data?.results || data?.data || [];
      setStrategies(rawStrategies);
    } catch {
      setError("Failed to load strategies.");
      setStrategies([]);
    } finally {
      setLoadingStrats(false);
    }
  }, []);

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setViewingStrategy(null);
    setEditingStrategy(null);
    setToDeleteStrategy(null);
    setError("");
    setSuccessMessage("");
    loadStrategiesForStudent(s);
  };

  const handleBackToStudents = () => {
    setSelectedStudent(null);
    setStrategies([]);
    setViewingStrategy(null);
    setEditingStrategy(null);
    setToDeleteStrategy(null);
    setError("");
    setSuccessMessage("");
  };

  const handleBackToList = () => {
    setViewingStrategy(null);
    setEditingStrategy(null);
    setError("");
    setSuccessMessage("");
  };

  const handleOpenEdit = (strategy) => {
    setEditingStrategy(strategy);
    setFormValue({
      title: strategy.title || "",
      strategyContent: strategy.strategyContent || "",
    });
    setError("");
    setSuccessMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingStrategy) return;
    if (!formValue.title.trim() || !formValue.strategyContent.trim()) {
      setError("Title and strategy content are both required.");
      return;
    }

    setSavingEdit(true);
    setError("");
    setSuccessMessage("");

    try {
      await teachingStrategiesAPI.update(editingStrategy.strategyID, formValue);
      const updatedStrategy = { ...editingStrategy, ...formValue };

      setStrategies((prev) =>
        prev.map((s) =>
          s.strategyID === editingStrategy.strategyID ? updatedStrategy : s
        )
      );

      if (viewingStrategy?.strategyID === editingStrategy.strategyID) {
        setViewingStrategy(updatedStrategy);
      }

      setSuccessMessage("Teaching strategy saved successfully.");
      toast.success("Teaching strategy updated successfully!");
      setEditingStrategy(null);
    } catch (err) {
      setError(err.message || "Failed to update strategy.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDeleteStrategy) return;
    setDeleting(true);
    setError("");

    try {
      await teachingStrategiesAPI.delete(toDeleteStrategy.strategyID);
      setStrategies((prev) =>
        prev.filter((s) => s.strategyID !== toDeleteStrategy.strategyID)
      );

      if (viewingStrategy?.strategyID === toDeleteStrategy.strategyID) {
        setViewingStrategy(null);
      }

      if (editingStrategy?.strategyID === toDeleteStrategy.strategyID) {
        setEditingStrategy(null);
      }

      const deletedTitle = toDeleteStrategy.title;
      setSuccessMessage(
        `Teaching strategy "${deletedTitle}" was deleted.`
      );
      toast.success(`Teaching strategy "${deletedTitle}" was deleted.`);
      setToDeleteStrategy(null);
    } catch (err) {
      setError(err.message || "Failed to delete strategy.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = directory.filter((s) =>
    (s.studentName || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Screen 4: Edit Mode
  if (editingStrategy) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Students", onClick: handleBackToStudents },
            {
              label: selectedStudent?.studentName || "Student",
              onClick: handleBackToList,
            },
            ...(viewingStrategy
              ? [
                  {
                    label: viewingStrategy.title || "Teaching Strategy",
                    onClick: () => promptNavigation(() => setEditingStrategy(null)),
                  },
                ]
              : []),
            { label: "Edit Strategy" },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon flex items-center justify-center" aria-hidden="true">
            <PencilIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="ts-card-title">Edit Teaching Strategy</p>
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
          <label htmlFor="ts-edit-title" className="ts-form-label">
            Strategy Title
          </label>
          <input
            id="ts-edit-title"
            className="ts-form-input"
            value={formValue.title}
            onChange={(e) =>
              setFormValue((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>
        <div className="ts-form-group">
          <label htmlFor="ts-edit-content" className="ts-form-label">
            Strategy Content (Markdown supported)
          </label>
          <textarea
            id="ts-edit-content"
            className="ts-form-textarea"
            rows={12}
            value={formValue.strategyContent}
            onChange={(e) =>
              setFormValue((prev) => ({
                ...prev,
                strategyContent: e.target.value,
              }))
            }
          />
        </div>
        <div className="ts-actions space-between" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="ts-btn ts-btn-ghost"
            onClick={() => promptNavigation(() => setEditingStrategy(null))}
            disabled={savingEdit}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ts-btn ts-btn-primary"
            onClick={handleSaveEdit}
            disabled={
              savingEdit ||
              !formValue.title.trim() ||
              !formValue.strategyContent.trim()
            }
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
  if (viewingStrategy) {
    return (
      <>
        <StrategyDetails
          strategy={viewingStrategy}
          onBack={handleBackToList}
          onEdit={() => handleOpenEdit(viewingStrategy)}
          onDelete={() => setToDeleteStrategy(viewingStrategy)}
        />
        {toDeleteStrategy && (
          <div
            className="ts-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ts-modal-title"
          >
            <div className="ts-modal">
              <div className="ts-modal-icon flex items-center justify-center" aria-hidden="true">
                <TrashIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <p id="ts-modal-title" className="ts-modal-title">Delete Strategy?</p>
              <p className="ts-modal-body">
                You are about to permanently delete{" "}
                <strong>"{toDeleteStrategy?.title}"</strong>. This action cannot
                be undone.
              </p>
              <div className="ts-modal-actions">
                <button
                  type="button"
                  className="ts-btn ts-btn-ghost"
                  onClick={() => setToDeleteStrategy(null)}
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
      </>
    );
  }

  // Screen 2: Strategies list for student
  if (selectedStudent) {
    return (
      <div className="ts-card">
        <Breadcrumb
          items={[
            { label: "All Students", onClick: handleBackToStudents },
            { label: selectedStudent.studentName },
          ]}
        />
        <div className="ts-card-header">
          <div className="ts-card-icon flex items-center justify-center" aria-hidden="true">
            <BookOpenIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="ts-card-title">Teaching Strategies</p>
            <p className="ts-card-subtitle">
              For {selectedStudent.studentName}
            </p>
          </div>
        </div>
        <ErrorBanner message={error} />
        {successMessage && (
          <div className="ts-success-msg" role="status">
            {successMessage}
          </div>
        )}
        {loadingStrats ? (
          <Loading text="Loading strategies…" />
        ) : strategies.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
            message="No teaching strategies found for this student."
            description="Generate an AI-powered teaching strategy tailored to this student's IEP goals."
            actionLabel="Generate Strategy"
            actionIcon={<SparklesIcon className="w-4 h-4" aria-hidden="true" />}
            onAction={onGoToGenerate}
          />
        ) : (
          <StrategyRowList
            strategies={strategies}
            onView={(s) => setViewingStrategy(s)}
            onEdit={(s) => handleOpenEdit(s)}
            onDelete={(s) => setToDeleteStrategy(s)}
          />
        )}

        {toDeleteStrategy && (
          <div
            className="ts-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ts-modal-title"
          >
            <div className="ts-modal">
              <div className="ts-modal-icon flex items-center justify-center" aria-hidden="true">
                <TrashIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <p id="ts-modal-title" className="ts-modal-title">Delete Strategy?</p>
              <p className="ts-modal-body">
                You are about to permanently delete{" "}
                <strong>"{toDeleteStrategy?.title}"</strong>. This action cannot
                be undone.
              </p>
              <div className="ts-modal-actions">
                <button
                  type="button"
                  className="ts-btn ts-btn-ghost"
                  onClick={() => setToDeleteStrategy(null)}
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
        <div className="ts-card-icon flex items-center justify-center" aria-hidden="true">
          <BookOpenIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
        </div>
        <div>
          <p className="ts-card-title">Manage Teaching Strategies</p>
          <p className="ts-card-subtitle">
            Select a student to view, edit, or delete their strategies
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />
      {successMessage && (
        <div className="ts-success-msg" role="status">
          {successMessage}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          aria-label="Search students"
          className="ts-form-input"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadingDir ? (
        <Loading text="Fetching students…" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<AcademicCapIcon className="w-8 h-8 text-slate-400" aria-hidden="true" />}
          message={search ? "No students match your search." : "No students found."}
          description={
            search
              ? "Try adjusting your search query."
              : "Register a student profile first to view and manage teaching strategies."
          }
          actionLabel={search ? "Clear Search" : "Create Student Profile"}
          actionIcon={
            search ? (
              <CloseIcon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <UserIcon className="w-4 h-4" aria-hidden="true" />
            )
          }
          onAction={() => {
            if (search) {
              setSearch("");
            } else {
              navigate("/dashboard/students/create");
              if (setActivePage) setActivePage("create-student-profile");
            }
          }}
        />
      ) : (
        <div className="ts-student-grid">
          {filteredStudents.map((s) => (
            <div
              key={s.studentID}
              className="ts-student-card"
              onClick={() => handleSelectStudent(s)}
            >
              <div className="ts-avatar">{getInitials(s.studentName)}</div>
              <div className="ts-student-meta">
                <div className="ts-student-name">{s.studentName}</div>
                <span className="ts-student-tag">Student</span>
              </div>
              <div className="ts-student-check" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageTeachingStrategies({ setActivePage }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [, setStrategies] = useState([]);
  const { toast } = useToast();

  const saveStrategy = (strategy) => {
    if (strategy) {
      setStrategies((prev) => [strategy, ...prev]);
      toast.success("Teaching strategy saved successfully!");
    }
  };

  const isManageTab =
    activeTab === "manage" ||
    activeTab === "view" ||
    activeTab === "edit" ||
    activeTab === "delete";

  return (
    <div className="page-content ts-page">
      {/* Hero + tabs */}
      <div className="ts-page-hero">
        <div className="ts-hero-top">
          <div>
            <div className="ts-hero-eyebrow">
              <div className="ts-hero-eyebrow-dot" />
              NeuroPath · AI-Powered Tools
            </div>
            <h1 className="ts-hero-title">Manage Teaching Strategies</h1>
            <p className="ts-hero-subtitle">
              Generate, review, edit, and manage AI-crafted strategies for each
              student
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

      {/* Body */}
      <div className="ts-body">
        {activeTab === "generate" && (
          <GenerateTab
            onSave={saveStrategy}
            setActivePage={setActivePage}
          />
        )}
        {isManageTab && (
          <ManageStrategiesTab
            setActivePage={setActivePage}
            onGoToGenerate={() => setActiveTab("generate")}
          />
        )}
      </div>
    </div>
  );
}