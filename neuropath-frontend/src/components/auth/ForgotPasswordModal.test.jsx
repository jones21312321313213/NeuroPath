import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForgotPasswordModal from "./ForgotPasswordModal";

describe("ForgotPasswordModal", () => {
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

  it("shows error if email is empty or invalid format", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form);
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it("shows success confirmation after submitting a valid email", () => {
    render(<ForgotPasswordModal isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: "teacher@example.com" } });
    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form);
    expect(screen.getByText(/instructions have been sent/i)).toBeInTheDocument();
  });
});
