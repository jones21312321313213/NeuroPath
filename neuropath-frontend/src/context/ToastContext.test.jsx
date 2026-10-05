import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";
import ToastContainer from "../components/ui/ToastContainer";

function TestComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast.success("Student profile created successfully!")}>
        Trigger Success
      </button>
      <button onClick={() => toast.error("Failed to save changes.")}>
        Trigger Error
      </button>
      <button onClick={() => toast.info("New update available.")}>
        Trigger Info
      </button>
      <button onClick={() => toast.warning("Session expiring soon.")}>
        Trigger Warning
      </button>
    </div>
  );
}

describe("ToastContext & ToastContainer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders toast when triggered and auto-dismisses after duration", () => {
    render(
      <ToastProvider>
        <TestComponent />
        <ToastContainer />
      </ToastProvider>
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Trigger Success"));

    const toastStatus = screen.getByRole("status");
    expect(toastStatus).toBeInTheDocument();
    expect(screen.getByText("Student profile created successfully!")).toBeInTheDocument();

    // Fast-forward past duration (default 4000ms)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Student profile created successfully!")).not.toBeInTheDocument();
  });

  it("allows dismissing toast manually with close button", () => {
    render(
      <ToastProvider>
        <TestComponent />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Error"));

    expect(screen.getByText("Failed to save changes.")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /dismiss notification/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Failed to save changes.")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts correctly", () => {
    render(
      <ToastProvider>
        <TestComponent />
        <ToastContainer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));
    fireEvent.click(screen.getByText("Trigger Info"));

    expect(screen.getByText("Student profile created successfully!")).toBeInTheDocument();
    expect(screen.getByText("New update available.")).toBeInTheDocument();
  });
});
