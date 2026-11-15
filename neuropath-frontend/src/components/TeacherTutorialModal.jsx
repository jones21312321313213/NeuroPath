import { useState, useRef, useEffect, useCallback } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  UserIcon,
  ClipboardIcon,
  PhotoIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckIcon,
} from "./ui/icons";

const TUTORIAL_STEPS = [
  {
    step: 1,
    badge: "Step 1 of 5",
    targetId: "tour-student-profiling",
    title: "1. Comprehensive Student Profiling",
    subtitle: "Capture learning strengths, sensory needs, and accommodations",
    description:
      "Begin by creating or reviewing student profiles. Record foundational assessment data, functional strengths, behavioral needs, and parental input. This rich profile serves as the single source of truth for all downstream tools.",
    icon: UserIcon,
    highlights: [
      "Document present levels of academic & functional performance",
      "Detail environmental and sensory accommodations",
      "Directly informs AI-assisted IEP goals and lesson materials",
    ],
  },
  {
    step: 2,
    badge: "Step 2 of 5",
    targetId: "tour-iep-generation",
    title: "2. Intelligent IEP Goal Generation",
    subtitle: "Draft SMART goals aligned with student present levels",
    description:
      "Transform profile data into targeted, measurable IEP goals and objective benchmarks. Review and refine AI-drafted goals to match each student's specific curriculum grade standards and individualized needs.",
    icon: ClipboardIcon,
    highlights: [
      "Generates SMART (Specific, Measurable, Attainable, Relevant, Time-bound) goals",
      "Aligned with Section A profile data and present performance levels",
      "Full teacher control to review, edit, or regenerate goals",
    ],
  },
  {
    step: 3,
    badge: "Step 3 of 5",
    targetId: "tour-instructional-support",
    title: "3. Classroom Instructional Support",
    subtitle: "Generate differentiated lesson plans, visual aids, & strategies",
    description:
      "Put IEP accommodations into practice immediately. Generate adapted lesson plans, visual schedules, communication boards, and evidence-based teaching strategies tailored to your students.",
    icon: PhotoIcon,
    highlights: [
      "Customized lesson plans with accommodations built in",
      "Visual schedules and choice boards ready to export",
      "Specialized behavioral and pedagogical strategies",
    ],
  },
  {
    step: 4,
    badge: "Step 4 of 5",
    targetId: "tour-outcome-monitoring",
    title: "4. Outcome & Progress Monitoring",
    subtitle: "Track goal mastery and celebrate student growth",
    description:
      "Log observations, trial data, and assessment results over time. Visualize progress toward annual IEP goals to make data-informed instructional adjustments and prepare for review meetings.",
    icon: ChartBarIcon,
    highlights: [
      "Ongoing mastery tracking for each active IEP goal",
      "Visual progress charts and trends across subjects",
      "Exportable summary records for team and parent reviews",
    ],
  },
  {
    step: 5,
    badge: "Step 5 of 5",
    targetId: "tour-schedule",
    title: "5. Calendar & Schedules",
    subtitle: "Milestone reminders & classroom schedule planning",
    description:
      "Track automated time-bound IEP milestone reminders (+30d Month 1, +60d Month 2, +90d Quarterly Review, and +365d Annual Renewal) generated upon saving IEPs, with active version supersede logic.",
    icon: CalendarIcon,
    highlights: [
      "Automated time-bound IEP milestone deadline tracking",
      "Interactive monthly calendar and mobile-friendly agenda view",
      "Top bar notification bell reminders and custom event scheduling",
    ],
  },
];

export default function TeacherTutorialModal({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const containerRef = useRef(null);

  useFocusTrap({
    isActive: true,
    containerRef,
    onEscape: onComplete,
    returnFocus: true,
  });

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const updateTargetRect = useCallback(() => {
    if (typeof document === "undefined") return;
    const targetElement = document.querySelector(`[data-tour-id="${currentStep.targetId}"]`);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        });
        return;
      }
    }
    setTargetRect(null);
  }, [currentStep.targetId]);

  useEffect(() => {
    let animId = null;
    const handleUpdate = () => {
      updateTargetRect();
    };

    if (typeof window !== "undefined") {
      animId = window.requestAnimationFrame(handleUpdate);
      window.addEventListener("resize", handleUpdate);
      window.addEventListener("scroll", handleUpdate, true);
    }

    return () => {
      if (typeof window !== "undefined") {
        if (animId !== null) window.cancelAnimationFrame(animId);
        window.removeEventListener("resize", handleUpdate);
        window.removeEventListener("scroll", handleUpdate, true);
      }
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  let cardStyle = {};
  let caretStyle = {};

  if (targetRect) {
    if (!isMobile) {
      const cardWidth = 460;
      const cardHeight = 440;
      const left = Math.min(targetRect.right + 18, window.innerWidth - cardWidth - 20);
      const top = Math.max(16, Math.min(targetRect.top - 20, window.innerHeight - cardHeight - 16));
      cardStyle = {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${cardWidth}px`,
        width: "100%",
        zIndex: 9999,
      };
      const caretTop = Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - top - 7, cardHeight - 30));
      caretStyle = {
        top: `${caretTop}px`,
      };
    } else {
      const top = Math.min(targetRect.bottom + 14, window.innerHeight - 380);
      cardStyle = {
        position: "fixed",
        left: "16px",
        right: "16px",
        top: `${Math.max(16, top)}px`,
        maxWidth: "calc(100vw - 32px)",
        width: "auto",
        zIndex: 9999,
      };
    }
  }

  return (
    <div
      className={targetRect ? "tour-spotlight-wrapper" : "tutorial-modal-overlay"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      {/* Dimmed Spotlight Cutout (when target element found) */}
      {targetRect && (
        <div
          className="tour-spotlight-cutout"
          style={{
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dimmed Backdrop (when no target rect measured) */}
      {!targetRect && <div className="tour-fallback-backdrop" aria-hidden="true" />}

      {/* Floating Guided Tooltip Card */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`tutorial-modal-container ${targetRect ? "tour-anchored-card" : ""}`}
        style={cardStyle}
      >
        {targetRect && !isMobile && (
          <div className="tutorial-caret-arrow" style={caretStyle} aria-hidden="true" />
        )}

        {/* Header */}
        <div className="tutorial-modal-header">
          <div className="tutorial-badge">{currentStep.badge}</div>
          <button
            type="button"
            className="tutorial-skip-btn"
            onClick={onComplete}
            aria-label="Skip walkthrough"
          >
            Skip Walkthrough
          </button>
        </div>

        {/* Progress Bar */}
        <div
          className="tutorial-progress-bar"
          role="progressbar"
          aria-valuenow={currentStepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={TUTORIAL_STEPS.length}
        >
          {TUTORIAL_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className={`tutorial-progress-segment ${
                idx <= currentStepIndex ? "active" : ""
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="tutorial-modal-body">
          <div className="tutorial-icon-wrapper" aria-hidden="true">
            {typeof currentStep.icon === "function" ? (
              <currentStep.icon className="w-8 h-8 text-blue-600" aria-hidden="true" />
            ) : (
              <span className="tutorial-icon">{currentStep.icon}</span>
            )}
          </div>

          <h2 id="tutorial-modal-title" className="tutorial-title">
            {currentStep.title}
          </h2>
          <h3 className="tutorial-subtitle">{currentStep.subtitle}</h3>

          <p className="tutorial-description">{currentStep.description}</p>

          <div className="tutorial-highlights-box">
            <h4 className="tutorial-highlights-heading">Key Capabilities:</h4>
            <ul className="tutorial-highlights-list">
              {currentStep.highlights.map((highlight, idx) => (
                <li key={idx} className="tutorial-highlight-item">
                  <CheckIcon className="tutorial-check-icon w-4 h-4 text-emerald-600 inline shrink-0" aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="tutorial-modal-footer">
          <button
            type="button"
            className="btn-tutorial-secondary"
            onClick={handlePrev}
            disabled={isFirstStep}
          >
            Previous
          </button>

          <button
            type="button"
            className="btn-tutorial-primary"
            onClick={handleNext}
          >
            {isLastStep ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
