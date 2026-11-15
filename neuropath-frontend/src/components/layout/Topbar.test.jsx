import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { MemoryRouter } from "react-router-dom";
import Topbar from "./Topbar";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Topbar component", () => {
  const mockOnToggleCollapse = vi.fn();
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { first_name: "Jane", last_name: "Doe" },
    });
  });

  it("renders breadcrumb correctly", () => {
    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Student Profiling / View Profiles" />
      </MemoryRouter>
    );

    expect(screen.getByText("DASHBOARD / Student Profiling / View Profiles")).toBeInTheDocument();
  });

  it("renders user name and initials in profile pill", () => {
    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Home" />
      </MemoryRouter>
    );

    expect(screen.getByText("Teacher Jane")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View user profile for Teacher Jane" })
    ).toBeInTheDocument();
  });

  it("renders profile picture when user.profile_picture is provided", () => {
    useAuth.mockReturnValue({
      user: {
        first_name: "Jane",
        last_name: "Doe",
        profile_picture: "data:image/png;base64,samplebase64",
      },
    });

    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Home" />
      </MemoryRouter>
    );

    const pill = screen.getByRole("button", { name: "View user profile for Teacher Jane" });
    const img = pill.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,samplebase64");
    expect(img).toHaveClass("topbar-pill-avatar-img");
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  it("falls back to initials when profile picture fails to load", () => {
    useAuth.mockReturnValue({
      user: {
        first_name: "Jane",
        last_name: "Doe",
        profile_picture: "https://example.com/broken.png",
      },
    });

    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Home" />
      </MemoryRouter>
    );

    const pill = screen.getByRole("button", { name: "View user profile for Teacher Jane" });
    const img = pill.querySelector("img");
    expect(img).toBeInTheDocument();

    fireEvent.error(img);

    expect(pill.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("navigates to user profile when pill is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Topbar
          breadcrumb="DASHBOARD / Home"
          setActivePage={mockSetActivePage}
        />
      </MemoryRouter>
    );

    const pill = screen.getByRole("button", { name: "View user profile for Teacher Jane" });
    await user.click(pill);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/profile");
    expect(mockSetActivePage).toHaveBeenCalledWith("my-profile");
  });

  it("renders toggle button when onToggleCollapse is provided and calls handler on click", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <Topbar
          breadcrumb="DASHBOARD / Home"
          collapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole("button", { name: "Expand sidebar navigation" });
    expect(toggleBtn).toBeInTheDocument();
    await user.click(toggleBtn);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <Topbar
          breadcrumb="DASHBOARD / Home"
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const toggleBtnExpanded = screen.getByRole("button", { name: "Collapse sidebar navigation" });
    expect(toggleBtnExpanded).toBeInTheDocument();
  });

  it("does not render toggle button if onToggleCollapse is not provided", () => {
    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Home" />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: /sidebar navigation/i })).not.toBeInTheDocument();
  });

  it("intercepts user profile pill click when an unsaved changes guard is active", async () => {
    const user = userEvent.setup();
    const mockGuardPrompt = vi.fn();

    const { UnsavedChangesProvider, useUnsavedChangesContext } = await import(
      "../../context/UnsavedChangesContext"
    );

    function GuardRegister() {
      const { registerGuard } = useUnsavedChangesContext();
      useEffect(() => {
        return registerGuard({
          id: "active-draft-guard",
          isDirty: true,
          promptNavigation: mockGuardPrompt,
        });
      }, [registerGuard]);
      return null;
    }

    render(
      <MemoryRouter initialEntries={["/dashboard/strategies"]}>
        <UnsavedChangesProvider>
          <GuardRegister />
          <Topbar
            breadcrumb="DASHBOARD / Instructional Support / Teaching Strategies"
            setActivePage={mockSetActivePage}
          />
        </UnsavedChangesProvider>
      </MemoryRouter>
    );

    const pill = screen.getByRole("button", {
      name: "View user profile for Teacher Jane",
    });
    await user.click(pill);

    expect(mockGuardPrompt).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetActivePage).not.toHaveBeenCalled();
  });

  it("renders info circle App Walkthrough button beside notification bell and triggers onStartTour", async () => {
    const user = userEvent.setup();
    const mockOnStartTour = vi.fn();

    render(
      <MemoryRouter>
        <Topbar breadcrumb="DASHBOARD / Home" onStartTour={mockOnStartTour} />
      </MemoryRouter>
    );

    const tourBtn = screen.getByTestId("topbar-tour-btn");
    expect(tourBtn).toBeInTheDocument();
    expect(tourBtn).toHaveAttribute("aria-label", "Start interactive dashboard walkthrough tour");
    expect(tourBtn.querySelector(".ti-info-circle")).toBeInTheDocument();

    await user.click(tourBtn);
    expect(mockOnStartTour).toHaveBeenCalledTimes(1);
  });
});
