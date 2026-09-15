import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { IEP_STAGES } from "../../constants/iepLoadingStages";

/**
 * Dedicated Loading Modal during IEP Generation (Issue #156)
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the loading modal is visible
 * @param {string} [props.studentName] - Name of the student being evaluated
 * @param {string} [props.goalArea] - Targeted IEP goal area (e.g. Math, Language Arts)
 * @param {number} [props.progressProp] - Optional explicit progress percentage (0-100) for testing/custom drives
 */
export function IepLoadingModal({
  isOpen = false,
  studentName = "",
  goalArea = "",
  progressProp,
}) {
  const [simulatedProgress, setSimulatedProgress] = useState(8);

  useEffect(() => {
    if (!isOpen || progressProp !== undefined) return;

    // Smooth progressive timer across stages up to 93% max while in-flight
    const timer = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev < 25) {
          return prev + 3;
        } else if (prev < 55) {
          return prev + 2;
        } else if (prev < 85) {
          return prev + 1.2;
        } else if (prev < 93) {
          return prev + 0.4;
        }
        return prev;
      });
    }, 280);

    return () => {
      clearInterval(timer);
      setSimulatedProgress(8);
    };
  }, [isOpen, progressProp]);

  if (!isOpen) return null;

  const progress = Math.min(
    100,
    Math.max(0, progressProp !== undefined ? progressProp : simulatedProgress),
  );

  const roundedProgress = Math.round(progress);
  const isAlmostDone = roundedProgress >= 85;

  // Determine current active stage index based on progress
  let currentStageIndex = 0;
  if (progress >= 85) {
    currentStageIndex = 3;
  } else if (progress >= 55) {
    currentStageIndex = 2;
  } else if (progress >= 25) {
    currentStageIndex = 1;
  } else {
    currentStageIndex = 0;
  }

  return (
    <Modal
      isOpen={isOpen}
      role="dialog"
      aria-busy="true"
      aria-modal="true"
      aria-labelledby="iep-loading-title"
      size="lg"
      closeOnEsc={false}
      closeOnBackdrop={false}
      className="border border-indigo-100 shadow-2xl"
    >
      <div className="p-2 space-y-6">
        {/* Header with animated AI Badge */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-xs select-none shrink-0 relative"
            aria-hidden="true"
          >
            <span className="relative z-10 animate-pulse">✦</span>
            <span className="absolute inset-0 rounded-2xl bg-indigo-400/20 animate-ping opacity-60 pointer-events-none" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="iep-loading-title"
                className="text-lg font-bold text-slate-900 m-0 tracking-tight"
              >
                Generating Individualized Education Plan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Our pedagogical AI engine is synthesizing profile data into standards-aligned goals.
            </p>

            {/* Student and Goal Area Tags */}
            {(studentName || goalArea) && (
              <div className="flex items-center gap-2 flex-wrap">
                {studentName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                    <span className="text-slate-400">Student:</span>
                    <strong className="text-slate-800">{studentName}</strong>
                  </span>
                )}
                {goalArea && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    <span className="text-indigo-400">Goal Area:</span>
                    <strong className="text-indigo-800">{goalArea}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar & Status percentage */}
        <div className="space-y-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              {isAlmostDone ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span>⚡</span> Almost done! Finalizing IEP document...
                </span>
              ) : (
                <span className="text-slate-700">
                  {IEP_STAGES[currentStageIndex].title}...
                </span>
              )}
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                isAlmostDone ? "text-emerald-600" : "text-indigo-600"
              }`}
            >
              {roundedProgress}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={roundedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="IEP generation progress"
            className="w-full bg-slate-200/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-300/60"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isAlmostDone
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
                  : "bg-gradient-to-r from-indigo-500 to-blue-500"
              }`}
              style={{ width: `${roundedProgress}%` }}
            />
          </div>
        </div>

        {/* Sequential Milestone Stepper */}
        <div className="space-y-2.5" role="list" aria-label="Generation stages">
          {IEP_STAGES.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isActive = currentStageIndex === idx;

            return (
              <div
                key={stage.id}
                role="listitem"
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors border ${
                  isActive
                    ? "bg-indigo-50/60 border-indigo-200/80 shadow-xs"
                    : isCompleted
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-white border-slate-100 opacity-60"
                }`}
              >
                {/* Step indicator icon */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 select-none ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-xs"
                      : isActive
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse"
                        : "bg-slate-200 text-slate-500"
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? "✓" : stage.id}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold m-0 ${
                        isActive
                          ? "text-indigo-950 font-bold"
                          : isCompleted
                            ? "text-slate-800"
                            : "text-slate-500"
                      }`}
                    >
                      {stage.title}
                    </p>
                    <span
                      className={`text-[11px] font-medium tracking-tight uppercase px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-100/70 text-emerald-800 font-semibold"
                          : isActive
                            ? "bg-indigo-100 text-indigo-800 font-bold"
                            : "text-slate-400 bg-slate-100"
                      }`}
                    >
                      {isCompleted
                        ? "Completed"
                        : isActive
                          ? "In progress..."
                          : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 m-0 mt-0.5 leading-normal">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Helpful reassurance footnote */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900">
          <span className="text-base shrink-0 select-none" aria-hidden="true">
            ⏳
          </span>
          <p className="m-0 leading-relaxed font-normal">
            Please keep this window open while AI crafts goals and checks rubric compliance. This typically takes 5 to 15 seconds.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default IepLoadingModal;
