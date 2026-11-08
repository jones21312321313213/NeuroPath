import { Modal } from "./Modal";
import { Badge } from "./Badge";
import { Button } from "./Button";

/**
 * RgoriComplianceModal (Issue #255)
 *
 * Detailed pedagogical audit modal displaying the 4-dimension R-GORI compliance
 * breakdown (Measurability, Functionality, Generality, and Instructional Context)
 * for a generated IEP annual goal.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is visible
 * @param {() => void} props.onClose - Callback to dismiss the modal
 * @param {string} [props.goalTitle=""] - Category or title of the goal
 * @param {string} [props.annualGoal=""] - The drafted annual measurable goal text
 * @param {object} [props.audit=null] - The explainable R-GORI audit payload
 */
export function RgoriComplianceModal({
  isOpen = false,
  onClose,
  goalTitle = "",
  annualGoal = "",
  audit = null,
}) {
  if (!isOpen) return null;

  const totalScore = typeof audit?.total_score === "number" ? audit.total_score : 80;
  const status =
    audit?.status ||
    (totalScore >= 85 ? "Exemplary" : totalScore >= 65 ? "IEP Ready" : "Review Advised");

  const rawBreakdown = audit?.breakdown || {};

  const getCriterionData = (key, fallbackName, fallbackScore, fallbackExp) => {
    const item = rawBreakdown[key];
    if (typeof item === "number") {
      return { score: item, explanation: fallbackExp };
    }
    if (item && typeof item === "object") {
      return {
        score: typeof item.score === "number" ? item.score : fallbackScore,
        explanation: item.explanation || fallbackExp,
      };
    }
    return { score: fallbackScore, explanation: fallbackExp };
  };

  const measurability = getCriterionData(
    "measurability",
    "Measurability",
    20,
    "Observable action verbs and concrete measurement thresholds."
  );
  const functionality = getCriterionData(
    "functionality",
    "Functionality",
    20,
    "Access, response, and active interaction in daily classroom routines."
  );
  const generality = getCriterionData(
    "generality",
    "Generality",
    20,
    "Generic behavioral class transferable across settings and materials."
  );
  const instructionalContext = getCriterionData(
    "instructional_context",
    "Instructional Context",
    20,
    "Jargon-free language teachable during everyday routines by any team member."
  );

  const criteria = [
    {
      id: "measurability",
      title: "Measurability",
      subtitle: "Observable Actions & Thresholds",
      score: measurability.score,
      explanation: measurability.explanation,
    },
    {
      id: "functionality",
      title: "Functionality",
      subtitle: "Daily Classroom Access & Routines",
      score: functionality.score,
      explanation: functionality.explanation,
    },
    {
      id: "generality",
      title: "Generality",
      subtitle: "Multi-Setting & Cross-Context Transfer",
      score: generality.score,
      explanation: generality.explanation,
    },
    {
      id: "instructional_context",
      title: "Instructional Context",
      subtitle: "Jargon-Free & Teachable in Routine",
      score: instructionalContext.score,
      explanation: instructionalContext.explanation,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="R-GORI Pedagogical Compliance Audit"
      size="3xl"
    >
      <div className="space-y-5 p-6 overflow-y-auto max-h-[78vh]">
        {/* Header Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Target Goal Audit
              </span>
              {goalTitle && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {goalTitle}
                </span>
              )}
            </div>
            {annualGoal && (
              <p className="text-xs text-slate-600 italic line-clamp-2 m-0">
                {annualGoal}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Quality Score
              </div>
              <div className="text-2xl font-bold text-blue-600 tracking-tight">
                {totalScore}/100
              </div>
            </div>
            <Badge variant="info" size="lg">
              {status}
            </Badge>
          </div>
        </div>

        {/* 4-Quadrant Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {criteria.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2.5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-sm font-bold text-slate-900 m-0">
                    {c.title}
                  </h5>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {c.subtitle}
                  </div>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                  {c.score}/25
                </span>
              </div>

              <p className="text-xs text-slate-600 m-0 leading-relaxed">
                {c.explanation}
              </p>

              {/* Visual indicator */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, (c.score / 25) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            aria-label="Close audit"
          >
            Close Audit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RgoriComplianceModal;
