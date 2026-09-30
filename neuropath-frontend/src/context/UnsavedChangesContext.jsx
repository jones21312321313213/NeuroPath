import { createContext, useContext, useRef, useCallback, useState } from "react";

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const guardsRef = useRef([]);
  const [, setGuardVersion] = useState(0);

  const checkGuardDirty = (guard) => {
    if (!guard) return false;
    if (typeof guard.getIsDirty === "function") {
      return Boolean(guard.getIsDirty());
    }
    return Boolean(guard.isDirty);
  };

  const getActiveDirtyGuard = useCallback(() => {
    // Reverse order to check the most recently mounted/active guard (e.g. nested modal) first
    return [...guardsRef.current].reverse().find(checkGuardDirty);
  }, []);

  const registerGuard = useCallback((guard) => {
    if (!guard || !guard.id) return () => {};

    const id = guard.id;
    const index = guardsRef.current.findIndex((g) => g.id === id);
    if (index >= 0) {
      guardsRef.current[index] = guard;
    } else {
      guardsRef.current.push(guard);
    }
    setGuardVersion((v) => v + 1);

    return () => {
      guardsRef.current = guardsRef.current.filter((g) => g.id !== id);
      setGuardVersion((v) => v + 1);
    };
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    return Boolean(getActiveDirtyGuard());
  }, [getActiveDirtyGuard]);

  const promptNavigation = useCallback(
    (action) => {
      const activeGuard = getActiveDirtyGuard();
      if (activeGuard && typeof activeGuard.promptNavigation === "function") {
        return activeGuard.promptNavigation(action);
      }
      if (typeof action === "function") {
        action();
      }
      return true;
    },
    [getActiveDirtyGuard]
  );

  const value = {
    registerGuard,
    hasUnsavedChanges,
    promptNavigation,
  };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

const defaultContextValue = {
  registerGuard: () => () => {},
  hasUnsavedChanges: () => false,
  promptNavigation: (action) => {
    if (typeof action === "function") action();
    return true;
  },
};

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  return context || defaultContextValue;
}

export default UnsavedChangesContext;
