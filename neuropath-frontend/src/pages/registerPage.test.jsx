import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterPage from "./registerPage";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("RegisterPage", () => {
  const registerMock = vi.fn();
  const loginMock = vi.fn();
  const onNavigateLogin = vi.fn();
  const onRegisterSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      register: registerMock,
      login: loginMock,
    });
  });

  function renderPage(props = {}) {
    return render(
      <RegisterPage
        onNavigateLogin={onNavigateLogin}
        onRegisterSuccess={onRegisterSuccess}
        {...props}
      />
    );
  }

  it("renders form inputs with required asterisks and aria-required", () => {
    renderPage();

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    expect(firstNameInput).toBeRequired();
    expect(firstNameInput).toHaveAttribute("aria-required", "true");
    expect(lastNameInput).toBeRequired();
    expect(lastNameInput).toHaveAttribute("aria-required", "true");
    expect(emailInput).toBeRequired();
    expect(emailInput).toHaveAttribute("aria-required", "true");
    expect(passwordInput).toBeRequired();
    expect(passwordInput).toHaveAttribute("aria-required", "true");
    expect(confirmPasswordInput).toBeRequired();
    expect(confirmPasswordInput).toHaveAttribute("aria-required", "true");
  });

  it("displays upfront password requirements checklist", () => {
    renderPage();

    expect(screen.getByText(/password requirements:/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
  });

  it("validates password length and complexity before sending request", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Teacher");
    await user.type(screen.getByLabelText(/email address/i), "jane@school.edu");
    await user.type(screen.getByLabelText(/^password/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/password must be at least 8 characters/i)
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("automatically logs in and calls onRegisterSuccess upon successful registration (ENH05)", async () => {
    registerMock.mockResolvedValueOnce({ message: "Teacher account successfully created." });
    loginMock.mockResolvedValueOnce({ token: "test-token" });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Teacher");
    await user.type(screen.getByLabelText(/email address/i), "jane@school.edu");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        username: "jane@school.edu",
        email: "jane@school.edu",
        first_name: "Jane",
        last_name: "Teacher",
        password: "Password123!",
      });
      expect(loginMock).toHaveBeenCalledWith("jane@school.edu", "Password123!");
      expect(onRegisterSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("falls back to onNavigateLogin if auto-login fails or onRegisterSuccess is not provided", async () => {
    registerMock.mockResolvedValueOnce({ message: "Created" });
    loginMock.mockRejectedValueOnce(new Error("Login failed"));

    const user = userEvent.setup();
    renderPage({ onRegisterSuccess: undefined });

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Teacher");
    await user.type(screen.getByLabelText(/email address/i), "jane@school.edu");
    await user.type(screen.getByLabelText(/^password/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(onNavigateLogin).toHaveBeenCalledWith(
        expect.stringContaining("Account created for Jane! Please sign in.")
      );
    });
  });
});
