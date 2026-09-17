import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Badge } from "./Badge";
import {
  ArrowPathIcon,
  ClockIcon,
  DiskIcon,
  UserIcon,
  TargetIcon,
  LightBulbIcon,
  DocumentIcon,
  WrenchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "./icons";

/**
 * IepPostGenerationModal (Issue #157)
 *
 * Post-generation preview modal displaying formulated SMART annual goals,
 * R-GORI pedagogical rigor evaluation scores, enroute objective breakdowns,
 * and configured accommodations, with options to "Accept & Save" or "Regenerate".
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is displayed
 * @param {() => void} props.onClose - Callback to close/dismiss the modal
 * @param {Array<object>} props.goals - Array of generated goal payloads
 * @param {string|Array<string>} [props.accommodations=""] - Accommodations text or array
 * @param {string} [props.studentName=""] - Learner/Student name
 * @param {string} [props.goalArea=""] - Selected goal category/area
 * @param {() => Promise<void>|void} props.onAcceptAndSave - Callback to save goals to the IEP record
 * @param {(notes?: string) => Promise<void>|void} props.onRegenerate - Callback to trigger draft regeneration
 * @param {boolean} [props.isSaving=false] - Whether the goals are currently saving
 * @param {boolean} [props.isRegenerating=false] - Whether regeneration is in progress
 */
export function IepPostGenerationModal({
  isOpen = false,
  onClose,
  goals = [],
  accommodations = "",
  studentName = "",
  goalArea = "",
  onAcceptAndSave,
  onRegenerate,
  isSaving = false,
  isRegenerating = false,
}) {
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenerationNotes, setRegenerationNotes] = useState("");

  if (!isOpen) return null;

  const handleRegenerateClick = () => {
    if (onRegenerate) {
      onRegenerate(regenerationNotes.trim() || undefined);
    }
  };

  const formattedAccommodations = Array.isArray(accommodations)
    ? accommodations.filter(Boolean)
    : typeof accommodations === "string"
      ? accommodations
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving || isRegenerating ? undefined : onClose}
      title="Review Generated IEP Draft"
      size="3xl"
      closeOnEsc={!isSaving && !isRegenerating}
      closeOnBackdrop={!isSaving && !isRegenerating}
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isRegenerating}
              className="w-full sm:w-auto text-slate-600 hover:bg-slate-100"
            >
              Cancel / Close
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerateClick}
              disabled={isSaving || isRegenerating}
              className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              {isRegenerating ? (
                <span className="flex items-center gap-1.5">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-500" aria-hidden="true" />
                  Regenerating...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
                  Regenerate
                </span>
              )}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onAcceptAndSave}
              disabled={isSaving || isRegenerating || goals.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                  Saving Goals...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <DiskIcon className="w-4 h-4 text-white" aria-hidden="true" />
                  Accept &amp; Save IEP
                </span>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Context metadata banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {studentName && (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                {studentName}
              </span>
            )}
            {goalArea && (
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/60">
                <TargetIcon className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                {goalArea}
              </span>
            )}
            <Badge variant="purple" size="sm">
              {goals.length} {goals.length === 1 ? "Goal Drafted" : "Goals Drafted"}
            </Badge>
          </div>

          <span className="text-xs text-slate-500 italic">
            Review draft before committing to record
          </span>
        </div>

        {/* Informational Guidance Callout */}
        <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <LightBulbIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Pedagogical Review Check:</strong> Inspect the proposed annual goal,
            enroute objectives, and R-GORI rigor evaluation. Click <strong>Accept &amp; Save</strong> to
            commit to the IEP record, or <strong>Regenerate</strong> to formulate an alternate draft.
          </div>
        </div>

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            No goals were generated in this draft. Please click Regenerate to try again.
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, idx) => {
              const rgoriScore = goal._rgori_score;
              const rgoriFeedback = goal._rgori_feedback;
              const objectiveRows = goal.objective_rows || [];

              let scoreVariant = "info";
              let scoreLabel = "Calculated";
              if (typeof rgoriScore === "number") {
                if (rgoriScore >= 80) {
                  scoreVariant = "success";
                  scoreLabel = "Exemplary";
                } else if (rgoriScore >= 65) {
                  scoreVariant = "warning";
                  scoreLabel = "Compliant";
                } else {
                  scoreVariant = "danger";
                  scoreLabel = "Needs Review";
                }
              }

              return (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3"
                >
                  {/* Goal Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Goal {idx + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 m-0">
                        {goal.subject_category || goal.goalName || "Individualized Goal"}
                      </h4>
                    </div>

                    {rgoriScore != null && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant={scoreVariant} size="sm">
                          R-GORI: {rgoriScore}/100 ({scoreLabel})
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Annual Goal Statement */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                      <TargetIcon className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                      <span>Annual Measurable Goal:</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 m-0 leading-relaxed">
                      {goal.annual_goal || goal.annualGoal || "No annual goal statement provided."}
                    </p>
                  </div>

                  {/* Target Metric if present */}
                  {goal.target_metric && (
                    <div className="text-xs text-slate-600">
                      <strong>Target Metric:</strong> {goal.target_metric}
                    </div>
                  )}

                  {/* RGORI Feedback Note */}
                  {rgoriFeedback && (
                    <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs text-amber-900 flex items-start gap-1.5">
                      <DocumentIcon className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong>R-GORI Feedback:</strong> {rgoriFeedback}
                      </div>
                    </div>
                  )}

                  {/* Enroute Objectives Rows */}
                  {objectiveRows.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-semibold text-slate-700">
                        Enroute Objectives &amp; Instructional Strategies ({objectiveRows.length}):
                      </div>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs text-left text-slate-700">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 w-1/3">Objective / Milestone</th>
                              <th className="px-3 py-2 w-5/12">Interventions / Strategies</th>
                              <th className="px-3 py-2 w-1/4">Timeline / Schedule</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {objectiveRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-2 align-top font-medium text-slate-900">
                                  {row.enroute_objectives || row.objective || row.procedure || "—"}
                                </td>
                                <td className="px-3 py-2 align-top text-slate-600">
                                  {row.interventions_procedures || row.interventions || row.intervention || "—"}
                                </td>
                                <td className="px-3 py-2 align-top text-slate-500 whitespace-nowrap">
                                  {row.timeline_mins_session || row.timeline || "Ongoing"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Accommodations Preview */}
        {formattedAccommodations.length > 0 && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <WrenchIcon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Configured Accommodations:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {formattedAccommodations.map((acc, aIdx) => (
                <span
                  key={aIdx}
                  className="inline-flex items-center text-xs bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
                >
                  {acc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Optional Regeneration Guidance Accordion */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRegenPrompt((prev) => !prev)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showRegenPrompt ? (
                <ChevronDownIcon className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Guidance for Regeneration (Optional)</span>
            </button>
            {regenerationNotes.trim() && (
              <Badge variant="info" size="sm">
                Custom prompt active
              </Badge>
            )}
          </div>

          {showRegenPrompt && (
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor="regen-instruction-input"
                className="text-xs text-slate-600 block"
              >
                Provide specific guidance or adjustments for the AI generator:
              </label>
              <textarea
                id="regen-instruction-input"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="e.g., Focus on AAC visual schedule prompt levels, adjust timeline to quarterly milestones..."
                value={regenerationNotes}
                onChange={(e) => setRegenerationNotes(e.target.value)}
                disabled={isSaving || isRegenerating}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default IepPostGenerationModal;
