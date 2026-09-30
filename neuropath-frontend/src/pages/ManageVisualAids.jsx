import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ManageVisualAids.css";
import { visualAidsAPI, studentsAPI, iepAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import UnsavedChangesModal from "../components/ui/UnsavedChangesModal";
import {
  PhotoIcon,
  EyeIcon,
  TrashIcon,
  InboxIcon,
  WarningIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClipboardIcon,
  SparklesIcon,
  DiskIcon,
  ArrowPathIcon,
  PrinterIcon,
  SpeakerWaveIcon,
} from "../components/ui/icons";

const DAILY_LIVING_PRESETS = [
  {
    id: "handwashing",
    label: "🧼 Handwashing Routine",
    category: "Daily Living Skills",
    prompt: "Handwashing: 1. Turn on water and pump soap onto palms -> 2. Rub hands together washing lather bubbles -> 3. Rinse with clean water and dry hands with towel",
  },
  {
    id: "eating",
    label: "🥄 Eating with Utensils",
    category: "Self-Care",
    prompt: "Eating with spoon: 1. Hold spoon handle securely -> 2. Scoop bite-sized food portion -> 3. Bring spoon gently to mouth",
  },
  {
    id: "brushing",
    label: "🪥 Tooth Brushing",
    category: "Hygiene",
    prompt: "Brushing teeth: 1. Put pea-sized toothpaste on toothbrush -> 2. Brush teeth in gentle circular motions -> 3. Rinse mouth with water and spit into sink",
  },
  {
    id: "transition",
    label: "🎒 Classroom Transition",
    category: "Classroom Behavior",
    prompt: "Classroom transition: 1. Clean desk and organize materials -> 2. Pack items into backpack -> 3. Line up quietly at classroom door",
  },
];

const TABS = [
  {
    key: "generate",
    label: "Generate",
    icon: <PhotoIcon className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: "view",
    label: "View",
    icon: <EyeIcon className="w-4 h-4" aria-hidden="true" />,
  },
  {
    key: "delete",
    label: "Delete",
    icon: <TrashIcon className="w-4 h-4" aria-hidden="true" />,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Loading({ text = "Loading…" }) {
  return (
    <div className="va-loading-wrap">
      <div className="va-loading-dots">
        <div className="va-loading-dot" />
        <div className="va-loading-dot" />
        <div className="va-loading-dot" />
      </div>
      <span className="va-loading-text">{text}</span>
    </div>
  );
}

function EmptyState({
  icon = <InboxIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />,
  message = "No records found.",
  description,
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <div className="va-empty-state">
      <span className="va-empty-icon flex items-center justify-center">
        {icon}
      </span>
      <p className="va-empty-text">{message}</p>
      {description && <p className="va-empty-desc">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          className="va-btn va-btn-primary"
          style={{ marginTop: 16 }}
          onClick={onAction}
        >
          {actionIcon && <span className="inline-flex items-center">{actionIcon}</span>}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="va-error-banner">
      <WarningIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// ── Student Selector ──────────────────────────────────────────────────────────
function StudentSelector({ students, selectedStudent, onSelect }) {
  return (
    <div className="va-student-grid">
      {students.map((s) => {
        const isSelected = selectedStudent?.studentID === s.studentID;
        return (
          <div
            key={s.studentID}
            className={`va-student-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(s)}
          >
            <div className="va-avatar">{getInitials(s.name)}</div>
            <div className="va-student-meta">
              <div className="va-student-name">{s.name}</div>
              <span className="va-student-tag">
                {s.grade ? `Grade ${s.grade}` : "Student"}
              </span>
            </div>
            <div className="va-student-check">
              {isSelected && (
                <CheckIcon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Aid Row List ──────────────────────────────────────────────────────────────
function AidRowList({
  aids,
  actionLabel,
  onAction,
  actionClass = "va-btn va-btn-primary",
  showDownload = false,
}) {
  return (
    <div className="va-aids-list">
      {aids.map((aid) => (
        <div key={aid.visualAidID} className="va-aid-row">
          {aid.imageUrl && (
            <div className="va-aid-row-thumb">
              <img
                src={aid.imageUrl}
                alt={aid.title}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}
          <div className="va-aid-row-info">
            <p className="va-aid-row-title">{aid.title}</p>
            <p className="va-aid-row-meta flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                {aid.studentName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                {new Date(aid.dateCreated).toLocaleDateString()}
              </span>
            </p>
          </div>
          <div className="va-aid-row-actions">
            <button className={actionClass} onClick={() => onAction(aid)}>
              {actionLabel}
            </button>
            {showDownload && aid.imageUrl && (
              <a
                href={visualAidsAPI.exportUrl(aid.visualAidID)}
                target="_blank"
                rel="noreferrer"
                className="va-btn va-btn-ghost"
                style={{ textDecoration: "none" }}
              >
                PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sequential Sequence Viewer (Bundle 5: Issue #217) ────────────────────────
function SequentialSequenceViewer({
  aid,
  onAidUpdated,
  onSave,
  onRegenerate,
  onDiscard,
  onReset,
  onClose,
}) {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(1);
  const [speakingStep, setSpeakingStep] = useState(null);
  const [saving, setSaving] = useState(false);

  const initialSteps =
    aid?.steps_data && Array.isArray(aid.steps_data) && aid.steps_data.length > 0
      ? aid.steps_data
      : [
          { step: 1, title: "Step 1: Start", description: "Get ready and begin the routine." },
          { step: 2, title: "Step 2: Action", description: "Perform the main step carefully." },
          { step: 3, title: "Step 3: Complete", description: "Finish and check the final step." },
        ];

  const [steps, setSteps] = useState(initialSteps);
  const [prevStepsData, setPrevStepsData] = useState(aid?.steps_data);

  if (aid?.steps_data !== prevStepsData) {
    setPrevStepsData(aid?.steps_data);
    if (aid?.steps_data && Array.isArray(aid.steps_data) && aid.steps_data.length > 0) {
      setSteps(aid.steps_data);
    }
  }

  const handleNarrate = (stepNum, textToRead) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.info("Audio narration is not supported in this browser environment.");
      return;
    }
    window.speechSynthesis.cancel();
    if (speakingStep === stepNum) {
      setSpeakingStep(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingStep(null);
    utterance.onerror = () => setSpeakingStep(null);
    setSpeakingStep(stepNum);
    window.speechSynthesis.speak(utterance);
  };

  const handleUpdateStep = (index, field, value) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveCaptions = async () => {
    if (!aid?.visualAidID) return;
    setSaving(true);
    try {
      await visualAidsAPI.update(aid.visualAidID, { steps_data: steps });
      toast.success("Step captions updated successfully!");
      if (onAidUpdated) {
        onAidUpdated({ ...aid, steps_data: steps });
      }
    } catch (err) {
      toast.error(err.message || "Failed to save updated captions.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(steps);
      } else {
        const payload = {
          iep_goal: aid.iep_goal || aid.iep_goal_id,
          title: aid.title,
          imageUrl: aid.imageUrl,
          prompt_used: aid.prompt_used || "",
          steps_data: steps,
        };
        const res = await visualAidsAPI.create(payload);
        const savedData = res.data || res;
        toast.success("Visual aid saved successfully!");
        if (onAidUpdated) {
          onAidUpdated({
            ...aid,
            ...savedData,
            isDraft: false,
            steps_data: steps,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save visual aid.");
    } finally {
      setSaving(false);
    }
  };

  const isDraft = Boolean(aid?.isDraft);

  return (
    <div className="va-sequence-viewer va-printable-area">
      {/* Sequence Step Selector Navigation */}
      <div className="va-sequence-nav va-no-print" role="tablist" aria-label="Visual aid steps">
        {steps.map((s, idx) => {
          const stepNum = s.step || idx + 1;
          const isSelected = activeStep === stepNum;
          return (
            <button
              key={stepNum}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`va-step-tab ${isSelected ? "active" : ""}`}
              onClick={() => setActiveStep(stepNum)}
            >
              <span className="va-step-tab-badge">{stepNum}</span>
              <span>{s.title || `Step ${stepNum}`}</span>
            </button>
          );
        })}
      </div>

      {/* 3-Step Cards Grid with Dedicated Images, Editable Captions & Audio Narration */}
      <div className="va-step-cards-grid">
        {steps.map((s, idx) => {
          const stepNum = s.step || idx + 1;
          const isFocused = activeStep === stepNum;
          const narrationText = `${s.title}. ${s.description}`;
          return (
            <div
              key={stepNum}
              className={`va-step-card ${isFocused ? "active" : ""}`}
              onClick={() => setActiveStep(stepNum)}
            >
              <div className="va-step-card-header">
                <span className="va-step-indicator">
                  Step {stepNum}
                  {isFocused && <span style={{ marginLeft: 4 }}>• Active</span>}
                </span>
                <button
                  type="button"
                  className={`va-audio-narrate-btn va-no-print ${speakingStep === stepNum ? "speaking" : ""}`}
                  title="Read step instruction aloud"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNarrate(stepNum, narrationText);
                  }}
                >
                  <SpeakerWaveIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{speakingStep === stepNum ? "Playing…" : "Narration"}</span>
                </button>
              </div>

              {(s.imageUrl || aid.imageUrl) && (
                <div className="va-step-card-img-wrap">
                  <img
                    src={s.imageUrl || aid.imageUrl}
                    alt={s.title || `Step ${stepNum}`}
                    className="va-step-card-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  Step Title:
                </label>
                <input
                  type="text"
                  className="va-step-title-input"
                  value={s.title || ""}
                  onChange={(e) => handleUpdateStep(idx, "title", e.target.value)}
                  placeholder={`Step ${stepNum} title`}
                  aria-label={`Step ${stepNum} title`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  Instruction Caption:
                </label>
                <textarea
                  className="va-caption-textarea"
                  value={s.description || ""}
                  onChange={(e) => handleUpdateStep(idx, "description", e.target.value)}
                  placeholder={`Step ${stepNum} instruction caption…`}
                  aria-label={`Step ${stepNum} caption`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Toolbar */}
      <div className="va-actions space-between va-no-print" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {isDraft ? (
            <>
              <button
                type="button"
                className="va-btn va-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <DiskIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {saving ? "Saving…" : "Save Visual Aid"}
              </button>
              {onRegenerate && (
                <button
                  type="button"
                  className="va-btn va-btn-ghost"
                  onClick={onRegenerate}
                  disabled={saving}
                >
                  <ArrowPathIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Regenerate
                </button>
              )}
              {onDiscard && (
                <button
                  type="button"
                  className="va-btn va-btn-danger"
                  onClick={onDiscard}
                  disabled={saving}
                >
                  <TrashIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Discard
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="va-btn va-btn-primary"
                onClick={handleSaveCaptions}
                disabled={saving}
              >
                <DiskIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                {saving ? "Saving…" : "Save Captions"}
              </button>
              {aid.visualAidID && (
                <a
                  href={visualAidsAPI.exportUrl(aid.visualAidID)}
                  target="_blank"
                  rel="noreferrer"
                  className="va-btn va-btn-ghost"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <PrinterIcon className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  Download Classroom PDF
                </a>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {onClose && (
            <button type="button" className="va-btn va-btn-ghost" onClick={onClose}>
              Close
            </button>
          )}
          {onReset && !isDraft && (
            <button type="button" className="va-btn va-btn-primary" onClick={onReset}>
              <CheckIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ setActivePage, onDraftStatusChange, promptNavigation }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Step 2 — IEP Goals for selected student
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [extraPrompt, setExtraPrompt] = useState("");

  // Result
  const [result, setResult] = useState(null); // saved VisualAid record from DB
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Notify parent of unsaved draft state
  useEffect(() => {
    if (onDraftStatusChange) {
      onDraftStatusChange(Boolean(result?.isDraft));
    }
  }, [result?.isDraft, onDraftStatusChange]);

  // Load students on mount
  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  // Load IEP goals when student is selected
  useEffect(() => {
    if (!selectedStudent) return;
    let isCancelled = false;
    iepAPI
      .listLatestGoalsByStudent(selectedStudent.studentID)
      .catch(() => iepAPI.listGoalsByStudent(selectedStudent.studentID))
      .then((data) => {
        if (!isCancelled) {
          setGoals(Array.isArray(data) ? data : data?.results || data?.data || []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Failed to load IEP goals for this student.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingGoals(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedStudent]);

  const doStudentSelect = (s) => {
    setSelectedStudent(s);
    setGoals([]);
    setSelectedGoal(null);
    setLoadingGoals(true);
    setExtraPrompt("");
    setResult(null);
    setError("");
  };

  const handleStudentSelect = (s) => {
    if (result?.isDraft && promptNavigation) {
      promptNavigation(() => doStudentSelect(s));
      return;
    }
    doStudentSelect(s);
  };

  const handleGenerate = async () => {
    if (!selectedGoal) return;
    setGenerating(true);
    setError("");
    setResult(null);
    if (onDraftStatusChange) onDraftStatusChange(false);
    try {
      const data = await visualAidsAPI.generate({
        iep_goal_id: selectedGoal.goalID,
        prompt: extraPrompt.trim(),
        category: selectedGoal.subject_category || selectedGoal.goalArea || "",
        save_to_db: false,
      });
      const resData = data.data || data;
      setResult({
        ...resData,
        isDraft: true,
      });
      if (onDraftStatusChange) onDraftStatusChange(true);
      toast.success("Visual aid generated! Please review and decide whether to save.");
    } catch (err) {
      setError(
        err.message ||
          "Generation failed. Please check the backend is running.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async (currentSteps) => {
    if (!result) return;
    try {
      const payload = {
        iep_goal: result.iep_goal || selectedGoal.goalID,
        title: result.title,
        imageUrl: result.imageUrl,
        prompt_used: result.prompt_used || "",
        steps_data: currentSteps || result.steps_data,
      };
      const res = await visualAidsAPI.create(payload);
      const savedData = res.data || res;
      toast.success("Visual aid saved to database successfully!");
      setResult((prev) => ({
        ...prev,
        ...savedData,
        isDraft: false,
        steps_data: currentSteps || prev.steps_data,
      }));
      if (onDraftStatusChange) onDraftStatusChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to save visual aid.");
      throw err;
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleDiscard = () => {
    setResult(null);
    if (onDraftStatusChange) onDraftStatusChange(false);
    toast.info("Generated visual aid discarded.");
  };

  const doReset = () => {
    setSelectedStudent(null);
    setGoals([]);
    setSelectedGoal(null);
    setExtraPrompt("");
    setResult(null);
    if (onDraftStatusChange) onDraftStatusChange(false);
    setGenerating(false);
    setError("");
  };

  const handleReset = () => {
    if (result?.isDraft && promptNavigation) {
      promptNavigation(() => doReset());
      return;
    }
    doReset();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} />

      {/* ── Step 1 — Pick Student ── */}
      <div className="va-card">
        <div className="va-step-badge">
          <span className="va-step-num">1</span>Choose a Student
          {selectedStudent && (
            <span className="va-step-done-chip">
              <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" aria-hidden="true" />
              {selectedStudent.name}
            </span>
          )}
        </div>
        {loadingStudents ? (
          <Loading text="Fetching students…" />
        ) : students.length === 0 ? (
          <EmptyState
            icon={<AcademicCapIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
            message="No students found."
            description="You need at least one registered student profile before generating a visual aid."
            actionLabel="Create Student Profile"
            actionIcon={<UserIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
            onAction={() => {
              navigate("/dashboard/students/create");
              if (setActivePage) setActivePage("create-student-profile");
            }}
          />
        ) : (
          <StudentSelector
            students={students}
            selectedStudent={selectedStudent}
            onSelect={handleStudentSelect}
          />
        )}
      </div>

      {/* ── Step 2 — Pick IEP Goal + optional extra prompt + Generate ── */}
      {selectedStudent && !result && !generating && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">2</span>IEP Goal &amp; Prompt
            {selectedGoal && (
              <span className="va-step-done-chip">
                <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" aria-hidden="true" />
                Goal selected
              </span>
            )}
          </div>
          <p className="va-form-intro">
            Select an existing IEP goal for{" "}
            <strong style={{ color: "#1a2b40" }}>{selectedStudent.name}</strong>
            , then optionally select a quick template or describe what you'd like the visual to show.
          </p>

          {loadingGoals ? (
            <Loading text="Loading IEP goals…" />
          ) : goals.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
              message="No IEP goals found for this student."
              description="Visual aids are generated directly from saved IEP goals. Generate and save an IEP with goals for this student first."
              actionLabel="Generate IEP"
              actionIcon={<SparklesIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
              onAction={() => {
                navigate("/dashboard/iep/generate");
                if (setActivePage) setActivePage("iep-generation");
              }}
            />
          ) : (
            <div className="va-form-group">
              <label className="va-form-label">Select IEP Goal</label>
              <div className="va-goal-list">
                {goals.map((g) => {
                  const isSelected = selectedGoal?.goalID === g.goalID;
                  return (
                    <div
                      key={g.goalID}
                      className={`va-goal-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedGoal(g);
                        setResult(null);
                      }}
                    >
                      <div className="va-goal-radio">
                        {isSelected ? "●" : "○"}
                      </div>
                      <div className="va-goal-text">
                        <span className="va-goal-category">
                          {g.subject_category || g.goalName || "General"}
                        </span>
                        <span className="va-goal-annual">
                          {g.annual_goal || g.goalName || "No goal text"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Preset Quick Templates for Daily Living Routines ── */}
          <div className="va-presets-box">
            <div className="va-presets-header">
              <SparklesIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <span>Preset Quick Templates for Daily Living Routines</span>
            </div>
            <div className="va-presets-list">
              {DAILY_LIVING_PRESETS.map((preset) => {
                const isActive = extraPrompt === preset.prompt;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`va-preset-chip ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setExtraPrompt(preset.prompt);
                      setResult(null);
                    }}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="va-form-group" style={{ marginTop: 14 }}>
            <label htmlFor="va-extra-prompt" className="va-form-label">
              Additional Prompt{" "}
              <span style={{ fontWeight: 400, color: "#8a9ab5" }}>
                (optional)
              </span>
            </label>
            <textarea
              id="va-extra-prompt"
              className="va-form-textarea"
              placeholder="e.g. Show a child raising their hand in class, simple cartoon style…"
              value={extraPrompt}
              onChange={(e) => {
                setExtraPrompt(e.target.value);
                setResult(null);
              }}
              style={{ minHeight: 72 }}
            />
          </div>

          <div className="va-actions" style={{ marginTop: 16 }}>
            <button className="va-btn va-btn-ghost" onClick={handleReset}>
              Reset
            </button>
            <button
              className="va-generate-btn"
              onClick={handleGenerate}
              disabled={!selectedGoal}
              style={{ maxWidth: 260, opacity: selectedGoal ? 1 : 0.5 }}
            >
              <PhotoIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Generate Visual Aid
            </button>
          </div>
        </div>
      )}

      {/* ── Generating spinner ── */}
      {generating && (
        <div className="va-card">
          <div className="va-ai-generating">
            <div className="va-ai-orb flex items-center justify-center">
              <PhotoIcon className="w-8 h-8 text-white animate-pulse" aria-hidden="true" />
            </div>
            <p className="va-ai-label">Generating 3-Step Visual Aid Strip…</p>
            <p className="va-ai-sub">
              Gemini 1.5 Flash is decomposing your goal into 3 micro-steps and Imagen 3 is synthesizing a composite storyboard strip…
            </p>
          </div>
        </div>
      )}

      {/* ── Step 3 — Result (Draft or Saved) ── */}
      {result && !generating && (
        <div className="va-card">
          <div className="va-step-badge">
            <span className="va-step-num">3</span>
            {result.isDraft ? "Review Generated Draft" : "Saved to Database"}
            {!result.isDraft && (
              <CheckIcon className="w-3.5 h-3.5 ml-1 inline text-emerald-300" aria-hidden="true" />
            )}
          </div>

          <div className="va-detail-hero">
            <h2 className="va-detail-title">{result.title}</h2>
            <div className="va-detail-meta">
              <div className="va-meta-chip">
                <UserIcon className="w-4 h-4 text-slate-500 mr-1" aria-hidden="true" />
                {result.studentName}
              </div>
              <div className="va-meta-chip">
                <DiskIcon className="w-4 h-4 text-slate-500 mr-1" aria-hidden="true" />
                {result.isDraft
                  ? "Unsaved Draft Preview • Decide to Save, Regenerate, or Discard"
                  : `Saved to database (ID #${result.visualAidID})`}
              </div>
            </div>
          </div>

          <SequentialSequenceViewer
            aid={result}
            onAidUpdated={(updated) => setResult(updated)}
            onSave={handleSaveDraft}
            onRegenerate={handleRegenerate}
            onDiscard={handleDiscard}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}

// ── View Tab ──────────────────────────────────────────────────────────────────
function ViewTab({ setActivePage, onGoToGenerate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inspectingAid, setInspectingAid] = useState(null);

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  const fetchAids = useCallback((studentID) => {
    if (!studentID) {
      setAids([]);
      return;
    }

    setLoading(true);
    setError("");
    visualAidsAPI
      .listByStudent(studentID)
      .then(setAids)
      .catch(() => setError("Failed to load visual aids for this student."))
      .finally(() => setLoading(false));
  }, []);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setAids([]);
    setInspectingAid(null);
    fetchAids(student.studentID);
  };

  return (
    <div className="va-card">
      <div className="va-card-header">
        <div className="va-card-icon">
          <PhotoIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
        </div>
        <div>
          <p className="va-card-title">Saved Visual Aids</p>
          <p className="va-card-subtitle">
            Select a student to view only their generated visual aids
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="va-step-badge" style={{ marginBottom: 14 }}>
        <span className="va-step-num">1</span>Choose a Student
        {selectedStudent && (
          <span className="va-step-done-chip">
            <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" aria-hidden="true" />
            {selectedStudent.name}
          </span>
        )}
      </div>

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<AcademicCapIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
          message="No students found."
          description="Register a student profile first to view and manage visual aids."
          actionLabel="Create Student Profile"
          actionIcon={<UserIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
          onAction={() => {
            navigate("/dashboard/students/create");
            if (setActivePage) setActivePage("create-student-profile");
          }}
        />
      ) : (
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={handleStudentSelect}
        />
      )}

      {selectedStudent && (
        <div style={{ marginTop: 22 }}>
          <div className="va-step-badge" style={{ marginBottom: 14 }}>
            <span className="va-step-num">2</span>
            {selectedStudent.name}'s Visual Aids
          </div>

          {loading ? (
            <Loading text="Loading visual aids…" />
          ) : aids.length === 0 ? (
            <EmptyState
              icon={<PhotoIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
              message="No visual aids saved for this student yet."
              description="Create an AI-generated visual aid based on this student's IEP goals."
              actionLabel="Generate Visual Aid"
              actionIcon={<SparklesIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
              onAction={onGoToGenerate}
            />
          ) : (
            <AidRowList
              aids={aids}
              actionLabel="View"
              onAction={(aid) => setInspectingAid(aid)}
              actionClass="va-btn va-btn-primary"
              showDownload={true}
            />
          )}
        </div>
      )}

      {/* ── Inspection Modal with 3-Step Sequence Viewer ── */}
      {inspectingAid && (
        <div className="va-modal-backdrop" onClick={() => setInspectingAid(null)}>
          <div className="va-modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="va-detail-hero" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                <div>
                  <h2 className="va-detail-title">{inspectingAid.title}</h2>
                  <div className="va-detail-meta">
                    <div className="va-meta-chip">
                      <UserIcon className="w-4 h-4 text-slate-500 mr-1" aria-hidden="true" />
                      {inspectingAid.studentName}
                    </div>
                    <div className="va-meta-chip">
                      <DiskIcon className="w-4 h-4 text-slate-500 mr-1" aria-hidden="true" />
                      ID #{inspectingAid.visualAidID}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="va-btn va-btn-ghost"
                  onClick={() => setInspectingAid(null)}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <SequentialSequenceViewer
              aid={inspectingAid}
              onAidUpdated={(updatedAid) => {
                setInspectingAid(updatedAid);
                setAids((prev) =>
                  prev.map((a) => (a.visualAidID === updatedAid.visualAidID ? updatedAid : a))
                );
              }}
              onClose={() => setInspectingAid(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
function DeleteTab({ setActivePage, onGoToGenerate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [aids, setAids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const item = aids.find((a) => a.visualAidID === toDelete);

  useEffect(() => {
    studentsAPI
      .list(user?.id)
      .then(setStudents)
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [user?.id]);

  const fetchAids = useCallback((studentID) => {
    if (!studentID) {
      setAids([]);
      return;
    }

    setLoading(true);
    setError("");
    visualAidsAPI
      .listByStudent(studentID)
      .then(setAids)
      .catch(() => setError("Failed to load visual aids for this student."))
      .finally(() => setLoading(false));
  }, []);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setToDelete(null);
    setAids([]);
    fetchAids(student.studentID);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await visualAidsAPI.delete(toDelete);
      setAids((prev) => prev.filter((a) => a.visualAidID !== toDelete));
      toast.success("Visual aid deleted successfully.");
      setToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="va-card">
      <div className="va-card-header">
        <div className="va-card-icon">
          <TrashIcon className="w-5 h-5 text-red-600" aria-hidden="true" />
        </div>
        <div>
          <p className="va-card-title">Delete Visual Aids</p>
          <p className="va-card-subtitle">
            Select a student, then remove only that student's saved visual aids
          </p>
        </div>
      </div>
      <ErrorBanner message={error} />

      <div className="va-step-badge" style={{ marginBottom: 14 }}>
        <span className="va-step-num">1</span>Choose a Student
        {selectedStudent && (
          <span className="va-step-done-chip">
            <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" aria-hidden="true" />
            {selectedStudent.name}
          </span>
        )}
      </div>

      {loadingStudents ? (
        <Loading text="Fetching students…" />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<AcademicCapIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
          message="No students found."
          description="Register a student profile first to manage visual aids."
          actionLabel="Create Student Profile"
          actionIcon={<UserIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
          onAction={() => {
            navigate("/dashboard/students/create");
            if (setActivePage) setActivePage("create-student-profile");
          }}
        />
      ) : (
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={handleStudentSelect}
        />
      )}

      {selectedStudent && (
        <div style={{ marginTop: 22 }}>
          <div className="va-step-badge" style={{ marginBottom: 14 }}>
            <span className="va-step-num">2</span>
            {selectedStudent.name}'s Visual Aids
          </div>

          {loading ? (
            <Loading text="Loading visual aids…" />
          ) : aids.length === 0 ? (
            <EmptyState
              icon={<InboxIcon className="w-10 h-10 text-slate-400" aria-hidden="true" />}
              message="No visual aids saved for this student."
              description="There are currently no visual aids to delete for this student."
              actionLabel="Generate Visual Aid"
              actionIcon={<SparklesIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />}
              onAction={onGoToGenerate}
            />
          ) : (
            <AidRowList
              aids={aids}
              actionLabel="Delete"
              onAction={(aid) => setToDelete(aid.visualAidID)}
              actionClass="va-btn va-btn-danger"
            />
          )}
        </div>
      )}

      {toDelete && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <div className="va-modal-icon">
              <TrashIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
            </div>
            <p className="va-modal-title">Delete Visual Aid?</p>
            <p className="va-modal-body">
              You're about to permanently delete{" "}
              <strong>"{item?.title}"</strong>. This action cannot be undone.
            </p>
            <div className="va-modal-actions">
              <button
                className="va-btn va-btn-ghost"
                onClick={() => setToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="va-btn va-btn-danger-solid"
                onClick={confirmDelete}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageVisualAids({ setActivePage }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [hasDraft, setHasDraft] = useState(false);

  const { showPrompt, promptNavigation, confirmLeave, cancelLeave } =
    useUnsavedChanges({
      isDirty: hasDraft,
    });

  const handleTabClick = (tabKey) => {
    if (tabKey === activeTab) return;
    promptNavigation(() => setActiveTab(tabKey));
  };

  const handleConfirmLeave = () => {
    setHasDraft(false);
    confirmLeave();
  };

  return (
    <div className="page-content va-page">
      {/* Hero + tabs */}
      <div className="va-page-hero">
        <div className="va-hero-top">
          <div>
            <div className="va-hero-eyebrow">
              <div className="va-hero-eyebrow-dot" />
              NeuroPath · AI-Powered Tools
            </div>
            <h1 className="va-hero-title">Manage Visual Aids</h1>
            <p className="va-hero-subtitle">
              Generate, review, and manage AI-crafted visual aids for each
              student
            </p>
          </div>
        </div>

        <div className="va-tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`va-tab-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabClick(tab.key)}
            >
              <span className="va-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="va-body">
        {activeTab === "generate" && (
          <GenerateTab
            setActivePage={setActivePage}
            onDraftStatusChange={setHasDraft}
            promptNavigation={promptNavigation}
          />
        )}
        {activeTab === "view" && (
          <ViewTab
            setActivePage={setActivePage}
            onGoToGenerate={() => handleTabClick("generate")}
          />
        )}
        {activeTab === "delete" && (
          <DeleteTab
            setActivePage={setActivePage}
            onGoToGenerate={() => handleTabClick("generate")}
          />
        )}
      </div>

      <UnsavedChangesModal
        isOpen={showPrompt}
        onConfirm={handleConfirmLeave}
        onCancel={cancelLeave}
        title="Unsaved Visual Aid"
        message="You have an unsaved visual aid. If you leave without saving, your generated visual aid will be lost. Do you want to leave without saving?"
        confirmText="Yes, Leave Without Saving"
        cancelText="No, Stay"
      />
    </div>
  );
}
