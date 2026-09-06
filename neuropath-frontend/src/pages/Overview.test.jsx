import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Overview from "./Overview";
import { useAuth } from "../context/AuthContext";
import { studentsAPI, iepAPI } from "../api/client";

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
  });

  it("renders Getting Started heading and all 3 steps", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    render(<Overview setActivePage={mockSetActivePage} />);

    expect(screen.getByTestId("getting-started-section")).toBeInTheDocument();
    expect(screen.getByText(/1\. add a student/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. generate an iep/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. use classroom tools/i)).toBeInTheDocument();
  });

  it("with 0 students: Step 1 is active, Step 2 and Step 3 are locked", async () => {
    studentsAPI.list.mockResolvedValue([]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

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
    expect(mockSetActivePage).toHaveBeenCalledWith("create-student-profile");

    // Step 2 button is disabled
    const step2Btn = within(step2).getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeDisabled();
    expect(within(step2).getByText(/requires at least one student profile/i)).toBeInTheDocument();

    // Step 3 button is disabled
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeDisabled();
    expect(within(step3).getByText(/requires a saved iep/i)).toBeInTheDocument();
  });

  it("with 1+ students and 0 IEPs: Step 1 & 2 are active, Step 3 is locked", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 0, ai_insights: 0 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(studentsAPI.list).toHaveBeenCalled();
    });

    const step2 = screen.getByTestId("getting-started-step-2");
    const step3 = screen.getByTestId("getting-started-step-3");

    // Step 2 button is enabled and navigates to iep-generation
    const step2Btn = within(step2).getByRole("button", { name: /generate iep/i });
    expect(step2Btn).toBeEnabled();
    await user.click(step2Btn);
    expect(mockSetActivePage).toHaveBeenCalledWith("iep-generation");

    // Step 3 button is still disabled
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeDisabled();
  });

  it("with 1+ students and 1+ IEPs: all 3 steps are unlocked and navigable", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 2, ai_insights: 1 });

    const user = userEvent.setup();
    render(<Overview setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(iepAPI.dashboardStats).toHaveBeenCalled();
    });

    const step3 = screen.getByTestId("getting-started-step-3");

    // Step 3 button is enabled and navigates to manage-lesson-plans
    const step3Btn = within(step3).getByRole("button", { name: /open tools|use tools/i });
    expect(step3Btn).toBeEnabled();
    await user.click(step3Btn);
    expect(mockSetActivePage).toHaveBeenCalledWith("manage-lesson-plans");
  });
});
