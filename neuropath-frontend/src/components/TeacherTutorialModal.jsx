import { useState } from "react";

const TUTORIAL_STEPS = [
  {
    step: 1,
    badge: "Step 1 of 5",
    title: "Welcome to NeuroPath",
    subtitle: "Empowering SPED teachers with purposeful instructional planning",
    description:
      "NeuroPath connects each stage of your special education workflow into a cohesive pedagogical path: from comprehensive student profiling, to individualized IEP goal creation, differentiated classroom resources, and longitudinal progress tracking.",
    icon: "🌟",
    highlights: [
      "Teacher-centered, individualized workflow",
      "Designed specifically for Special Education classrooms",
      "Clear, actionable tools to support every learner",
    ],
  },
  {
    step: 2,
    badge: "Step 2 of 5",
    title: "1. Comprehensive Student Profiling",
    subtitle: "Capture learning strengths, sensory needs, and accommodations",
    description:
      "Begin by creating or reviewing student profiles. Record foundational assessment data, functional strengths, behavioral needs, and parental input. This rich profile serves as the single source of truth for all downstream tools.",
    icon: "👤",
    highlights: [
      "Document present levels of academic & functional performance",
      "Detail environmental and sensory accommodations",
      "Directly informs AI-assisted IEP goals and lesson materials",
    ],
  },
  {
    step: 3,
    badge: "Step 3 of 5",
    title: "2. Intelligent IEP Goal Generation",
    subtitle: "Draft SMART goals aligned with student present levels",
    description:
      "Transform profile data into targeted, measurable IEP goals and objective benchmarks. Review and refine AI-drafted goals to match each student's specific curriculum grade standards and individualized needs.",
    icon: "📋",
    highlights: [
      "Generates SMART (Specific, Measurable, Attainable, Relevant, Time-bound) goals",
      "Aligned with Section A profile data and present performance levels",
      "Full teacher control to review, edit, or regenerate goals",
    ],
  },
  {
    step: 4,
    badge: "Step 4 of 5",
    title: "3. Classroom Instructional Support",
    subtitle: "Generate differentiated lesson plans, visual aids, & strategies",
    description:
      "Put IEP accommodations into practice immediately. Generate adapted lesson plans, visual schedules, communication boards, and evidence-based teaching strategies tailored to your students.",
    icon: "🎨",
    highlights: [
      "Customized lesson plans with accommodations built in",
      "Visual schedules and choice boards ready to export",
      "Specialized behavioral and pedagogical strategies",
    ],
  },
  {
    step: 5,
    badge: "Step 5 of 5",
    title: "4. Outcome & Progress Monitoring",
    subtitle: "Track goal mastery and celebrate student growth",
    description:
      "Log observations, trial data, and assessment results over time. Visualize progress toward annual IEP goals to make data-informed instructional adjustments and prepare for review meetings.",
    icon: "📈",
    highlights: [
      "Ongoing mastery tracking for each active IEP goal",
      "Visual progress charts and trends across subjects",
      "Exportable summary records for team and parent conferences",
    ],
  },
];

export default function TeacherTutorialModal({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

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

  return (
    <div
      className="tutorial-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div className="tutorial-modal-container">
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
          aria-valuemax={5}
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
            <span className="tutorial-icon">{currentStep.icon}</span>
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
                  <span className="tutorial-check-icon">✓</span>
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
