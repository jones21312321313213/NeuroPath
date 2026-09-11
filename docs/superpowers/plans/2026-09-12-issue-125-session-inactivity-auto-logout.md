# Session Management — 30-Minute Inactivity Auto-Logout & Session Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Enforce SRS Section 3.4 Non-Functional Security Requirements (FERPA / RA 10173 compliance) by implementing a client-side session inactivity tracker in `neuropath-frontend` that automatically logs out teachers after 30 minutes of continuous inactivity, provides a 60-second warning dialog at minute 29, invalidates all active TanStack Query caches and credentials, synchronizes across multiple browser tabs, and presents an informative notice on the login screen.

**Architecture:** 
1. Build a centralized session constants module (`src/constants/session.js`) defining timing intervals (30-minute timeout, 60-second warning threshold, 1-second event throttling) and storage keys.
2. Build a custom React hook (`src/hooks/useSessionTimeout.js`) that monitors user interaction events (`mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`, `wheel`), throttles updates to `localStorage`, drives a 1-second evaluation heartbeat, handles background tab hibernation wake-up (`visibilitychange` / `focus`), and coordinates multi-tab synchronization via `BroadcastChannel` and `storage` events.
3. Build an accessible countdown warning dialog (`src/components/session/SessionTimeoutModal.jsx`) using the core `<Modal>` primitive with focus trapping, countdown timer display, and "Stay Logged In" / "Log Out" actions.
4. Build a `<SessionTimeoutManager>` container mounted in the authenticated app tree (`App.jsx`) to wire the hook and modal while the user is authenticated.
5. Enhance `AuthContext.jsx` and `LoginPage.jsx` to invalidate TanStack Query client caches on logout (`queryClient.clear()`), record session timeout notices, and render an accessible session expiration banner on `/login`.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Vitest 4, `@testing-library/react`, Tailwind CSS 4, native Web APIs (`BroadcastChannel`, `localStorage`, `sessionStorage`, `StorageEvent`).

---

## Global Constraints

- Scope is strictly frontend (`neuropath-frontend`) with fire-and-forget notification to existing backend endpoint (`POST /api/users/logout/`).
- Zero new npm dependencies: utilize native browser APIs (`BroadcastChannel`, `StorageEvent`, `document.addEventListener`) and existing project libraries (React 19, TanStack Query, Vitest).
- Interaction event listeners must be throttled (at least 1000ms) to prevent performance degradation or DOM event listener churn during rapid mouse movement or scrolling.
- Multi-tab synchronization must be bidirectional: user activity in Tab A resets the timer in Tab B; logout (manual or timed out) in Tab A immediately terminates the session in Tab B.
- Hibernation/background tab resilience: returning to a background tab after 30+ minutes must immediately trigger logout on `visibilitychange` or `focus` without waiting for throttled timers.
- Memory hygiene: all query caches (`queryClient.clear()`) and authentication tokens must be purged upon timeout to protect confidential ASD learner records.
- All existing 220 tests across 28 test files must continue to pass without regression.

---

## Codebase Dependency Verification

- `react`: `^19.2.6` (Native hooks `useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`)
- `react-router-dom`: `^7.15.1` (`useNavigate`, `useLocation`)
- `@tanstack/react-query`: `^5.102.8` (`queryClient.clear()`)
- `vitest`: `^4.1.10`, `@testing-library/react`: `^16.3.2`
- **Result:** No third-party timer libraries (e.g. `react-idle-timer`) or token decoders are required. Implementing the feature via native browser APIs ensures zero dependency bloat, no React 19 peer dependency conflicts, and complete auditability.

---

## Tasks

### Task 1: Session Constants Configuration

**Files:**
- Create: `neuropath-frontend/src/constants/session.js`
- Create: `neuropath-frontend/src/constants/session.test.js`

- [x] **Step 1: Write unit tests for session configuration constants**

Create `neuropath-frontend/src/constants/session.test.js`:
```javascript
import { describe, it, expect } from "vitest";
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_DURATION_MS,
  WARNING_THRESHOLD_MS,
  ACTIVITY_THROTTLE_MS,
  STORAGE_KEYS,
  BROADCAST_ACTIONS,
  SESSION_CHANNEL_NAME,
} from "./session";

describe("session constants", () => {
  it("defines correct 30-minute timeout and 60-second warning intervals", () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000); // 1,800,000 ms
    expect(WARNING_DURATION_MS).toBe(60 * 1000); // 60,000 ms
    expect(WARNING_THRESHOLD_MS).toBe(29 * 60 * 1000); // 1,740,000 ms
    expect(ACTIVITY_THROTTLE_MS).toBe(1000); // 1,000 ms
  });

  it("defines standard storage keys and broadcast channels", () => {
    expect(STORAGE_KEYS.LAST_ACTIVE).toBe("neuropath_last_active");
    expect(STORAGE_KEYS.SESSION_NOTICE).toBe("neuropath_session_notice");
    expect(STORAGE_KEYS.LOGOUT_EVENT).toBe("neuropath_logout_event");
    expect(SESSION_CHANNEL_NAME).toBe("neuropath_session_channel");
    expect(BROADCAST_ACTIONS.ACTIVITY).toBe("ACTIVITY");
    expect(BROADCAST_ACTIONS.LOGOUT).toBe("LOGOUT");
    expect(BROADCAST_ACTIONS.EXTEND).toBe("EXTEND");
  });
});
```

- [x] **Step 2: Create session constants file**

Create `neuropath-frontend/src/constants/session.js`:
```javascript
/**
 * Session Lifecycle & Inactivity Constants
 * In compliance with FERPA & RA 10173 (Data Privacy Act of 2012)
 */

// 30 minutes in milliseconds
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// 60 seconds warning countdown before session termination
export const WARNING_DURATION_MS = 60 * 1000;

// 29 minutes threshold when the warning modal must appear
export const WARNING_THRESHOLD_MS = INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;

// User event listener throttle threshold to prevent performance degradation
export const ACTIVITY_THROTTLE_MS = 1000;

// Heartbeat check interval (1 second)
export const HEARTBEAT_INTERVAL_MS = 1000;

// LocalStorage & SessionStorage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "neuropath_access_token",
  USER: "neuropath_user",
  LAST_ACTIVE: "neuropath_last_active",
  SESSION_NOTICE: "neuropath_session_notice",
  LOGOUT_EVENT: "neuropath_logout_event",
};

// Broadcast Channel name for cross-tab communication
export const SESSION_CHANNEL_NAME = "neuropath_session_channel";

// Broadcast message action identifiers
export const BROADCAST_ACTIONS = {
  ACTIVITY: "ACTIVITY",
  LOGOUT: "LOGOUT",
  EXTEND: "EXTEND",
};

// Monitored user interaction events
export const MONITORED_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];
```

- [x] **Step 3: Run constant unit tests**
Run: `npm test src/constants/session.test.js`
Expected: All tests pass.

---

### Task 2: Accessible Session Timeout Warning Modal

**Files:**
- Create: `neuropath-frontend/src/components/session/SessionTimeoutModal.jsx`
- Create: `neuropath-frontend/src/components/session/SessionTimeoutModal.test.jsx`

- [x] **Step 1: Write unit tests for `SessionTimeoutModal`**

Create `neuropath-frontend/src/components/session/SessionTimeoutModal.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionTimeoutModal from "./SessionTimeoutModal";

describe("SessionTimeoutModal", () => {
  it("does not render when isOpen is false", () => {
    render(
      <SessionTimeoutModal
        isOpen={false}
        secondsRemaining={45}
        onExtend={vi.fn()}
        onLogout={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders countdown and warning message when isOpen is true", () => {
    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={45}
        onExtend={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /session expiring soon/i })).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/FERPA and RA 10173/i)).toBeInTheDocument();
  });

  it("calls onExtend when 'Stay Logged In' button is clicked", async () => {
    const onExtend = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={30}
        onExtend={onExtend}
        onLogout={vi.fn()}
      />
    );

    const stayButton = screen.getByRole("button", { name: /stay logged in/i });
    await user.click(stayButton);

    expect(onExtend).toHaveBeenCalledTimes(1);
  });

  it("calls onLogout when 'Log Out' button is clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionTimeoutModal
        isOpen={true}
        secondsRemaining={30}
        onExtend={vi.fn()}
        onLogout={onLogout}
      />
    );

    const logoutButton = screen.getByRole("button", { name: /log out/i });
    await user.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Implement `SessionTimeoutModal.jsx`**

Create `neuropath-frontend/src/components/session/SessionTimeoutModal.jsx`:
```jsx
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
```

- [x] **Step 3: Run modal component tests**
Run: `npm test src/components/session/SessionTimeoutModal.test.jsx`
Expected: All tests pass.

---

### Task 3: Inactivity Tracking & Multi-Tab Synchronization Hook (`useSessionTimeout`)

**Files:**
- Create: `neuropath-frontend/src/hooks/useSessionTimeout.js`
- Create: `neuropath-frontend/src/hooks/useSessionTimeout.test.jsx`

- [x] **Step 1: Write comprehensive unit & integration tests for `useSessionTimeout`**

Create `neuropath-frontend/src/hooks/useSessionTimeout.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionTimeout } from "./useSessionTimeout";
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_THRESHOLD_MS,
  STORAGE_KEYS,
  SESSION_CHANNEL_NAME,
} from "../constants/session";

describe("useSessionTimeout", () => {
  let mockBroadcastChannel;
  let broadcastPostMessage;
  let broadcastClose;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();

    broadcastPostMessage = vi.fn();
    broadcastClose = vi.fn();

    mockBroadcastChannel = vi.fn().mockImplementation(() => ({
      postMessage: broadcastPostMessage,
      close: broadcastClose,
      onmessage: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("BroadcastChannel", mockBroadcastChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not start timers or listeners when isAuthenticated is false", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        isAuthenticated: false,
        onTimeout,
      })
    );

    expect(result.current.isWarningOpen).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE)).toBeNull();
  });

  it("initializes lastActive timestamp in localStorage on mount when authenticated", () => {
    const now = 1000000;
    vi.setSystemTime(now);

    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    expect(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE)).toBe(String(now));
  });

  it("updates lastActive timestamp on throttled user activity", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    // Advance 2 seconds and trigger a mousemove event
    vi.advanceTimersByTime(2000);
    vi.setSystemTime(startTime + 2000);

    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });

    expect(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE)).toBe(String(startTime + 2000));
  });

  it("throttles multiple user events occurring within the 1-second throttle window", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    // Advance 500ms and dispatch 5 events rapidly
    vi.advanceTimersByTime(500);
    vi.setSystemTime(startTime + 500);

    act(() => {
      window.dispatchEvent(new Event("mousemove"));
      window.dispatchEvent(new Event("keydown"));
      window.dispatchEvent(new Event("scroll"));
    });

    // Should NOT have updated yet because throttle window (1000ms) has not elapsed
    expect(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE)).toBe(String(startTime));
  });

  it("opens warning modal when inactivity reaches 29 minutes (WARNING_THRESHOLD_MS)", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const { result } = renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    expect(result.current.isWarningOpen).toBe(false);

    // Advance to 29 minutes + 1 second
    act(() => {
      vi.advanceTimersByTime(WARNING_THRESHOLD_MS + 1000);
      vi.setSystemTime(startTime + WARNING_THRESHOLD_MS + 1000);
    });

    expect(result.current.isWarningOpen).toBe(true);
    expect(result.current.secondsRemaining).toBeLessThanOrEqual(60);
    expect(result.current.secondsRemaining).toBeGreaterThan(0);
  });

  it("resets warning and timer when extendSession is called", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const { result } = renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    act(() => {
      vi.advanceTimersByTime(WARNING_THRESHOLD_MS + 1000);
      vi.setSystemTime(startTime + WARNING_THRESHOLD_MS + 1000);
    });

    expect(result.current.isWarningOpen).toBe(true);

    act(() => {
      result.current.extendSession();
    });

    expect(result.current.isWarningOpen).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE)).toBe(
      String(startTime + WARNING_THRESHOLD_MS + 1000)
    );
  });

  it("triggers onTimeout when inactivity reaches 30 minutes (INACTIVITY_TIMEOUT_MS)", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    const onTimeout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout,
      })
    );

    act(() => {
      vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS + 1000);
      vi.setSystemTime(startTime + INACTIVITY_TIMEOUT_MS + 1000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STORAGE_KEYS.SESSION_NOTICE)).toMatch(/inactivity/i);
  });

  it("triggers immediate timeout on visibilitychange if 30 minutes elapsed while tab was hidden", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    const onTimeout = vi.fn();

    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout,
      })
    );

    // Simulate system clock jumped forward 35 minutes while laptop lid closed / tab hibernated
    vi.setSystemTime(startTime + 35 * 60 * 1000);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("synchronizes user activity from other tabs via storage event", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const { result } = renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout: vi.fn(),
      })
    );

    // Advance to warning threshold
    act(() => {
      vi.advanceTimersByTime(WARNING_THRESHOLD_MS + 1000);
      vi.setSystemTime(startTime + WARNING_THRESHOLD_MS + 1000);
    });

    expect(result.current.isWarningOpen).toBe(true);

    // Simulate another tab recording activity
    const newActive = startTime + WARNING_THRESHOLD_MS + 2000;
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEYS.LAST_ACTIVE,
          newValue: String(newActive),
        })
      );
    });

    expect(result.current.isWarningOpen).toBe(false);
  });

  it("triggers onTimeout when another tab signals logout via storage event", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout,
      })
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEYS.LOGOUT_EVENT,
          newValue: JSON.stringify({ reason: "timeout", timestamp: Date.now() }),
        })
      );
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Implement `useSessionTimeout.js`**

Create `neuropath-frontend/src/hooks/useSessionTimeout.js`:
```javascript
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
        if (isWarningOpen) {
          setIsWarningOpen(false);
        }
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
    isWarningOpen,
  ]);

  return {
    isWarningOpen,
    secondsRemaining,
    extendSession,
    triggerLogout: handleTimeout,
  };
}
```

- [x] **Step 3: Run `useSessionTimeout` unit tests**
Run: `npm test src/hooks/useSessionTimeout.test.jsx`
Expected: All tests pass.

---

### Task 4: Session Manager Component Integration

**Files:**
- Create: `neuropath-frontend/src/components/session/SessionTimeoutManager.jsx`
- Create: `neuropath-frontend/src/components/session/SessionTimeoutManager.test.jsx`
- Modify: `neuropath-frontend/src/App.jsx`

- [x] **Step 1: Write tests for `SessionTimeoutManager`**

Create `neuropath-frontend/src/components/session/SessionTimeoutManager.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionTimeoutManager from "./SessionTimeoutManager";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../../queryClient";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("../../queryClient", () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

describe("SessionTimeoutManager", () => {
  const logout = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, email: "teacher@school.edu" },
      isAuthenticated: true,
      logout,
    });
    useNavigate.mockReturnValue(navigate);
  });

  it("renders without crashing when user is authenticated", () => {
    render(<SessionTimeoutManager />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles timeout by logging out, clearing query cache, and navigating to login", async () => {
    let capturedOnTimeout;
    vi.spyOn(await import("../../hooks/useSessionTimeout"), "useSessionTimeout").mockImplementation(
      ({ onTimeout }) => {
        capturedOnTimeout = onTimeout;
        return {
          isWarningOpen: false,
          secondsRemaining: 60,
          extendSession: vi.fn(),
          triggerLogout: vi.fn(),
        };
      }
    );

    render(<SessionTimeoutManager />);

    expect(capturedOnTimeout).toBeDefined();
    await capturedOnTimeout({ reason: "timeout" });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: {
        sessionExpired: true,
        message: "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue.",
      },
    });
  });
});
```

- [x] **Step 2: Implement `SessionTimeoutManager.jsx`**

Create `neuropath-frontend/src/components/session/SessionTimeoutManager.jsx`:
```jsx
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
    async ({ reason }) => {
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
```

- [x] **Step 3: Mount `SessionTimeoutManager` in `App.jsx`**

In `neuropath-frontend/src/App.jsx`:
Import `SessionTimeoutManager`:
```jsx
import SessionTimeoutManager from "./components/session/SessionTimeoutManager";
```
Render `<SessionTimeoutManager />` inside `AppRoutes`:
```jsx
function AppRoutes() {
  const { user } = useAuth();
  ...
  return (
    <>
      <SessionTimeoutManager />
      {showSplash && (
        <LoginSplash ... />
      )}
      {!showSplash && (
        <Routes>
          ...
        </Routes>
      )}
    </>
  );
}
```

- [x] **Step 4: Run `SessionTimeoutManager` tests**
Run: `npm test src/components/session/SessionTimeoutManager.test.jsx`
Expected: All tests pass.

---

### Task 5: AuthContext & Query Cache Invalidation Enhancement

**Files:**
- Modify: `neuropath-frontend/src/context/AuthContext.jsx`
- Modify: `neuropath-frontend/src/context/AuthContext.test.jsx`

- [x] **Step 1: Update `AuthContext.test.jsx` to test queryClient cache clearing & storage cleanup on logout**

Update `neuropath-frontend/src/context/AuthContext.test.jsx`:
Add test verifying that `logout()` cleans up session storage keys and resets state.

- [x] **Step 2: Update `AuthContext.jsx` to clear query cache and session tokens**

In `neuropath-frontend/src/context/AuthContext.jsx`:
Import `queryClient` from `../queryClient` and `STORAGE_KEYS` from `../constants/session`.
Update `logout`:
```javascript
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Token already invalid or backend unreachable — clear locally regardless.
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
      queryClient.clear();
      setUser(null);
    }
  }, []);
```

- [x] **Step 3: Run `AuthContext.test.jsx`**
Run: `npm test src/context/AuthContext.test.jsx`
Expected: All tests pass.

---

### Task 6: Session Expiration Notice on Login Page

**Files:**
- Modify: `neuropath-frontend/src/pages/loginPage.jsx`
- Modify: `neuropath-frontend/src/pages/loginPage.test.jsx`
- Modify: `neuropath-frontend/src/App.jsx`

- [x] **Step 1: Write test for session timeout notice in `loginPage.test.jsx`**

Add test cases in `neuropath-frontend/src/pages/loginPage.test.jsx`:
```jsx
  it("renders session timeout banner when sessionNotice prop or sessionStorage notice is present", () => {
    sessionStorage.setItem(
      "neuropath_session_notice",
      "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue."
    );

    renderPage();

    expect(
      screen.getByText(/your session has expired due to 30 minutes of inactivity/i)
    ).toBeInTheDocument();
  });
```

- [x] **Step 2: Update `LoginPage.jsx` to display the session timeout banner**

In `neuropath-frontend/src/pages/loginPage.jsx`:
Inspect `sessionNotice` prop, `location.state?.message`, or `sessionStorage.getItem("neuropath_session_notice")`.
Add a styled amber alert banner matching the design system:
```jsx
          {/* Session timeout warning banner */}
          {sessionNotice && (
            <div
              className="mb-6 flex items-center gap-2.5 text-sm p-3.5 rounded-xl"
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
              }}
              role="alert"
            >
              <span className="text-base" aria-hidden="true">⏱️</span>
              <p className="font-medium">{sessionNotice}</p>
            </div>
          )}
```
Clear the notice from `sessionStorage` on mount or input change so it does not persist across future visits.

- [x] **Step 3: Run `loginPage.test.jsx`**
Run: `npm test src/pages/loginPage.test.jsx`
Expected: All tests pass.

---

### Task 7: Full System Verification & Regression Testing

**Files:**
- Verify: Full test suite execution across all test files

- [x] **Step 1: Run complete test suite**
Run: `npm test` in `neuropath-frontend`
Expected: All test suites (now ~32 test files, 230+ tests) pass with 0 errors.

- [x] **Step 2: Run production Vite build**
Run: `npm run build` in `neuropath-frontend`
Expected: Build finishes cleanly with zero syntax or bundling errors.

---

## Edge Cases & Defensive Measures

1. **High-Frequency User Events Spurring Storage Quota or CPU Lag:**
   - Handled via `ACTIVITY_THROTTLE_MS = 1000`. User interaction events are throttled so `localStorage.setItem` and cross-tab broadcasts occur at most once every second.
2. **Laptop Lid Close / System Hibernation:**
   - Handled via `visibilitychange` and `focus` event listeners. When the device wakes up, `Date.now() - lastActiveTime` is evaluated immediately without waiting for a throttled timer tick.
3. **Multi-Tab Race Conditions (Tab A active while Tab B idle):**
   - Handled via bidirectional `BroadcastChannel` and `StorageEvent` listeners. Tab A broadcasts `ACTIVITY`, which immediately pushes back the timeout in Tab B and dismisses any warning modal.
4. **Backend Network Failure During Timeout Logout:**
   - Handled gracefully in `finally` blocks: even if `POST /api/users/logout/` encounters network failure or token expiration, local tokens, user profiles, and TanStack query caches are wiped out regardless.
5. **FERPA / RA 10173 Cache Retention:**
   - Handled by invoking `queryClient.clear()`, wiping out all cached student profiles, IEP objectives, and diagnostic observations from memory.
