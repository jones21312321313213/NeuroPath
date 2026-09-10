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

  it("renders semantic landmarks for aside and nav", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const aside = screen.getByRole("complementary", { name: "Sidebar" });
    expect(aside).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Main Navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("renders header toggle button with proper accessible label and triggers toggle", async () => {
    const user = userEvent.setup();
    const { rerender, container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const headerBtn = container.querySelector("button.sidebar-header");
    expect(headerBtn).toBeInTheDocument();
    expect(headerBtn).toHaveAttribute("aria-label", "Collapse sidebar");
    await user.click(headerBtn);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const headerBtnCollapsed = container.querySelector("button.sidebar-header");
    expect(headerBtnCollapsed).toHaveAttribute("aria-label", "Expand sidebar");
  });

  it("calls onToggleCollapse when empty space is clicked or activated by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const emptySpace = screen.getByTestId("sidebar-empty-space");
    await user.click(emptySpace);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    emptySpace.focus();
    await user.keyboard("{Enter}");
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(2);

    await user.keyboard(" ");
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(3);
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

  it("sets aria-expanded, aria-controls, and subnav region when category is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const profilingBtn = screen.getByRole("button", { name: /student profiling/i });
    expect(profilingBtn).toHaveAttribute("aria-expanded", "false");
    expect(profilingBtn).toHaveAttribute("aria-controls", "subnav-student-profiling");
    expect(screen.queryByRole("region", { name: /student profiling sub-navigation/i })).not.toBeInTheDocument();

    await user.click(profilingBtn);

    expect(profilingBtn).toHaveAttribute("aria-expanded", "true");
    const subnavRegion = screen.getByRole("region", { name: /student profiling sub-navigation/i });
    expect(subnavRegion).toBeInTheDocument();
    expect(subnavRegion).toHaveAttribute("id", "subnav-student-profiling");
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
