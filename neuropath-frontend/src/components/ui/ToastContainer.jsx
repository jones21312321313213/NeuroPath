import { useToast } from "../../context/ToastContext";
import {
  CheckIcon,
  WarningIcon,
  InformationCircleIcon,
  CloseIcon,
} from "./icons";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";
        const isWarning = toast.type === "warning";

        const bgClass = isSuccess
          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
          : isError
          ? "bg-rose-50 border-rose-200 text-rose-950"
          : isWarning
          ? "bg-amber-50 border-amber-200 text-amber-950"
          : "bg-sky-50 border-sky-200 text-sky-950";

        const iconColorClass = isSuccess
          ? "text-emerald-600 bg-emerald-100"
          : isError
          ? "text-rose-600 bg-rose-100"
          : isWarning
          ? "text-amber-600 bg-amber-100"
          : "text-sky-600 bg-sky-100";

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgClass}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColorClass}`}
            >
              {isSuccess && (
                <CheckIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              )}
              {isError && (
                <WarningIcon className="w-4 h-4 text-rose-600" aria-hidden="true" />
              )}
              {isWarning && (
                <WarningIcon className="w-4 h-4 text-amber-600" aria-hidden="true" />
              )}
              {!isSuccess && !isError && !isWarning && (
                <InformationCircleIcon
                  className="w-4 h-4 text-sky-600"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex-1 text-xs sm:text-sm font-medium leading-snug pt-1">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <CloseIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
