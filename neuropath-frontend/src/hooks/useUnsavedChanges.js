import { useState, useEffect, useCallback, useRef } from "react";

export function useUnsavedChanges({ isDirty = false, onLeave } = {}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const pendingActionRef = useRef(null);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    try {
      window.history.pushState({ unsavedGuard: true }, "");
    } catch {
      // Ignore if pushState fails in restricted environments
    }

    const handlePopState = () => {
      if (!isDirtyRef.current) return;
      try {
        window.history.pushState({ unsavedGuard: true }, "");
      } catch {
        // Ignore
      }
      pendingActionRef.current = () => {
        try {
          window.history.go(-2);
        } catch {
          window.history.back();
        }
      };
      setShowPrompt(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  const promptNavigation = useCallback(
    (action) => {
      if (isDirty || isDirtyRef.current) {
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
    isDirtyRef.current = false;
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
