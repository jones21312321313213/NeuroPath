import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManageLessonPlans from "./ManageLessonPlans";
import { lessonPlansAPI, iepAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/client", () => ({
  lessonPlansAPI: {
    getDirectory: vi.fn(),
    generate: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  iepAPI: {
    listByStudent: vi.fn(),
    listGoalsByIep: vi.fn(),
    listLatestGoalsByStudent: vi.fn(),
    listGoalsByStudent: vi.fn(),
  },
  studentsAPI: {
    list: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ManageLessonPlans Multi-IEP Selection", () => {
  const mockStudentsDirectory = [
    {
      studentID: 101,
      studentName: "Lucas Vance",
      grade: 3,
      availableIEPs: [
        { iepID: 202, version: 2, createdDate: "September 10, 2026", label: "IEP Version 2 (September 10, 2026)", accommodations: "Sensory room breaks" },
        { iepID: 201, version: 1, createdDate: "January 15, 2026", label: "IEP Version 1 (January 15, 2026)", accommodations: "Visual timer" },
      ],
      availableGoals: [],
    },
  ];

  const mockIepsVance = [
    {
      iepID: 202,
      version: 2,
      createdDate: "2026-09-10T10:00:00Z",
      formattedDate: "September 10, 2026",
      program_type: "Graded",
      accommodations: "Sensory room breaks",
      difficulties: "Sensory processing",
    },
    {
      iepID: 201,
      version: 1,
      createdDate: "2026-01-15T10:00:00Z",
      formattedDate: "January 15, 2026",
      program_type: "Graded",
      accommodations: "Visual timer",
      difficulties: "Attention",
    },
  ];

  const mockGoalsV2 = [
    {
      goalID: 302,
      goalName: "Sensory Regulation",
      subject_category: "Behavioral Skills",
      annual_goal: "Lucas will request a sensory break independently when overwhelmed.",
    },
  ];

  const mockGoalsV1 = [
    {
      goalID: 301,
      goalName: "Focus Duration",
      subject_category: "Academic Engagement",
      annual_goal: "Lucas will stay on-task with visual timer for 10 minutes.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, email: "teacher@test.com" } });
    lessonPlansAPI.getDirectory.mockResolvedValue({ directory: mockStudentsDirectory });
    lessonPlansAPI.list.mockResolvedValue([]);
    iepAPI.listByStudent.mockResolvedValue(mockIepsVance);
    iepAPI.listGoalsByIep.mockImplementation((iepId) => {
      if (iepId === 202) return Promise.resolve(mockGoalsV2);
      if (iepId === 201) return Promise.resolve(mockGoalsV1);
      return Promise.resolve([]);
    });
  });

  function renderComponent() {
    return render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );
  }

  it("renders student selector and loads IEP versions upon selecting student", async () => {
    renderComponent();

    expect(screen.getByText(/Choose a Student/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    const studentCard = screen.getByText("Lucas Vance").closest(".ts-student-card");
    fireEvent.click(studentCard);

    await waitFor(() => {
      expect(iepAPI.listByStudent).toHaveBeenCalledWith(101);
    });

    // Step 2 for selecting IEP version should appear
    await waitFor(() => {
      expect(screen.getByText(/Select an IEP Version/i)).toBeInTheDocument();
      expect(screen.getAllByText(/IEP Version 2/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/IEP Version 1/i)).toBeInTheDocument();
    });

    // Newest IEP (Version 2) should be selected by default, displaying Version 2's goals
    await waitFor(() => {
      expect(screen.getByText("Behavioral Skills")).toBeInTheDocument();
      expect(screen.getByText(/Lucas will request a sensory break/i)).toBeInTheDocument();
    });
  });

  it("switches goals dynamically when selecting an earlier IEP version", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText(/IEP Version 1/i)).toBeInTheDocument();
    });

    // Click on IEP Version 1 card
    const v1Card = screen.getByText(/IEP Version 1/i).closest(".ts-iep-item");
    fireEvent.click(v1Card);

    // Should fetch goals for IEP 201
    await waitFor(() => {
      expect(iepAPI.listGoalsByIep).toHaveBeenCalledWith(201);
    });

    // Version 1 goal should now be displayed
    await waitFor(() => {
      expect(screen.getByText("Academic Engagement")).toBeInTheDocument();
      expect(screen.getByText(/Lucas will stay on-task with visual timer/i)).toBeInTheDocument();
    });
  });

  it("generates lesson plan from the goal of the selected IEP version", async () => {
    lessonPlansAPI.generate.mockResolvedValue({
      lesson_plans: [
        {
          objective_focus: "Break Request",
          introduction: "Demonstrate break cards",
          core_activity: "Practice break request during math",
          assessment: "Self-check",
          materials_needed: ["Cards"],
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText("Behavioral Skills")).toBeInTheDocument();
    });

    // Select the goal
    const goalItem = screen.getByText("Behavioral Skills").closest(".ts-goal-item");
    fireEvent.click(goalItem);

    // Click Generate Lesson Plan
    const generateBtn = screen.getByRole("button", { name: /Generate Lesson Plan/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(lessonPlansAPI.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          studentID: 101,
          goalID: 302,
          goalArea: "Behavioral Skills",
        })
      );
    });
  });
});
