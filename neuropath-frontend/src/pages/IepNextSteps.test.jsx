import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IEPGenerationPage from "./IepGenerationPage";
import Overview from "./Overview";
import { iepAPI, studentsAPI } from "../api/client";
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

describe("Post-IEP Next Steps to Classroom Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, firstName: "Teacher" },
    });
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ id: 1, firstName: "Teacher" }),
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
    studentsAPI.list.mockResolvedValueOnce([{ studentID: 1 }]);
    iepAPI.dashboardStats.mockResolvedValueOnce({
      active_ieps: 2,
      ai_insights: 4,
    });

    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(<Overview setActivePage={setActivePage} />);

    // Should dynamically switch from "Generate IEP" to "Classroom Tools"
    const classroomToolsBtn = await screen.findByRole("button", {
      name: /classroom tools/i,
    });
    expect(classroomToolsBtn).toBeInTheDocument();
    expect(screen.getByText(/2 active IEPs ready!/i)).toBeInTheDocument();

    await user.click(classroomToolsBtn);
    expect(setActivePage).toHaveBeenCalledWith("manage-lesson-plans");
  });
});
