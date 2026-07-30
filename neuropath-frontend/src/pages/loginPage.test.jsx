import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./loginPage";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("LoginPage", () => {
  const login = vi.fn();
  const onNavigateRegister = vi.fn();
  const onLoginSuccess = vi.fn();
  const onClearMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ login });
  });

  function renderPage(props = {}) {
    return render(
      <LoginPage
        onNavigateRegister={onNavigateRegister}
        onLoginSuccess={onLoginSuccess}
        onClearMessage={onClearMessage}
        {...props}
      />,
    );
  }

  it("renders the email and password fields", () => {
    renderPage();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("logs in with the trimmed, lowercased email and calls onLoginSuccess", async () => {
    login.mockResolvedValueOnce({ token: "abc" });
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText(/email address/i),
      "  Jane@Example.com  ",
    );
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith("jane@example.com", "secret123"),
    );
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows the server-provided error message when login fails", async () => {
    login.mockRejectedValueOnce({
      response: { data: { error: "Account locked." } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Account locked.")).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows a generic error message when login fails without a server message", async () => {
    login.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
  });

  it("clears the error banner as soon as the user edits a field again", async () => {
    login.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "x");

    expect(
      screen.queryByText("Invalid email or password."),
    ).not.toBeInTheDocument();
  });

  it("calls onNavigateRegister when the create-account link is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create one here/i }));

    expect(onNavigateRegister).toHaveBeenCalledTimes(1);
  });

  it("renders the success banner when a successMessage prop is provided", () => {
    renderPage({ successMessage: "Registration complete!" });

    expect(screen.getByText("Registration complete!")).toBeInTheDocument();
  });
});
