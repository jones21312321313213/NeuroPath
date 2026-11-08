import { useState, useEffect } from "react";
import Modal from "./Modal";
import { iepAPI } from "../../api/client";
import { CheckIcon, TargetIcon, SparklesIcon } from "./icons";

/**
 * Parse an objective row item safely, unpacking any JSON strings or DB row objects.
 */
function parseObjectiveRow(raw) {
  let row = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        row = JSON.parse(trimmed);
      } catch {
        return { text: raw };
      }
    } else {
      return { text: raw };
    }
  }

  if (!row || typeof row !== "object") {
    return { text: String(row || "") };
  }

  const text =
    row.enroute_objectives ||
    row.enroute_objective ||
    row.objective ||
    row.description ||
    row.procedure ||
    row.annual_goal ||
    "";

  return {
    rowID: row.rowID || row.id,
    text,
    month1: row.month_1_target || row.month_1 || row.month1 || "",
    month2: row.month_2_target || row.month_2 || row.month2 || "",
    month3: row.month_3_target || row.month_3 || row.month3 || "",
    interventions:
      row.interventions_procedures || row.interventions || row.procedure || "",
    timeline: row.timeline_mins_session || row.timeline || "",
    responsible:
      row.individuals_responsible &&
      row.individuals_responsible !== "| |" &&
      row.individuals_responsible.trim() !== "|"
        ? row.individuals_responsible.trim()
        : "",
    progress: row.progress_instructional || "",
    remarks: row.remarks || "",
  };
}

/**
 * Format saved goal object safely.
 */
function formatGoal(raw) {
  if (!raw) return { goalID: Math.random(), goalArea: "General", text: "" };
  const goalID = raw.goalID || raw.id || Math.random();
  const goalArea = raw.subject_category || raw.goalArea || raw.category || "General";
  const text =
    raw.annual_goal ||
    raw.goalName ||
    raw.annualGoal ||
    raw.description ||
    "No goal description provided.";
  const rawObjectives = Array.isArray(raw.objectives)
    ? raw.objectives
    : Array.isArray(raw.objective_rows)
    ? raw.objective_rows
    : [];
  const objectives = rawObjectives
    .map(parseObjectiveRow)
    .filter((o) => o && o.text);
  return { goalID, goalArea, text, objectives };
}

export default function IepVersionDetailsModal({
  isOpen = false,
  onClose,
  iep,
  studentName = "Student",
  onSelect,
  isSelected = false,
}) {
  const [goalsState, setGoalsState] = useState({ iepID: null, items: [] });

  useEffect(() => {
    if (!isOpen || !iep?.iepID) {
      return;
    }

    let isCancelled = false;
    const currentIepId = iep.iepID;

    iepAPI
      .listGoalsByIep(currentIepId)
      .then((res) => {
        if (isCancelled) return;
        const list = Array.isArray(res) ? res : res?.results || res?.data || [];
        setGoalsState({ iepID: currentIepId, items: list.map(formatGoal) });
      })
      .catch(() => {
        if (isCancelled) return;
        // Fallback to embedded goals if already present on iep object
        const fallbackItems =
          Array.isArray(iep.goals) && iep.goals.length > 0
            ? iep.goals.map(formatGoal)
            : [];
        setGoalsState({ iepID: currentIepId, items: fallbackItems });
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, iep]);

  if (!isOpen || !iep) return null;

  const loadingGoals = Boolean(iep.iepID && goalsState.iepID !== iep.iepID);
  const goals = goalsState.iepID === iep.iepID ? goalsState.items : [];
  const versionNum = iep.version || 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`IEP Version ${versionNum}`}
      size="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            Student: <span className="font-semibold text-slate-800">{studentName}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            {onSelect && (
              <button
                type="button"
                onClick={() => {
                  onSelect(iep);
                  if (onClose) onClose();
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  isSelected
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <CheckIcon className="w-4 h-4" aria-hidden="true" />
                <span>{isSelected ? "Currently Selected" : "Select This Version"}</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header summary row */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
            <TargetIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Goals Associated with Version {versionNum}
          </h4>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {goals.length} {goals.length === 1 ? "Goal" : "Goals"}
          </span>
        </div>

        {/* Content body */}
        {loadingGoals ? (
          <div className="p-10 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2.5" />
            <div className="font-medium">Fetching version goals…</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 italic">
            No specific goals saved under this version.
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {goals.map((goal, idx) => (
              <div
                key={goal.goalID || idx}
                className="p-5 rounded-2xl border-2 border-slate-200/80 bg-white hover:border-blue-300 transition-all shadow-xs"
              >
                {/* Goal Header */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <span className="inline-block px-3 py-1 rounded-lg font-bold text-xs bg-blue-100 text-blue-800 tracking-wide">
                    {goal.goalArea}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Goal #{idx + 1}
                  </span>
                </div>

                {/* Annual Goal Text */}
                <p className="text-slate-900 m-0 font-semibold leading-relaxed text-sm sm:text-base">
                  {goal.text}
                </p>

                {/* Milestone Objectives List */}
                {goal.objectives && goal.objectives.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                      <SparklesIcon className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                      Milestones &amp; Instructional Objectives
                    </div>

                    {goal.objectives.map((obj, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 text-xs space-y-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] shrink-0 mt-0.5">
                            {oIdx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug">
                              {obj.text}
                            </div>

                            {/* Monthly Targets if available */}
                            {(obj.month1 || obj.month2 || obj.month3) && (
                              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
                                {obj.month1 && (
                                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                                    <span className="font-bold text-[10.5px] uppercase tracking-wide text-blue-600 block mb-1">
                                      Month 1 Target
                                    </span>
                                    <span className="text-slate-700 text-xs leading-relaxed">
                                      {obj.month1}
                                    </span>
                                  </div>
                                )}
                                {obj.month2 && (
                                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                                    <span className="font-bold text-[10.5px] uppercase tracking-wide text-indigo-600 block mb-1">
                                      Month 2 Target
                                    </span>
                                    <span className="text-slate-700 text-xs leading-relaxed">
                                      {obj.month2}
                                    </span>
                                  </div>
                                )}
                                {obj.month3 && (
                                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                                    <span className="font-bold text-[10.5px] uppercase tracking-wide text-emerald-600 block mb-1">
                                      Month 3 Target
                                    </span>
                                    <span className="text-slate-700 text-xs leading-relaxed">
                                      {obj.month3}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Interventions & Timeline tags if present */}
                            {(obj.interventions || obj.timeline || obj.responsible) && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/60 text-[11.5px] text-slate-600">
                                {obj.timeline && (
                                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    <strong className="text-slate-700">Timeline:</strong> {obj.timeline}
                                  </span>
                                )}
                                {obj.interventions && (
                                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    <strong className="text-slate-700">Interventions:</strong> {obj.interventions}
                                  </span>
                                )}
                                {obj.responsible && (
                                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    <strong className="text-slate-700">Responsible:</strong> {obj.responsible}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
