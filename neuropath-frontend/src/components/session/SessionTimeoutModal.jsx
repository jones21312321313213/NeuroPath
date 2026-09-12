import { Modal, Button } from "../ui";

/**
 * Session Timeout Warning Modal
 * Inactivity warning prompt displaying a countdown before automatic termination.
 */
export default function SessionTimeoutModal({
  isOpen,
  secondsRemaining,
  onExtend,
  onLogout,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onExtend}
      title="Session Expiring Soon"
      size="md"
      closeOnEsc={false}
      closeOnBackdrop={false}
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="text-slate-600 hover:text-red-600"
          >
            Log Out Now
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onExtend}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            autoFocus
          >
            Stay Logged In
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-slate-700">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <span className="text-2xl" aria-hidden="true">⏱️</span>
          <div>
            <p className="font-semibold text-sm">
              Your session will terminate in{" "}
              <span className="font-bold text-amber-950 text-base" aria-live="polite">
                {secondsRemaining}s
              </span>
            </p>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Due to 29 minutes of continuous inactivity.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          In compliance with <strong>FERPA</strong> and Philippine <strong>RA 10173</strong> (Data Privacy Act of 2012), unattended sessions are automatically terminated to protect confidential special education and ASD learner records.
        </p>

        <p className="text-xs text-slate-600">
          Click <strong>Stay Logged In</strong> to reset your session timer and continue working.
        </p>
      </div>
    </Modal>
  );
}
