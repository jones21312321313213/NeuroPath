import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { authAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  authAPI: {
    forgotPassword: vi.fn(),
  },
}));

describe("ForgotPasswordModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when isOpen is true", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<ForgotPasswordModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel button is clicked", () => {
    const handleClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={handleClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={handleClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("shows error if email is empty or invalid format and does not call API", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form);
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(authAPI.forgotPassword).not.toHaveBeenCalled();
  });

  it("calls authAPI.forgotPassword and shows success confirmation upon success", async () => {
    authAPI.forgotPassword.mockResolvedValueOnce({
      message: "If an account with that email exists, password reset instructions have been sent.",
    });

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: "teacher@example.com" } });

    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form);

    expect(authAPI.forgotPassword).toHaveBeenCalledWith("teacher@example.com");

    await waitFor(() => {
      expect(screen.getByText(/instructions have been sent/i)).toBeInTheDocument();
      expect(screen.getByText("teacher@example.com")).toBeInTheDocument();
    });
  });

  it("shows honest error message when API call fails and does not show success", async () => {
    authAPI.forgotPassword.mockRejectedValueOnce(
      new Error("Failed to send reset email. Please try again later.")
    );

    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: "teacher@example.com" } });

    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form);

    expect(authAPI.forgotPassword).toHaveBeenCalledWith("teacher@example.com");

    await waitFor(() => {
      expect(
        screen.getByText(/failed to send reset email/i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/instructions have been sent/i)).not.toBeInTheDocument();
  });

  it("invokes onNavigateResetPassword when clicking reset link in modal", () => {
    const handleNavigateReset = vi.fn();
    render(
      <ForgotPasswordModal
        isOpen={true}
        onClose={vi.fn()}
        onNavigateResetPassword={handleNavigateReset}
      />
    );

    const linkBtn = screen.getByRole("button", {
      name: /already have a reset link or token\? click here/i,
    });
    fireEvent.click(linkBtn);
    expect(handleNavigateReset).toHaveBeenCalled();
  });

  it("allows returning to sign in from success screen", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    authAPI.forgotPassword.mockResolvedValueOnce({});

    render(<ForgotPasswordModal isOpen={true} onClose={handleClose} />);
    const input = screen.getByLabelText(/email address/i);
    await user.type(input, "teacher@example.com");
    await user.click(screen.getByRole("button", { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByText(/return to sign in/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /return to sign in/i }));
    expect(handleClose).toHaveBeenCalled();
  });
});
