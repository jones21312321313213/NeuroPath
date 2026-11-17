import {
  MILESTONE_PRIORITY_META,
  normalizeMilestonePriority,
} from "../../utils/milestonePriorityUtils";

export function MilestonePriorityBadge({ priority = "medium" }) {
  const norm = normalizeMilestonePriority(priority);
  const meta = MILESTONE_PRIORITY_META[norm] || MILESTONE_PRIORITY_META.medium;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border mt-1.5 ${meta.badgeClass}`}
      title={`${meta.label} Priority — triggers notification ${meta.alertHint} before milestone & on due date`}
    >
      <span>Priority: {meta.label}</span>
      <span className="opacity-75">({meta.alertHint})</span>
    </span>
  );
}

export function MilestonePrioritySelect({
  value = "medium",
  onChange,
  ariaLabel = "Milestone priority",
}) {
  const norm = normalizeMilestonePriority(value);
  const meta = MILESTONE_PRIORITY_META[norm] || MILESTONE_PRIORITY_META.medium;
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
        Priority:
      </span>
      <select
        aria-label={ariaLabel}
        value={norm}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`text-[11px] font-semibold rounded-md border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${meta.selectClass}`}
      >
        <option value="low">Low (1d notice)</option>
        <option value="medium">Medium (2d notice)</option>
        <option value="high">High (3d notice)</option>
      </select>
    </div>
  );
}
