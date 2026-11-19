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

const TourBellIcon = ({ className = "" }) => (
  <i className={`ti ti-bell text-2xl text-[#3d9de8] ${className}`} aria-hidden="true" />
);

const TUTORIAL_STEPS = [
  {
    step: 1,
    badge: "Step 1 of 6",
    targetId: "tour-student-profiling",
    menuLabel: "Student Profiling",
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
    badge: "Step 2 of 6",
    targetId: "tour-iep-generation",
    menuLabel: "AI-Based IEP Generation",
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
    badge: "Step 3 of 6",
    targetId: "tour-instructional-support",
    menuLabel: "Instructional Support",
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
    badge: "Step 4 of 6",
    targetId: "tour-outcome-monitoring",
    menuLabel: "Outcome Monitoring",
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
    badge: "Step 5 of 6",
    targetId: "tour-schedule",
    menuLabel: "Calendar & Schedules",
    title: "5. Calendar & Schedules",
    subtitle: "Milestone Reminders & Event Planning",
    description:
      "Track automated time-bound IEP milestone deadlines (+30d Month 1, +60d Month 2, +90d Review, +365d Renewal) and schedule school events.",
    icon: CalendarIcon,
    highlights: [
      "Automated time-bound IEP milestone reminder schedule",
      "Color-coded priority calendar with clickable daily event view",
    ],
  },
  {
    step: 6,
    badge: "Step 6 of 6",
    targetId: "tour-notifications",
    menuLabel: "Notifications",
    title: "6. Notifications History",
    subtitle: "Priority Lead-Time Alerts & Log",
    description:
      "View all historical reminders (10 per page) triggered automatically by milestone priority (Low: 1d, Med: 2d, High: 3d) and on the event day.",
    icon: TourBellIcon,
    highlights: [
      "Full paginated notification history with read & priority filters",
      "Mark alerts as read and jump straight into recording progress",
    ],
  },
];

export default function TeacherTutorialModal({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardHeight, setCardHeight] = useState(440);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const touchStartXRef = useRef(null);

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
      // Allow internal scrolling and touch swipes inside the walkthrough card
      if (containerRef.current && containerRef.current.contains(e.target)) {
        return;
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
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setViewport((prev) =>
      prev.width === vw && prev.height === vh ? prev : { width: vw, height: vh },
    );

    if (containerRef.current) {
      const measured = containerRef.current.getBoundingClientRect().height;
      if (measured > 0) {
        setCardHeight(Math.ceil(measured));
      }
    }

    const targetElement = document.querySelector(`[data-tour-id="${currentStep.targetId}"]`);
    if (targetElement) {
      let rect = targetElement.getBoundingClientRect();
      const isHorizontallyVisible = rect.right > 8 && rect.left < vw - 8;

      // Only scroll into view if the target is actually on screen horizontally
      // (prevents scrolling hidden off-canvas mobile sidebar drawers)
      if (
        isHorizontallyVisible &&
        typeof targetElement.scrollIntoView === "function"
      ) {
        const isMobileView = vw <= 768;
        const needsScroll = isMobileView
          ? rect.bottom > vh * 0.5 || rect.top < 12
          : rect.bottom > vh - 16 || rect.top < 16;

        if (needsScroll) {
          targetElement.scrollIntoView({
            block: isMobileView ? "start" : "nearest",
            behavior: "auto",
          });
          rect = targetElement.getBoundingClientRect();
        }
      }

      const isVisibleInViewport =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 8 &&
        rect.left < vw - 8 &&
        rect.bottom > 8 &&
        rect.top < vh - 8;

      if (isVisibleInViewport) {
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
    let settleTimerId = null;
    let observer = null;
    let sidebarEl = null;
    const handleUpdate = () => {
      updateTargetRect();
    };

    if (typeof window !== "undefined") {
      animId = window.requestAnimationFrame(handleUpdate);
      // Re-measure after mobile off-canvas drawer slide-in transition (250ms) settles
      settleTimerId = window.setTimeout(handleUpdate, 280);
      window.addEventListener("resize", handleUpdate);
      window.addEventListener("scroll", handleUpdate, true);

      // Re-clamp immediately if sidebar accordions expand/collapse or drawer finishes animating
      sidebarEl =
        document.querySelector(".sidebar") || document.querySelector("aside");
      if (sidebarEl) {
        sidebarEl.addEventListener("transitionend", handleUpdate);
        if (typeof MutationObserver !== "undefined") {
          observer = new MutationObserver(() => {
            window.requestAnimationFrame(handleUpdate);
          });
          observer.observe(sidebarEl, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        }
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        if (animId !== null) window.cancelAnimationFrame(animId);
        if (settleTimerId !== null) window.clearTimeout(settleTimerId);
        window.removeEventListener("resize", handleUpdate);
        window.removeEventListener("scroll", handleUpdate, true);
      }
      if (sidebarEl) {
        sidebarEl.removeEventListener("transitionend", handleUpdate);
      }
      if (observer) observer.disconnect();
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

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || !e.changedTouches?.length) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX < -50) {
      handleNext();
    } else if (deltaX > 50) {
      handlePrev();
    }
  };

  const isMobile = viewport.width <= 768;

  let cardStyle = {};
  let caretStyle = {};
  let mobilePlacement = "centered";

  if (targetRect) {
    const viewportPadding = 16;
    const maxCardHeight = Math.max(240, viewport.height - viewportPadding * 2);

    if (!isMobile) {
      const effectiveHeight = Math.min(cardHeight || 440, maxCardHeight);
      const maxTop = Math.max(
        viewportPadding,
        viewport.height - effectiveHeight - viewportPadding,
      );
      const cardWidth = 430;
      const left = Math.max(
        viewportPadding,
        Math.min(targetRect.right + 16, viewport.width - cardWidth - 20),
      );
      const top = Math.max(viewportPadding, Math.min(targetRect.top - 14, maxTop));
      cardStyle = {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        maxWidth: `${cardWidth}px`,
        maxHeight: `${maxCardHeight}px`,
        width: "100%",
        zIndex: 9999,
      };
      const caretTop = Math.max(
        16,
        Math.min(targetRect.top + targetRect.height / 2 - top - 7, effectiveHeight - 30),
      );
      caretStyle = {
        top: `${caretTop}px`,
      };
    } else {
      // Mobile docked sheet placement: keep spotlighted menu tab fully unobstructed
      // Using max 44% viewport height (capped at 340px) guarantees every nav item on
      // standard portrait screens (e.g., 390x844) fits cleanly above or below with zero dead zone.
      const mobilePadding = 12;
      const mobileMaxCardHeight = Math.min(
        340,
        Math.max(220, Math.floor(viewport.height * 0.44)),
      );
      const effectiveMobileHeight = Math.min(cardHeight || 320, mobileMaxCardHeight);
      const bottomSheetTop = viewport.height - effectiveMobileHeight - mobilePadding;

      if (targetRect.bottom <= bottomSheetTop - 8) {
        mobilePlacement = "bottom";
        cardStyle = {
          position: "fixed",
          left: `${mobilePadding}px`,
          right: `${mobilePadding}px`,
          bottom: `${mobilePadding}px`,
          maxWidth: `calc(100vw - ${mobilePadding * 2}px)`,
          maxHeight: `${mobileMaxCardHeight}px`,
          width: "auto",
          zIndex: 10000,
        };
      } else if (targetRect.top >= effectiveMobileHeight + mobilePadding * 2) {
        mobilePlacement = "top";
        cardStyle = {
          position: "fixed",
          left: `${mobilePadding}px`,
          right: `${mobilePadding}px`,
          top: `${mobilePadding}px`,
          maxWidth: `calc(100vw - ${mobilePadding * 2}px)`,
          maxHeight: `${mobileMaxCardHeight}px`,
          width: "auto",
          zIndex: 10000,
        };
      } else {
        // Short landscape mobile viewports: fall back to clean centered modal above backdrop
        mobilePlacement = "centered";
        cardStyle = {
          position: "relative",
          zIndex: 10000,
        };
      }
    }
  }

  const showSpotlight = Boolean(targetRect && (!isMobile || mobilePlacement !== "centered"));

  return (
    <div
      ref={wrapperRef}
      className={showSpotlight ? "tour-spotlight-wrapper" : "tutorial-modal-overlay"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      data-mobile-placement={isMobile ? mobilePlacement : undefined}
    >
      {/* Dimmed Spotlight Cutout (only when target element is visibly on-screen) */}
      {showSpotlight && (
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

      {/* Dimmed Backdrop (when no visible spotlight cutout is active) */}
      {!showSpotlight && (
        <div className="tour-fallback-backdrop" aria-hidden="true" />
      )}

      {/* Floating Guided Tooltip Card / Mobile Walkthrough Sheet */}
      <div
        ref={containerRef}
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`tutorial-modal-container ${showSpotlight ? "tour-anchored-card" : ""} ${
          isMobile ? `tutorial-mobile-sheet tutorial-mobile-${mobilePlacement}` : ""
        }`}
        style={cardStyle}
      >
        {showSpotlight && !isMobile && (
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
          {isMobile && (
            <div
              className="tutorial-mobile-nav-hint"
              data-testid="tutorial-mobile-nav-hint"
            >
              <i className="ti ti-menu-2" aria-hidden="true" />
              <span>Menu &rsaquo; {currentStep.menuLabel}</span>
            </div>
          )}

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

          {isMobile && (
            <span className="tutorial-swipe-hint" aria-hidden="true">
              Swipe or tap
            </span>
          )}

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
