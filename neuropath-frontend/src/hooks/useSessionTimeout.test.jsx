import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionTimeout } from "./useSessionTimeout";
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_THRESHOLD_MS,
  STORAGE_KEYS,
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

    mockBroadcastChannel = vi.fn().mockImplementation(function () {
      this.postMessage = broadcastPostMessage;
      this.close = broadcastClose;
      this.onmessage = null;
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
    });
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

    // Advance 500ms and dispatch 3 events rapidly
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

    expect(onTimeout).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "timeout" })
    );
  });

  it("guards against localStorage write latency by honoring the fresher in-memory lastRecorded timestamp", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    const onTimeout = vi.fn();

    const { result } = renderHook(() =>
      useSessionTimeout({
        isAuthenticated: true,
        onTimeout,
      })
    );

    // Advance 25 minutes
    vi.advanceTimersByTime(25 * 60 * 1000);
    vi.setSystemTime(startTime + 25 * 60 * 1000);

    // Trigger throttled user activity
    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });

    // Simulate localStorage write latency or stale read where localStorage has older timestamp (startTime)
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(startTime));

    // Advance another 5 minutes (30 minutes from startTime, but only 5 minutes from last in-memory event)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      vi.setSystemTime(startTime + 30 * 60 * 1000);
    });

    // Warning and timeout must NOT trigger because in-memory activity is fresher!
    expect(result.current.isWarningOpen).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
