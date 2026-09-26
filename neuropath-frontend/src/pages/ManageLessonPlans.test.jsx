import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManageLessonPlans from "./ManageLessonPlans";
import { lessonPlansAPI, iepAPI, studentsAPI } from "../api/client";
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

    // Auto-selected badge is rendered since Version 2 has only 1 goal
    expect(screen.getByTestId("goal-auto-selected-badge")).toBeInTheDocument();
    expect(screen.getByText(/Goal automatically selected from Version 2/i)).toBeInTheDocument();

    // Click Generate Lesson Plan directly without needing to click the goal item
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

  it("displays teacher-friendly loading indicator without technical AI jargon while generating", async () => {
    let resolveGenerate;
    const generatePromise = new Promise((resolve) => {
      resolveGenerate = resolve;
    });
    lessonPlansAPI.generate.mockReturnValue(generatePromise);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText("Behavioral Skills")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Behavioral Skills").closest(".ts-goal-item"));

    const generateBtn = screen.getByRole("button", { name: /Generate Lesson Plan/i });
    fireEvent.click(generateBtn);

    // Verify accessible loading card is displayed with pedagogical phrasing
    const loadingCard = screen.getByRole("status");
    expect(loadingCard).toBeInTheDocument();
    expect(screen.getByText("Creating Personalized Lesson Plan…")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Structuring instructional sequence and learning activities based on the IEP goal area",
      ),
    ).toBeInTheDocument();

    // Verify technical AI jargon is NOT displayed
    expect(screen.queryByText(/Invoking Llama AI Pipeline/i)).not.toBeInTheDocument();

    // Complete generation
    resolveGenerate({
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

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("does not auto-select when an IEP version has multiple goals, requiring manual selection", async () => {
    const mockMultiGoals = [
      {
        goalID: 401,
        goalName: "Math Problem Solving",
        subject_category: "Mathematical Skills",
        annual_goal: "Lucas will solve 2-digit addition problems.",
      },
      {
        goalID: 402,
        goalName: "Verbal Greetings",
        subject_category: "Communication Skills",
        annual_goal: "Lucas will greet peers independently.",
      },
    ];
    iepAPI.listGoalsByIep.mockResolvedValue(mockMultiGoals);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText("Mathematical Skills")).toBeInTheDocument();
      expect(screen.getByText("Communication Skills")).toBeInTheDocument();
    });

    // Auto-selected badge should NOT appear
    expect(screen.queryByTestId("goal-auto-selected-badge")).not.toBeInTheDocument();

    // Generate button should be disabled initially
    const generateBtn = screen.getByRole("button", { name: /Generate Lesson Plan/i });
    expect(generateBtn).toBeDisabled();

    // Select the second goal
    const goalItem = screen.getByText("Communication Skills").closest(".ts-goal-item");
    fireEvent.click(goalItem);

    // Button should now be enabled
    expect(generateBtn).not.toBeDisabled();
  });
});

describe("ManageLessonPlans Unified Management View (Issue #161)", () => {
  const mockStudents = [
    { studentID: 101, name: "Lucas Vance", grade: 3, age: 9 },
    { studentID: 102, name: "Maya Lin", grade: 4, age: 10 },
  ];

  const mockPlans = [
    {
      lessonID: 501,
      studentName: "Lucas Vance",
      title: "Self-Regulation Math Lesson",
      status: "Active",
      dateCreated: "2026-09-12T10:00:00Z",
      goalArea: "Behavioral Skills",
      lessonContent: JSON.stringify([
        {
          objective_focus: "Independent Break Request",
          introduction: "Review feelings thermometer",
          core_activity: "Solve 5 math problems and use break card",
          assessment: "Student signals card before reaching red zone",
          materials_needed: ["Break card", "Worksheet"],
        },
      ]),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, email: "teacher@test.com" } });
    lessonPlansAPI.getDirectory.mockResolvedValue({
      directory: [
        {
          studentID: 101,
          studentName: "Lucas Vance",
          grade: 3,
          availableIEPs: [],
          availableGoals: [],
        },
      ],
    });
    studentsAPI.list.mockResolvedValue(mockStudents);
    lessonPlansAPI.list.mockResolvedValue(mockPlans);
    lessonPlansAPI.update.mockResolvedValue({ message: "Updated" });
    lessonPlansAPI.delete.mockResolvedValue({ message: "Deleted" });
  });

  it("switches to Manage tab and displays student selection grid", async () => {
    render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );

    // Click Manage tab
    const manageTabBtn = screen.getByRole("tab", { name: /Manage/i });
    expect(manageTabBtn).toBeInTheDocument();
    fireEvent.click(manageTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText("Manage Lesson Plans").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
      expect(screen.getByText("Maya Lin")).toBeInTheDocument();
    });
  });

  it("loads student's lesson plans with contextual View, Edit, and Delete action buttons", async () => {
    render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(lessonPlansAPI.list).toHaveBeenCalledWith({ studentID: 101 });
      expect(screen.getByText("Self-Regulation Math Lesson")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View Self-Regulation Math Lesson/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit Self-Regulation Math Lesson/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete Self-Regulation Math Lesson/i })).toBeInTheDocument();
    });
  });

  it("views full plan detail with phases, and provides Back, Edit, and Delete actions", async () => {
    render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByText("Self-Regulation Math Lesson")).toBeInTheDocument();
    });

    // Click View
    fireEvent.click(screen.getByRole("button", { name: /View Self-Regulation Math Lesson/i }));

    await waitFor(() => {
      expect(screen.getByText("Independent Break Request")).toBeInTheDocument();
      expect(screen.getByText("Review feelings thermometer")).toBeInTheDocument();
      expect(screen.getByText("Behavioral Skills")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Back to List/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit Plan/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete Plan/i })).toBeInTheDocument();
    });

    // Back to list
    fireEvent.click(screen.getByRole("button", { name: /Back to List/i }));

    await waitFor(() => {
      expect(screen.getByText("Self-Regulation Math Lesson")).toBeInTheDocument();
    });
  });

  it("edits a lesson plan title and status and persists via update API", async () => {
    render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit Self-Regulation Math Lesson/i })).toBeInTheDocument();
    });

    // Click Edit on row
    fireEvent.click(screen.getByRole("button", { name: /Edit Self-Regulation Math Lesson/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Lesson Plan")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/Plan Title/i);
    fireEvent.change(titleInput, { target: { value: "Updated Math Protocol" } });

    const statusSelect = screen.getByLabelText(/Status/i);
    fireEvent.change(statusSelect, { target: { value: "Archived" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(lessonPlansAPI.update).toHaveBeenCalledWith(501, {
        title: "Updated Math Protocol",
        status: "Archived",
      });
      expect(screen.getByText(/Lesson plan saved successfully/i)).toBeInTheDocument();
      expect(screen.getByText("Updated Math Protocol")).toBeInTheDocument();
    });
  });

  it("deletes a lesson plan with confirmation modal and removes from list", async () => {
    render(
      <MemoryRouter>
        <ManageLessonPlans />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Delete Self-Regulation Math Lesson/i })).toBeInTheDocument();
    });

    // Click Delete on row
    fireEvent.click(screen.getByRole("button", { name: /Delete Self-Regulation Math Lesson/i }));

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText("Delete Lesson Plan?")).toBeInTheDocument();
      expect(screen.getByText(/You are about to permanently delete/i)).toBeInTheDocument();
    });

    // Click Cancel first
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.queryByText("Delete Lesson Plan?")).not.toBeInTheDocument();
    expect(lessonPlansAPI.delete).not.toHaveBeenCalled();

    // Open delete modal again and confirm
    fireEvent.click(screen.getByRole("button", { name: /Delete Self-Regulation Math Lesson/i }));
    await waitFor(() => {
      expect(screen.getByText("Delete Lesson Plan?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Yes, Delete/i }));

    await waitFor(() => {
      expect(lessonPlansAPI.delete).toHaveBeenCalledWith(501);
      expect(screen.getByText(/was deleted/i)).toBeInTheDocument();
      expect(screen.queryByText("Self-Regulation Math Lesson")).not.toBeInTheDocument();
    });
  });
});
