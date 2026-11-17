export const MILESTONE_PRIORITY_META = {
  low: {
    label: "Low",
    alertHint: "1d alert",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    selectClass: "bg-slate-50 text-slate-700 border-slate-300",
  },
  medium: {
    label: "Medium",
    alertHint: "2d alert",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    selectClass: "bg-amber-50 text-amber-800 border-amber-300",
  },
  high: {
    label: "High",
    alertHint: "3d alert",
    badgeClass: "bg-red-50 text-red-700 border-red-300",
    selectClass: "bg-red-50 text-red-700 border-red-300",
  },
};

export function normalizeMilestonePriority(val, fallback = "medium") {
  const s = String(val || "").trim().toLowerCase();
  if (s === "med" || s === "medium") return "medium";
  if (s === "low" || s === "high") return s;
  return fallback;
}
