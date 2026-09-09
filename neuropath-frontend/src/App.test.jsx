import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";

vi.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
  useAuth: vi.fn(),
}));

// Mock heavy subcomponents
vi.mock("./pages/Overview", () => ({
  default: () => <div>Overview Page Content</div>,
}));

describe("App First-Login Tutorial Modal Integration", () => {
  const mockMarkTutorialComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TeacherTutorialModal when user has_completed_tutorial is false", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to neuropath/i)).toBeInTheDocument();
  });

  it("does NOT render TeacherTutorialModal when user has_completed_tutorial is true", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "returningteacher@example.com",
        has_completed_tutorial: true,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/overview page content/i)).toBeInTheDocument();
  });

  it("calls markTutorialComplete when Skip Walkthrough is clicked", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /skip walkthrough/i }));
    expect(mockMarkTutorialComplete).toHaveBeenCalledTimes(1);
  });
});
