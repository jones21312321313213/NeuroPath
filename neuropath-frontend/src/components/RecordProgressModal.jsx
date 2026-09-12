import { useState, useEffect, useRef } from "react";
import { trackingAPI } from "../api/client";

const PRESET_DOMAINS = [
  "Communication",
  "Mathematics",
  "Reading",
  "Social Skills",
  "Behavioral",
];

export function computeLevel(score) {
  const num = Number(score);
  if (num < 50) return { label: "Emerging", color: "#d97706", bg: "#fef3c7" };
  if (num < 75) return { label: "Developing", color: "#2563eb", bg: "#dbeafe" };
  if (num < 90) return { label: "Proficient", color: "#16a34a", bg: "#dcfce7" };
  return { label: "Advanced", color: "#7c3aed", bg: "#f3e8ff" };
}

export default function RecordProgressModal({
  isOpen,
  onClose,
  student,
  existingSubjects = [],
  initialSubject = "",
  onSubmitSuccess,
}) {
  const modalRef = useRef(null);
  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedSubjectOption, setSelectedSubjectOption] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [score, setScore] = useState("75");
  const [evalDate, setEvalDate] = useState(todayStr);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Build unique domains list
  const availableDomains = [
    ...PRESET_DOMAINS,
    ...existingSubjects
      .map((s) => s.name)
      .filter((name) => name && !PRESET_DOMAINS.includes(name)),
  ];

  useEffect(() => {
    if (isOpen) {
      const defaultDomain = initialSubject || availableDomains[0] || "Mathematics";
      if (availableDomains.includes(defaultDomain)) {
        setSelectedSubjectOption(defaultDomain);
        setCustomSubject("");
      } else if (defaultDomain) {
        setSelectedSubjectOption("__custom__");
        setCustomSubject(defaultDomain);
      } else {
        setSelectedSubjectOption("Mathematics");
      }
      setScore("75");
      setEvalDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setErrorMessage("");
    }
  }, [isOpen, initialSubject]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const currentLevel = computeLevel(score);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setErrorMessage("");

    const targetSubject =
      selectedSubjectOption === "__custom__"
        ? customSubject.trim()
        : selectedSubjectOption.trim();

    if (!targetSubject) {
      setErrorMessage("Please specify a domain / subject name.");
      return;
    }

    const numScore = parseInt(score, 10);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      setErrorMessage("Performance score must be between 0 and 100.");
      return;
    }

    if (!evalDate) {
      setErrorMessage("Please select an evaluation date.");
      return;
    }

    setIsSubmitting(true);
    try {
      await trackingAPI.recordProgress({
        studentID: student.studentID,
        subjectName: targetSubject,
        performanceScore: numScore,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to record progress. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="rpm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rpm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rpm-modal-container" ref={modalRef}>
        {/* Header */}
        <div className="rpm-modal-header">
          <div>
            <h2 id="rpm-modal-title" className="rpm-modal-title">
              📈 Log Student Progress
            </h2>
            <p className="rpm-modal-subtitle">
              Record evaluation scores and observations for <strong>{student.name}</strong>
            </p>
          </div>
          <button
            type="button"
            className="rpm-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} noValidate className="rpm-modal-body">
          {errorMessage && (
            <div className="rpm-error-alert" role="alert">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Domain / Subject Selection */}
          <div className="form-group rpm-form-group">
            <label htmlFor="rpm-subject-select" className="form-label rpm-label">
              Domain / Subject <span className="rpm-required">*</span>
            </label>
            <select
              id="rpm-subject-select"
              className="form-select rpm-select"
              value={selectedSubjectOption}
              onChange={(e) => setSelectedSubjectOption(e.target.value)}
              disabled={isSubmitting}
            >
              {availableDomains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
              <option value="__custom__">+ Custom Subject / Area...</option>
            </select>
          </div>

          {/* Custom Subject Input */}
          {selectedSubjectOption === "__custom__" && (
            <div className="form-group rpm-form-group">
              <label htmlFor="rpm-custom-subject-input" className="form-label rpm-label">
                Custom Subject Name <span className="rpm-required">*</span>
              </label>
              <input
                id="rpm-custom-subject-input"
                className="form-input rpm-input"
                placeholder="Enter custom subject (e.g. Speech Therapy, Fine Motor Skills)"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          )}

          {/* Performance Score Input & Slider */}
          <div className="form-group rpm-form-group">
            <div className="rpm-score-header">
              <label htmlFor="rpm-score-input" className="form-label rpm-label" style={{ margin: 0 }}>
                Performance Score (0% – 100%) <span className="rpm-required">*</span>
              </label>
              <span
                className="rpm-level-badge"
                style={{ color: currentLevel.color, background: currentLevel.bg }}
              >
                {currentLevel.label} ({score || 0}%)
              </span>
            </div>
            <div className="rpm-score-controls">
              <input
                id="rpm-score-slider"
                type="range"
                min="0"
                max="100"
                value={isNaN(parseInt(score, 10)) ? 0 : Math.max(0, Math.min(100, parseInt(score, 10)))}
                onChange={(e) => setScore(e.target.value)}
                className="rpm-range-slider"
                disabled={isSubmitting}
                aria-label="Score adjustment slider"
              />
              <input
                id="rpm-score-input"
                type="number"
                min="0"
                max="100"
                className="form-input rpm-score-number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Evaluation Date */}
          <div className="form-group rpm-form-group">
            <label htmlFor="rpm-date-input" className="form-label rpm-label">
              Evaluation Date <span className="rpm-required">*</span>
            </label>
            <input
              id="rpm-date-input"
              type="date"
              className="form-input rpm-input"
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Observation Notes */}
          <div className="form-group rpm-form-group">
            <div className="rpm-notes-header">
              <label htmlFor="rpm-notes-textarea" className="form-label rpm-label" style={{ margin: 0 }}>
                Observation Notes (Optional)
              </label>
              <span className="rpm-char-count">{notes.length} / 500</span>
            </div>
            <textarea
              id="rpm-notes-textarea"
              rows="3"
              maxLength={500}
              className="form-textarea rpm-textarea"
              placeholder="Record contextual notes, task mastery notes, behavioral triggers, or prompt level needed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Footer Actions */}
          <div className="rpm-modal-footer">
            <button
              type="button"
              className="btn btn-back rpm-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-submit rpm-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Progress"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
