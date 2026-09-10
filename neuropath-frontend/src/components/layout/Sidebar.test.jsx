import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Student Profiling")).toBeInTheDocument();
    expect(screen.getByText("AI-Based IEP Generation")).toBeInTheDocument();
    expect(screen.getByText("Instructional Support")).toBeInTheDocument();
    expect(screen.getByText("Outcome Monitoring")).toBeInTheDocument();
  });

  it("calls onToggleCollapse when sidebar header or empty space is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
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
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const aside = container.querySelector("aside.sidebar");
    expect(aside).toHaveClass("collapsed");
    expect(screen.getByTestId("sidebar-empty-space")).toBeInTheDocument();
  });

  it("expands child links when clicking on a category in expanded mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText("Create Student Profile")).not.toBeInTheDocument();
    const profilingBtn = screen.getByRole("button", { name: /student profiling/i });
    await user.click(profilingBtn);

    expect(screen.getByText("Create Student Profile")).toBeInTheDocument();
    expect(screen.getByText("View Student Profile")).toBeInTheDocument();
  });

  it("auto-expands matching categories based on current path", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/students/create"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Create Student Profile")).toBeInTheDocument();
    expect(screen.getByText("View Student Profile")).toBeInTheDocument();
  });

  it("calls setActivePage callback when child link is clicked if setActivePage is provided", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          setActivePage={mockSetActivePage}
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const profilingBtn = screen.getByRole("button", { name: /student profiling/i });
    await user.click(profilingBtn);

    const createBtn = screen.getByRole("button", { name: /create student profile/i });
    await user.click(createBtn);

    expect(mockSetActivePage).toHaveBeenCalledWith("/dashboard/students/create");
  });
});
