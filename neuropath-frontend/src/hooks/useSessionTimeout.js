import { useState, useEffect, useCallback, useRef } from "react";
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_DURATION_MS,
  WARNING_THRESHOLD_MS,
  ACTIVITY_THROTTLE_MS,
  HEARTBEAT_INTERVAL_MS,
  STORAGE_KEYS,
  SESSION_CHANNEL_NAME,
  BROADCAST_ACTIONS,
  MONITORED_EVENTS,
} from "../constants/session";

/**
 * Custom hook managing 30-minute inactivity auto-logout, 60s warning countdown,
 * background tab wake-up validation, and cross-tab session synchronization.
 */
export function useSessionTimeout({
  isAuthenticated = false,
  onTimeout,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningThresholdMs = WARNING_THRESHOLD_MS,
  throttleMs = ACTIVITY_THROTTLE_MS,
}) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.round(WARNING_DURATION_MS / 1000)
  );

  const lastRecordedRef = useRef(0);
  const broadcastChannelRef = useRef(null);
  const isTimedOutRef = useRef(false);

  // Initialize or read lastActive time
  const getLastActiveTime = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      return stored ? parseInt(stored, 10) : Date.now();
    } catch {
      return Date.now();
    }
  }, []);

  const setLastActiveTime = useCallback((time) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(time));
    } catch {
      // Ignore quota or private-browsing storage exceptions
    }
  }, []);

  // Broadcast helper
  const postBroadcastMessage = useCallback((message) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(message);
      }
    } catch {
      // Fallback handled via storage events
    }
  }, []);

  // Terminate session due to timeout
  const handleTimeout = useCallback(() => {
    if (isTimedOutRef.current) return;
    isTimedOutRef.current = true;
    setIsWarningOpen(false);

    try {
      sessionStorage.setItem(
        STORAGE_KEYS.SESSION_NOTICE,
        "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue."
      );
      localStorage.setItem(
        STORAGE_KEYS.LOGOUT_EVENT,
        JSON.stringify({ reason: "timeout", timestamp: Date.now() })
      );
    } catch {
      // Ignore storage errors
    }

    postBroadcastMessage({
      type: BROADCAST_ACTIONS.LOGOUT,
      reason: "timeout",
      timestamp: Date.now(),
    });

    if (onTimeout) {
      onTimeout({ reason: "timeout" });
    }
  }, [onTimeout, postBroadcastMessage]);

  // Extend or reset the session on active user interaction
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastRecordedRef.current = now;
    isTimedOutRef.current = false;
    setLastActiveTime(now);
    setIsWarningOpen(false);
    setSecondsRemaining(Math.round(WARNING_DURATION_MS / 1000));

    postBroadcastMessage({
      type: BROADCAST_ACTIONS.ACTIVITY,
      timestamp: now,
    });
  }, [setLastActiveTime, postBroadcastMessage]);

  // Throttled activity recorder for DOM events
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastRecordedRef.current >= throttleMs) {
      lastRecordedRef.current = now;
      setLastActiveTime(now);
      setIsWarningOpen(false);

      postBroadcastMessage({
        type: BROADCAST_ACTIONS.ACTIVITY,
        timestamp: now,
      });
    }
  }, [throttleMs, setLastActiveTime, postBroadcastMessage]);

  // Setup BroadcastChannel & Storage Event Listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. BroadcastChannel setup
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type } = event.data || {};
          if (type === BROADCAST_ACTIONS.ACTIVITY || type === BROADCAST_ACTIONS.EXTEND) {
            lastRecordedRef.current = Date.now();
            setIsWarningOpen(false);
          } else if (type === BROADCAST_ACTIONS.LOGOUT) {
            if (!isTimedOutRef.current) {
              isTimedOutRef.current = true;
              setIsWarningOpen(false);
              if (onTimeout) onTimeout({ reason: "remote_logout" });
            }
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel not supported or failed to initialize:", e);
      }
    }

    // 2. Storage event listener for cross-tab fallback
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.LAST_ACTIVE && e.newValue) {
        lastRecordedRef.current = parseInt(e.newValue, 10);
        setIsWarningOpen(false);
      } else if (e.key === STORAGE_KEYS.LOGOUT_EVENT && e.newValue) {
        if (!isTimedOutRef.current) {
          isTimedOutRef.current = true;
          setIsWarningOpen(false);
          if (onTimeout) onTimeout({ reason: "remote_logout" });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [isAuthenticated, onTimeout]);

  // Main evaluation heartbeat & background tab wake-up listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    isTimedOutRef.current = false;
    const initialNow = Date.now();
    lastRecordedRef.current = initialNow;
    setLastActiveTime(initialNow);

    // Activity check evaluator
    const checkActivity = () => {
      if (isTimedOutRef.current) return;

      const lastActive = getLastActiveTime();
      const now = Date.now();
      const elapsed = now - lastActive;

      if (elapsed >= timeoutMs) {
        handleTimeout();
      } else if (elapsed >= warningThresholdMs) {
        setIsWarningOpen(true);
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        setIsWarningOpen(false);
      }
    };

    // Periodic 1-second heartbeat
    const intervalId = setInterval(checkActivity, HEARTBEAT_INTERVAL_MS);

    // Immediate check on tab visibility or window focus (resilience against hibernated tabs)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // Register throttled DOM interaction listeners
    MONITORED_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      MONITORED_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
    };
  }, [
    isAuthenticated,
    timeoutMs,
    warningThresholdMs,
    getLastActiveTime,
    setLastActiveTime,
    handleTimeout,
    recordActivity,
  ]);

  return {
    isWarningOpen,
    secondsRemaining,
    extendSession,
    triggerLogout: handleTimeout,
  };
}
