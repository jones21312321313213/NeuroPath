import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, options = {}) => {
    const id = ++toastIdCounter;
    const duration = options.duration ?? (type === "error" ? 5000 : 4000);

    const newToast = {
      id,
      type,
      message,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = useMemo(
    () => ({
      success: (msg, opts) => addToast("success", msg, opts),
      error: (msg, opts) => addToast("error", msg, opts),
      info: (msg, opts) => addToast("info", msg, opts),
      warning: (msg, opts) => addToast("warning", msg, opts),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

const fallbackToast = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      toast: fallbackToast,
      removeToast: () => {},
    };
  }
  return context;
}

export default ToastContext;
