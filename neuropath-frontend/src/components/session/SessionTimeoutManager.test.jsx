import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    sessionStorage.clear();
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

    expect(logout).toHaveBeenCalledWith({ skipBroadcast: true, reason: "timeout" });
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: {
        sessionExpired: true,
        message: "Your session has expired due to 30 minutes of inactivity. Please sign in again to continue.",
      },
    });
  });

  it("navigates cleanly to login without session timeout notice when remote logout occurs", async () => {
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
    await capturedOnTimeout({ reason: "remote_logout" });

    expect(logout).toHaveBeenCalledWith({ skipBroadcast: true, reason: "remote_logout" });
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    expect(sessionStorage.getItem("neuropath_session_notice")).toBeNull();
  });
});
