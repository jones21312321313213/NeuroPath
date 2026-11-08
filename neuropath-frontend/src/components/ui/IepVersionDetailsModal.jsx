import { useState, useEffect } from "react";
import Modal from "./Modal";
import { iepAPI } from "../../api/client";
import { CheckIcon, TargetIcon } from "./icons";

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
  const objectives = Array.isArray(raw.objectives)
    ? raw.objectives
    : Array.isArray(raw.objective_rows)
    ? raw.objective_rows
    : [];
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
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !iep?.iepID) {
      setGoals([]);
      setError("");
      return;
    }

    let isCancelled = false;
    setLoadingGoals(true);
    setError("");

    iepAPI
      .listGoalsByIep(iep.iepID)
      .then((res) => {
        if (isCancelled) return;
        const list = Array.isArray(res) ? res : res?.results || res?.data || [];
        setGoals(list.map(formatGoal));
      })
      .catch(() => {
        if (isCancelled) return;
        // Fallback to embedded goals if already present on iep object
        if (Array.isArray(iep.goals) && iep.goals.length > 0) {
          setGoals(iep.goals.map(formatGoal));
        } else {
          setGoals([]);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingGoals(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, iep]);

  if (!isOpen || !iep) return null;

  const versionNum = iep.version || 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`IEP Version ${versionNum}`}
      size="xl"
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
        {/* Associated Goals for Version */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 m-0">
              <TargetIcon className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Goals Associated with Version {versionNum}
            </h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {goals.length} {goals.length === 1 ? "Goal" : "Goals"}
            </span>
          </div>

          {loadingGoals ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mb-2" />
              <div>Fetching version goals…</div>
            </div>
          ) : error ? (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs">{error}</div>
          ) : goals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 italic">
              No specific goals saved under this version.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {goals.map((goal, idx) => (
                <div
                  key={goal.goalID || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-blue-100 text-blue-800">
                      {goal.goalArea}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      Goal #{idx + 1}
                    </span>
                  </div>
                  <p className="text-slate-800 m-0 font-medium leading-relaxed text-sm">
                    {goal.text}
                  </p>
                  {goal.objectives && goal.objectives.length > 0 && (
                    <ul className="mt-2.5 pl-4 list-disc space-y-1 text-slate-600 text-xs">
                      {goal.objectives.map((obj, oIdx) => (
                        <li key={oIdx}>
                          {typeof obj === "string"
                            ? obj
                            : obj.description || obj.objective || JSON.stringify(obj)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
