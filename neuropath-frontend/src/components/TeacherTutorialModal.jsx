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
    subtitle: "Learner Profiles & Accommodations",
    description:
      "Record student assessment baselines, functional strengths, behavioral needs, and accommodations as the foundation for all downstream tools.",
    icon: UserIcon,
    highlights: [
      "Document academic & functional performance levels",
      "Directly informs AI-drafted IEP goals and lesson materials",
    ],
  },
  {
    step: 2,
    badge: "Step 2 of 5",
    targetId: "tour-iep-generation",
    title: "2. Intelligent IEP Goal Generation",
    subtitle: "SMART Goals & DepEd Matrix Alignment",
    description:
      "Transform profile data into targeted SMART goals, quarterly benchmarks, and Section C procedures with complete teacher review control.",
    icon: ClipboardIcon,
    highlights: [
      "AI-drafted SMART goals aligned with student present levels",
      "Full control to review, edit, or regenerate goals anytime",
    ],
  },
  {
    step: 3,
    badge: "Step 3 of 5",
    targetId: "tour-instructional-support",
    title: "3. Classroom Instructional Support",
    subtitle: "Differentiated Plans & Visual Schedules",
    description:
      "Put accommodations into practice with adapted lesson plans, visual task schedules, communication boards, and evidence-based teaching strategies.",
    icon: PhotoIcon,
    highlights: [
      "Differentiated lesson plans with accommodations built in",
      "Printable visual aids, schedules, and behavioral strategies",
    ],
  },
  {
    step: 4,
    badge: "Step 4 of 5",
    targetId: "tour-outcome-monitoring",
    title: "4. Outcome & Progress Monitoring",
    subtitle: "Trial Mastery & Longitudinal Trends",
    description:
      "Log trial evaluations and observations over time to monitor progress against the 70% benchmark mastery line and generate review summaries.",
    icon: ChartBarIcon,
    highlights: [
      "Ongoing mastery tracking for active IEP goals",
      "Exportable summary records for team and parent reviews",
    ],
  },
  {
    step: 5,
    badge: "Step 5 of 5",
    targetId: "tour-schedule",
    title: "5. Calendar & Schedules",
    subtitle: "Milestone Reminders & Event Planning",
    description:
      "Track automated time-bound IEP milestone deadlines (+30d Month 1, +60d Month 2, +90d Review, +365d Renewal) and schedule school events.",
    icon: CalendarIcon,
    highlights: [
      "Automated time-bound IEP milestone reminder schedule",
      "Interactive calendar and top-bar reminder bell alerts",
    ],
  },
];

export default function TeacherTutorialModal({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  useFocusTrap({
    isActive: true,
    containerRef,
    onEscape: onComplete,
    returnFocus: true,
  });

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Lock body/window scrolling while walkthrough tour is active
  useEffect(() => {
    if (typeof document === "undefined") return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("tour-open");

    const preventScroll = (e) => {
      // Allow internal scrolling only if the tooltip card itself needs to scroll
      if (containerRef.current && containerRef.current.contains(e.target)) {
        const el = containerRef.current;
        if (el.scrollHeight > el.clientHeight) {
          return;
        }
      }
      e.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.classList.remove("tour-open");
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, []);

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
      const cardWidth = 430;
      const cardHeight = 350;
      const left = Math.min(targetRect.right + 16, window.innerWidth - cardWidth - 20);
      const top = Math.max(16, Math.min(targetRect.top - 14, window.innerHeight - cardHeight - 16));
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
      const top = Math.min(targetRect.bottom + 12, window.innerHeight - 340);
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
      ref={wrapperRef}
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
              <currentStep.icon className="w-6 h-6 text-[#3d9de8]" aria-hidden="true" />
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
                  <CheckIcon className="tutorial-check-icon w-3.5 h-3.5 text-[#3d9de8] inline shrink-0" aria-hidden="true" />
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
