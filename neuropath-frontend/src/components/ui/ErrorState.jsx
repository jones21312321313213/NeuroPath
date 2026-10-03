import { WarningIcon } from "./icons";

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content.",
  onRetry = null,
  retryLabel = "Try Again",
  className = "",
  ...props
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 my-4 ${className}`.trim()}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 select-none">
        <WarningIcon className="w-6 h-6 text-rose-600" aria-hidden="true" />
      </div>

      {title && (
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          {title}
        </h3>
      )}

      {message && (
        <p className="text-sm text-slate-600 max-w-md mb-5 leading-relaxed">
          {message}
        </p>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
