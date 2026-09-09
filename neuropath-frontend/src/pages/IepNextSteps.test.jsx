import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IEPGenerationPage from "./IepGenerationPage";
import Overview from "./Overview";
import { iepAPI, studentsAPI, lessonPlansAPI, visualAidsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  iepAPI: {
    listByStudent: vi.fn(),
    listGoalsByIep: vi.fn(),
    dashboardStats: vi.fn(),
    save: vi.fn(),
    generateGoalsFromIep: vi.fn(),
    saveGoal: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  studentsAPI: {
    list: vi.fn(),
    get: vi.fn(),
  },
  lessonPlansAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  visualAidsAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../components/ui/CountUp", () => ({
  default: ({ to }) => <span>{to}</span>,
}));

vi.mock("../components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("Post-IEP Next Steps to Classroom Tools (#94)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, firstName: "Teacher", has_completed_tutorial: true },
    });
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ id: 1, firstName: "Teacher", has_completed_tutorial: true }),
    );
  });

  it("renders classroom tools next steps in View IEP panel and navigates to correct pages", async () => {
    const mockStudent = {
      studentID: 10,
      name: "Ethan Carter",
      grade: 3,
      age: 8,
    };
    const mockIep = {
      iepID: 101,
      studentID: 10,
      studentName: "Ethan Carter",
      version: 1,
      formattedDate: "2026-09-01",
      generatedDetails: {
        learnerGoals: [],
        barrierRows: [],
      },
    };

    studentsAPI.list.mockResolvedValueOnce([mockStudent]);
    iepAPI.listByStudent.mockResolvedValueOnce([mockIep]);
    iepAPI.listGoalsByIep.mockResolvedValueOnce([]);

    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(<IEPGenerationPage mode="view" setActivePage={setActivePage} />);

    // Type into student search input
    const searchInput = screen.getByPlaceholderText(/type student name/i);
    await user.type(searchInput, "Ethan");

    // Click student result from dropdown
    const studentBtn = await screen.findByRole("button", {
      name: /ethan carter/i,
    });
    await user.click(studentBtn);

    // Verify next steps card is visible
    expect(
      await screen.findByText(/Instructional Support: Use this IEP in the Classroom/i),
    ).toBeInTheDocument();

    // Verify Lesson Plan button navigates
    const lessonPlanBtn = screen.getByRole("button", {
      name: /create lesson plan/i,
    });
    await user.click(lessonPlanBtn);
    expect(setActivePage).toHaveBeenCalledWith("manage-lesson-plans");

    // Verify Visual Aid button navigates
    const visualAidBtn = screen.getByRole("button", {
      name: /create visual aid/i,
    });
    await user.click(visualAidBtn);
    expect(setActivePage).toHaveBeenCalledWith("manage-visual-aids");

    // Verify Teaching Strategies button navigates
    const strategyBtn = screen.getByRole("button", {
      name: /teaching strategies/i,
    });
    await user.click(strategyBtn);
    expect(setActivePage).toHaveBeenCalledWith("manage-teaching-strategies");

    // Verify Back to Overview button navigates
    const overviewBtn = screen.getByRole("button", {
      name: /back to overview/i,
    });
    await user.click(overviewBtn);
    expect(setActivePage).toHaveBeenCalledWith("overview");
  });

  it("reflects readiness in Overview step 3 when active IEPs exist", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({
      active_ieps: 2,
      ai_insights: 1,
    });

    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(<Overview setActivePage={setActivePage} />);

    await waitFor(() => {
      expect(iepAPI.dashboardStats).toHaveBeenCalled();
    });

    const step3 = screen.getByTestId("getting-started-step-3");
    const step3Btn = within(step3).getByRole("button", {
      name: /open tools|use tools/i,
    });
    expect(step3Btn).toBeEnabled();

    await user.click(step3Btn);
    expect(setActivePage).toHaveBeenCalledWith("manage-lesson-plans");
  });
});
