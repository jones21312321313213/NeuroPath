import { CheckIcon } from "../ui/icons";
import { evaluatePasswordRules } from "../../utils/password";

export default function PasswordStrengthMeter({ password = "", showChecklist = true }) {
  const result = evaluatePasswordRules(password);

  const checklist = [
    { key: "len", label: "At least 8 characters", met: result.hasLength },
    { key: "upper", label: "At least one uppercase letter (A-Z)", met: result.hasUpper },
    { key: "lower", label: "At least one lowercase letter (a-z)", met: result.hasLower },
    { key: "num", label: "At least one number (0-9)", met: result.hasNumber },
    { key: "special", label: "At least one special character (!@#$%...)", met: result.hasSpecial },
  ];

  return (
    <div className="space-y-2 mt-2" aria-live="polite">
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Password strength:</span>
            <span
              className={
                result.strengthLabel === "Strong"
                  ? "text-emerald-600 font-bold"
                  : result.strengthLabel === "Medium"
                  ? "text-amber-600 font-bold"
                  : "text-rose-600 font-bold"
              }
            >
              {result.strengthLabel}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${result.colorClass}`}
              style={{ width: `${result.percent}%` }}
            />
          </div>
        </div>
      )}

      {showChecklist && (
        <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block">
            Password Requirements:
          </span>
          <ul className="text-xs space-y-1 text-slate-600">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                {item.met ? (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 font-bold shrink-0 text-xs">
                    •
                  </span>
                )}
                <span
                  className={
                    item.met ? "text-emerald-700 font-medium" : "text-slate-600"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
