import { useState, useEffect, useCallback, useRef } from "react";

export function useUnsavedChanges({ isDirty = false, onLeave } = {}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const pendingActionRef = useRef(null);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const promptNavigation = useCallback(
    (action) => {
      if (isDirty) {
        pendingActionRef.current = action;
        setShowPrompt(true);
        return false;
      }
      if (typeof action === "function") {
        action();
      }
      return true;
    },
    [isDirty]
  );

  const confirmLeave = useCallback(() => {
    setShowPrompt(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (typeof action === "function") {
      action();
    } else if (typeof onLeave === "function") {
      onLeave();
    }
  }, [onLeave]);

  const cancelLeave = useCallback(() => {
    setShowPrompt(false);
    pendingActionRef.current = null;
  }, []);

  return {
    showPrompt,
    promptNavigation,
    confirmLeave,
    cancelLeave,
  };
}

export default useUnsavedChanges;
