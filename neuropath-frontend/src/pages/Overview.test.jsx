import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Overview from "./Overview";
import { useAuth } from "../context/AuthContext";
import { studentsAPI, iepAPI, lessonPlansAPI, visualAidsAPI } from "../api/client";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
  },
  iepAPI: {
    dashboardStats: vi.fn(),
  },
  lessonPlansAPI: {
    list: vi.fn(),
  },
  visualAidsAPI: {
    list: vi.fn(),
  },
}));

// Mock CountUp and GlareHover to keep tests lightweight
vi.mock("../components/ui/CountUp", () => ({
  default: ({ to }) => <span>{to}</span>,
}));

vi.mock("../components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("Overview - Getting Started 3-Step Path", () => {
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
    });
    lessonPlansAPI.list.mockResolvedValue([]);
    visualAidsAPI.list.mockResolvedValue([]);
  });

  it("renders Getting Started heading and all 3 steps", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    render(
      <MemoryRouter>
        <Overview setActivePage={mockSetActivePage} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("getting-started-section")).toBeInTheDocument();
    expect(screen.getByText(/1\. add a student/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. generate an iep/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. use classroom tools/i)).toBeInTheDocument();
  });

  it("with 0 students: Step 1 is active, Step 2 and Step 3 are locked", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Overview setActivePage={mockSetActivePage} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(studentsAPI.list).toHaveBeenCalledWith(1);
    });

    const step1 = screen.getByTestId("getting-started-step-1");
    const step2 = screen.getByTestId("getting-started-step-2");
    const step3 = screen.getByTestId("getting-started-step-3");

    // Step 1 button is enabled
    const step1Btn = within(step1).getByRole("button", { name: /add student/i });
    expect(step1Btn).toBeEnabled();
    await user.click(step1Btn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/create");
    expect(mockSetActivePage).toHaveBeenCalledWith("/dashboard/students/create");

    // Step 2 button is disabled
    const step2Btn = within(step2).getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeDisabled();
    expect(within(step2).getByText(/requires at least one student profile/i)).toBeInTheDocument();

    // Step 3 button is disabled
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeDisabled();
    expect(within(step3).getByText(/requires a saved iep/i)).toBeInTheDocument();
  });

  it("with 1+ students and 0 IEPs: Step 1 is completed & disabled, Step 2 is active, Step 3 is locked", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Overview setActivePage={mockSetActivePage} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(studentsAPI.list).toHaveBeenCalled();
    });

    const step1 = screen.getByTestId("getting-started-step-1");
    const step2 = screen.getByTestId("getting-started-step-2");
    const step3 = screen.getByTestId("getting-started-step-3");

    // Step 1 button is completed and disabled (not clickable)
    const step1Btn = within(step1).getByRole("button", { name: /done/i });
    expect(step1Btn).toBeDisabled();

    // Step 2 button is enabled and navigates to /dashboard/iep/generate
    const step2Btn = within(step2).getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeEnabled();
    await user.click(step2Btn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/iep/generate");
    expect(mockSetActivePage).toHaveBeenCalledWith("/dashboard/iep/generate");

    // Step 3 button is still disabled
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeDisabled();
  });

  it("with 1+ students and 1+ IEPs: steps 1 & 2 are completed/disabled, step 3 is unlocked and navigable", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 2, ai_insights: 1 });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Overview setActivePage={mockSetActivePage} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(iepAPI.dashboardStats).toHaveBeenCalled();
    });

    const step1 = screen.getByTestId("getting-started-step-1");
    const step2 = screen.getByTestId("getting-started-step-2");
    const step3 = screen.getByTestId("getting-started-step-3");

    expect(within(step1).getByRole("button", { name: /done/i })).toBeDisabled();
    expect(within(step2).getByRole("button", { name: /done/i })).toBeDisabled();

    // Step 3 button is enabled and navigates to /dashboard/lessons
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeEnabled();
    await user.click(step3Btn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/lessons");
    expect(mockSetActivePage).toHaveBeenCalledWith("/dashboard/lessons");
  });

  it("navigates correctly when clicking quick action cards", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Overview setActivePage={mockSetActivePage} />
      </MemoryRouter>,
    );

    const createProfileCard = screen.getByRole("button", { name: /create student profile/i });
    await user.click(createProfileCard);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/create");

    const viewProfilesCard = screen.getByRole("button", { name: /view all students/i });
    await user.click(viewProfilesCard);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students");

    const generateIepCard = screen.getByRole("button", { name: /generate iep use ai/i });
    await user.click(generateIepCard);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/iep/generate");
  });
});

describe("Overview - At a Glance Stats (Option 2: Classroom & Resource Readiness)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
    });
  });

  it("renders Total Students, Active IEPs, and Classroom Resources, and excludes vanity stats", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 4 });
    lessonPlansAPI.list.mockResolvedValue([{ id: 10 }]);
    visualAidsAPI.list.mockResolvedValue([{ id: 20 }, { id: 21 }]);

    render(
      <MemoryRouter>
        <Overview setActivePage={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Total Students")).toBeInTheDocument();
    expect(screen.getByText("Active IEPs")).toBeInTheDocument();
    expect(screen.getByText("Classroom Resources")).toBeInTheDocument();

    // Vanity / placeholder stats must not be present
    expect(screen.queryByText(/AI Insights Generated/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upcoming Reviews/i)).not.toBeInTheDocument();

    // Verify loaded counts
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // students
      expect(screen.getByText("4")).toBeInTheDocument(); // ieps
      expect(screen.getByText("3")).toBeInTheDocument(); // resources: 1 lesson + 2 visual aids
    });
  });
});
