import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Sidebar component", () => {
  const mockSetActivePage = vi.fn();
  const mockOnToggleCollapse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { first_name: "Jane", last_name: "Doe" },
      logout: vi.fn(),
    });
  });

  it("renders Home and all major navigation categories", () => {
    render(
      <Sidebar
        activePage="home"
        setActivePage={mockSetActivePage}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Student Profiling")).toBeInTheDocument();
    expect(screen.getByText("AI-Based IEP Generation")).toBeInTheDocument();
    expect(screen.getByText("Instructional Support")).toBeInTheDocument();
    expect(screen.getByText("Outcome Monitoring")).toBeInTheDocument();
  });

  it("navigates to Home when Home button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Sidebar
        activePage="student-profiling"
        setActivePage={mockSetActivePage}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />,
    );

    const homeBtn = screen.getByRole("button", { name: /home/i });
    await user.click(homeBtn);
    expect(mockSetActivePage).toHaveBeenCalledWith("home");
  });

  it("calls onToggleCollapse when sidebar header or empty space is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Sidebar
        activePage="home"
        setActivePage={mockSetActivePage}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />,
    );

    const header = screen.getByTitle(/click to collapse sidebar/i);
    await user.click(header);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    const emptySpace = screen.getByTestId("sidebar-empty-space");
    await user.click(emptySpace);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it("renders in collapsed mode with collapsed class", () => {
    const { container } = render(
      <Sidebar
        activePage="home"
        setActivePage={mockSetActivePage}
        collapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />,
    );

    const aside = container.querySelector("aside.sidebar");
    expect(aside).toHaveClass("collapsed");
    expect(screen.getByTestId("sidebar-empty-space")).toBeInTheDocument();
  });

  it("expands child links when clicking on a category in expanded mode", async () => {
    const user = userEvent.setup();
    render(
      <Sidebar
        activePage="home"
        setActivePage={mockSetActivePage}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />,
    );

    expect(screen.queryByText("Create Student Profile")).not.toBeInTheDocument();
    const profilingBtn = screen.getByRole("button", { name: /student profiling/i });
    await user.click(profilingBtn);

    expect(screen.getByText("Create Student Profile")).toBeInTheDocument();
    expect(screen.getByText("View Student Profile")).toBeInTheDocument();
  });
});
