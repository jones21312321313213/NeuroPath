import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotFoundPage from "./NotFoundPage";
import { useAuth } from "../context/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("NotFoundPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 404 badge, title, and descriptive message", () => {
    useAuth.mockReturnValue({ user: null });
    render(<NotFoundPage />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(
      screen.getByText(/the page you are looking for does not exist/i),
    ).toBeInTheDocument();
  });

  it("shows 'Go to Login' and navigates to /login when user is unauthenticated", async () => {
    useAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();
    render(<NotFoundPage />);

    const loginBtn = screen.getByRole("button", { name: /go to login/i });
    expect(loginBtn).toBeInTheDocument();

    await user.click(loginBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows 'Go to Dashboard' and navigates to /dashboard when user is authenticated", async () => {
    useAuth.mockReturnValue({ user: { id: 1, name: "Teacher Jane" } });
    const user = userEvent.setup();
    render(<NotFoundPage />);

    const dashboardBtn = screen.getByRole("button", { name: /go to dashboard/i });
    expect(dashboardBtn).toBeInTheDocument();

    await user.click(dashboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("navigates to / when 'Back to Home' is clicked", async () => {
    useAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();
    render(<NotFoundPage />);

    const homeBtn = screen.getByRole("button", { name: /back to home/i });
    expect(homeBtn).toBeInTheDocument();

    await user.click(homeBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
