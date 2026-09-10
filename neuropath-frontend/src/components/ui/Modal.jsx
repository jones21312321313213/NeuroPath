import { useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = "",
  ...props
}) {
  const modalContainerRef = useRef(null);

  useFocusTrap({
    isActive: isOpen,
    containerRef: modalContainerRef,
    onEscape: closeOnEsc ? onClose : undefined,
    returnFocus: true,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-dialog-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
      onClick={handleBackdropClick}
      {...props}
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl border border-slate-100 w-full ${maxWidthClass} overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-scaleUp outline-none ${className}`.trim()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            {title && (
              <h3 id="modal-dialog-title" className="text-lg font-semibold text-slate-900 m-0">
                {title}
              </h3>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto text-slate-700 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
