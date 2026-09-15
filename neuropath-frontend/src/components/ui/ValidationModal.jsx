import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * ValidationModal
 * Clean, accessible dialog specifying missing fields or incorrect formats
 * without emojis.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {() => void} props.onClose - Dismiss/close callback
 * @param {string} [props.title="Incomplete or Invalid Information"] - Modal title
 * @param {string} [props.subtitle="Please address the following items before proceeding:"] - Explanatory subtitle
 * @param {Array<string|{field?: string, message: string}>} [props.errors=[]] - List of validation errors
 * @param {string} [props.confirmLabel="Review & Correct"] - Label for the confirm button
 */
export function ValidationModal({
  isOpen = false,
  onClose,
  title = "Incomplete or Invalid Information",
  subtitle = "Please address the following items before proceeding:",
  errors = [],
  confirmLabel = "Review & Correct",
}) {
  if (!isOpen) return null;

  const errorList = Array.isArray(errors)
    ? errors.filter(Boolean)
    : errors
      ? [String(errors)]
      : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      aria-describedby="validation-modal-description"
      title={title}
      size="md"
      closeOnEsc={true}
      closeOnBackdrop={true}
      footer={
        <div className="flex justify-end w-full">
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600"
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
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p
              id="validation-modal-description"
              className="text-sm text-slate-700 font-medium m-0"
            >
              {subtitle}
            </p>
          </div>
        </div>

        {errorList.length > 0 && (
          <ul className="space-y-2 m-0 p-0 list-none max-h-60 overflow-y-auto">
            {errorList.map((err, idx) => {
              const field = typeof err === "object" ? err.field : null;
              const msg = typeof err === "object" ? err.message : String(err);

              return (
                <li
                  key={idx}
                  className="p-3 bg-slate-50 border-l-4 border-rose-500 rounded-r-lg text-xs text-slate-700 space-y-0.5"
                >
                  {field && (
                    <span className="font-semibold text-slate-900 block">
                      {field}
                    </span>
                  )}
                  <span className="block leading-relaxed">{msg}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export default ValidationModal;
