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
    ({ reason = "timeout" } = {}) => {
      try {
        logout({ skipBroadcast: true, reason });
      } catch (err) {
        console.error("Error during session timeout logout:", err);
      }

      queryClient.clear();

      if (reason === "timeout") {
        try {
          sessionStorage.setItem(
            STORAGE_KEYS.SESSION_NOTICE,
            "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue."
          );
        } catch {
          // Ignore storage errors
        }
        navigate("/login", {
          replace: true,
          state: {
            sessionExpired: true,
            message:
              "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue.",
          },
        });
      } else {
        navigate("/login", { replace: true });
      }
    },
    [logout, navigate]
  );

  const handleManualLogout = useCallback(() => {
    try {
      logout();
    } catch (err) {
      console.error("Error during manual logout:", err);
    }
    queryClient.clear();
    navigate("/login", { replace: true });
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
