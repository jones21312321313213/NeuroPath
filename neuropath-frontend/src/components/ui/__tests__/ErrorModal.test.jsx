import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorModal } from "../ErrorModal";

describe("ErrorModal component (Issue #154)", () => {
  it("does not render when isOpen is false", () => {
    render(
      <ErrorModal
        isOpen={false}
        title="Network Failure"
        message="Could not connect to server."
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders accessible alertdialog with title, message, and dismiss button", () => {
    render(
      <ErrorModal
        isOpen={true}
        title="Validation Error"
        message="Please select a valid student."
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-describedby", "error-modal-message");
    expect(screen.getByText("Validation Error")).toBeInTheDocument();
    expect(screen.getByText("Please select a valid student.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onClose when Dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <ErrorModal
        isOpen={true}
        title="Error"
        message="Something went wrong."
        onClose={handleClose}
      />
    );

    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismissBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <ErrorModal
        isOpen={true}
        title="Error"
        message="Something went wrong."
        onClose={handleClose}
      />
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders retry button when onRetry is provided and triggers callback", async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    const handleClose = vi.fn();

    render(
      <ErrorModal
        isOpen={true}
        title="API Error"
        message="Request timed out."
        onClose={handleClose}
        onRetry={handleRetry}
        retryLabel="Try Again Now"
      />
    );

    const retryBtn = screen.getByRole("button", { name: "Try Again Now" });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("toggles technical details when details prop is supplied", async () => {
    const user = userEvent.setup();

    render(
      <ErrorModal
        isOpen={true}
        title="System Error"
        message="Database query failed."
        details="Error 500: Internal Server Exception at line 42"
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /Show technical details/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.queryByText(/Error 500: Internal Server Exception/)).not.toBeInTheDocument();

    await user.click(toggleBtn);
    expect(screen.getByText(/Error 500: Internal Server Exception/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hide technical details/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hide technical details/i }));
    expect(screen.queryByText(/Error 500: Internal Server Exception/)).not.toBeInTheDocument();
  });

  it("renders formatted JSON when details is an object", async () => {
    const user = userEvent.setup();

    render(
      <ErrorModal
        isOpen={true}
        title="Error"
        message="Failed."
        details={{ code: "ERR_TIMEOUT", statusCode: 504 }}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Show technical details/i }));
    expect(screen.getByText(/ERR_TIMEOUT/)).toBeInTheDocument();
  });
});
