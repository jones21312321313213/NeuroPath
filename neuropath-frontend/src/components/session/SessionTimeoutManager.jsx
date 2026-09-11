import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import SessionTimeoutModal from "./SessionTimeoutModal";
import { queryClient } from "../../queryClient";
import { STORAGE_KEYS } from "../../constants/session";

/**
 * SessionTimeoutManager
 * Integrates inactivity lifecycle, query cache clearing, and warning modal.
 */
export default function SessionTimeoutManager() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSessionTimeout = useCallback(
    async () => {
      try {
        await logout();
      } catch (err) {
        console.error("Error during session timeout logout:", err);
      } finally {
        queryClient.clear();
        sessionStorage.setItem(
          STORAGE_KEYS.SESSION_NOTICE,
          "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue."
        );
        navigate("/login", {
          replace: true,
          state: {
            sessionExpired: true,
            message:
              "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue.",
          },
        });
      }
    },
    [logout, navigate]
  );

  const handleManualLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }, [logout, navigate]);

  const { isWarningOpen, secondsRemaining, extendSession } = useSessionTimeout({
    isAuthenticated: !!(isAuthenticated && user),
    onTimeout: handleSessionTimeout,
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SessionTimeoutModal
      isOpen={isWarningOpen}
      secondsRemaining={secondsRemaining}
      onExtend={extendSession}
      onLogout={handleManualLogout}
    />
  );
}
