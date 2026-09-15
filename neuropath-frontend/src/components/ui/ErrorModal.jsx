import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Universal Error Modal (Issue #154)
 * Standardized, accessible alert dialog for application-wide error presentation.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the error modal is visible
 * @param {string} [props.title="An Error Occurred"] - High-level error title
 * @param {string} [props.message] - User-friendly descriptive error message
 * @param {string|object} [props.details] - Optional technical details, error code, or stack trace
 * @param {() => void} props.onClose - Dismiss/close callback
 * @param {() => void} [props.onRetry] - Optional retry action callback
 * @param {string} [props.retryLabel="Try Again"] - Label for the retry button
 * @param {string} [props.dismissLabel="Dismiss"] - Label for the dismissal button
 * @param {"sm"|"md"|"lg"|"xl"} [props.size="md"] - Modal width size
 */
export function ErrorModal({
  isOpen = false,
  title = "An Error Occurred",
  message = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  details = null,
  onClose,
  onRetry = null,
  retryLabel = "Try Again",
  dismissLabel = "Dismiss",
  size = "md",
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      aria-describedby="error-modal-message"
      title={title}
      size={size}
      closeOnEsc={true}
      closeOnBackdrop={true}
      footer={
        <>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-slate-700 hover:bg-slate-100"
            >
              {retryLabel}
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={onClose}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            autoFocus
          >
            {dismissLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className="shrink-0 w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs select-none"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5 text-rose-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p
              id="error-modal-message"
              className="text-sm text-slate-700 leading-relaxed m-0 font-normal"
            >
              {message}
            </p>
          </div>
        </div>

        {details && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:underline"
              aria-expanded={showDetails}
            >
              <span>{showDetails ? "▼" : "▶"}</span>
              <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
            </button>
            {showDetails && (
              <pre
                className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap border border-slate-200/60 max-h-36 select-all"
                tabIndex={0}
              >
                {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ErrorModal;
