import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ResetPasswordPage from "./ResetPasswordPage";
import { authAPI } from "../api/client";

vi.mock("../api/client", () => ({
  authAPI: {
    resetPasswordConfirm: vi.fn(),
  },
}));

describe("ResetPasswordPage", () => {
  const onNavigateHome = vi.fn();
  const onNavigateLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage(
    props = {},
    { initialEntries = ["/reset-password?uid=MTI=&token=valid-token-123"] } = {}
  ) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ResetPasswordPage
          onNavigateHome={onNavigateHome}
          onNavigateLogin={onNavigateLogin}
          {...props}
        />
      </MemoryRouter>
    );
  }

  it("renders page header, input fields, and back to home button", () => {
    renderPage();

    expect(screen.getByRole("button", { name: /back to home/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /reset your password/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeInTheDocument();
  });

  it("renders manual UID/Token fields when not supplied in URL params", () => {
    renderPage({}, { initialEntries: ["/reset-password"] });

    expect(screen.getByLabelText(/user id or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reset token/i)).toBeInTheDocument();
  });

  it("navigates back to home when Back to home button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /back to home/i }));
    expect(onNavigateHome).toHaveBeenCalled();
  });

  it("validates password length and complexity", async () => {
    const user = userEvent.setup();
    renderPage();

    const passInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /reset password/i });

    // Too short
    await user.type(passInput, "short");
    await user.type(confirmInput, "short");
    await user.click(submitBtn);

    expect(
      screen.getByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument();
    expect(authAPI.resetPasswordConfirm).not.toHaveBeenCalled();
  });

  it("validates matching passwords", async () => {
    const user = userEvent.setup();
    renderPage();

    const passInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /reset password/i });

    await user.type(passInput, "ValidPass123!");
    await user.type(confirmInput, "MismatchedPass123!");
    await user.click(submitBtn);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authAPI.resetPasswordConfirm).not.toHaveBeenCalled();
  });

  it("submits valid reset payload to authAPI.resetPasswordConfirm", async () => {
    const user = userEvent.setup();
    authAPI.resetPasswordConfirm.mockResolvedValueOnce({
      message: "Your password has been successfully reset.",
    });

    renderPage();

    const passInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /reset password/i });

    await user.type(passInput, "ValidPass123!");
    await user.type(confirmInput, "ValidPass123!");
    await user.click(submitBtn);

    expect(authAPI.resetPasswordConfirm).toHaveBeenCalledWith({
      uid: "MTI=",
      token: "valid-token-123",
      new_password: "ValidPass123!",
      new_password_confirm: "ValidPass123!",
    });

    await waitFor(() => {
      expect(screen.getByText(/password reset successful!/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in now/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /sign in now/i }));
    expect(onNavigateLogin).toHaveBeenCalled();
  });

  it("displays server error message when reset fails", async () => {
    const user = userEvent.setup();
    const error = new Error("The password reset link is invalid or has expired.");
    error.data = { error: "The password reset link is invalid or has expired." };
    authAPI.resetPasswordConfirm.mockRejectedValueOnce(error);

    renderPage();

    const passInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: /reset password/i });

    await user.type(passInput, "ValidPass123!");
    await user.type(confirmInput, "ValidPass123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/the password reset link is invalid or has expired/i)
      ).toBeInTheDocument();
    });
  });
});
