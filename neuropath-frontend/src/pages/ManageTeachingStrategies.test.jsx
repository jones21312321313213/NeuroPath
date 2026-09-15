import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ManageTeachingStrategies from "./ManageTeachingStrategies";
import { teachingStrategiesAPI, iepAPI } from "../api/client";
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
  iepAPI: {
    listByStudent: vi.fn(),
    listGoalsByIep: vi.fn(),
    listLatestGoalsByStudent: vi.fn(),
    listGoalsByStudent: vi.fn(),
  },
  teachingStrategiesAPI: {
    getDirectory: vi.fn(),
    generate: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    listForDelete: vi.fn(),
    delete: vi.fn(),
    exportUrl: vi.fn((id) => `/export/${id}`),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ManageTeachingStrategies - Issue #158 Decoupled Save", () => {
  const mockRiveraIeps = [
    {
      iepID: 10,
      version: 1,
      createdDate: "2026-09-01T10:00:00Z",
      formattedDate: "September 1, 2026",
      program_type: "Graded",
      accommodations: "Visual timer",
      difficulties: "Reading",
    },
  ];

  const mockRiveraGoals = [
    {
      goalID: 201,
      goalName: "Reading Fluency",
      annual_goal: "Alex will read 90 words per minute.",
      subject_category: "Language Arts",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, name: "Teacher Test" },
    });

    teachingStrategiesAPI.getDirectory.mockResolvedValue({
      directory: [
        {
          studentID: 101,
          studentName: "Alex Rivera",
          availableGoals: [],
        },
      ],
    });

    iepAPI.listByStudent.mockResolvedValue(mockRiveraIeps);
    iepAPI.listGoalsByIep.mockResolvedValue(mockRiveraGoals);
    iepAPI.listLatestGoalsByStudent.mockResolvedValue(mockRiveraGoals);
  });

  it("generates strategy draft without automatically saving to the database", async () => {
    const user = userEvent.setup();
    teachingStrategiesAPI.generate.mockResolvedValue({
      message: "Teaching strategy successfully generated.",
      data: {
        title: "Strategy for: Reading Fluency",
        strategyContent: "Tactical reading aloud in 5-minute sprints.",
        goalID: 201,
        goalName: "Reading Fluency",
        studentName: "Alex Rivera",
        studentID: 101,
      },
    });

    render(
      <MemoryRouter>
        <ManageTeachingStrategies />
      </MemoryRouter>,
    );

    // 1. Select student
    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alex Rivera"));

    // 2. Select goal and generate
    await waitFor(() => {
      expect(screen.getByText(/Language Arts — Alex will read 90 words per minute/)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/Language Arts — Alex will read 90 words per minute/));

    const generateBtn = screen.getByRole("button", { name: /Generate Teaching Strategy/i });
    await user.click(generateBtn);

    // 3. Verify draft is rendered
    await waitFor(() => {
      expect(screen.getByText("Strategy for: Reading Fluency")).toBeInTheDocument();
      expect(screen.getByText("Tactical reading aloud in 5-minute sprints.")).toBeInTheDocument();
    });

    // 4. Verify generate was called but save was NOT called
    expect(teachingStrategiesAPI.generate).toHaveBeenCalledWith({ goalID: 201 });
    expect(teachingStrategiesAPI.save).not.toHaveBeenCalled();
  });

  it("allows regenerating multiple times without saving to the database", async () => {
    const user = userEvent.setup();
    teachingStrategiesAPI.generate
      .mockResolvedValueOnce({
        message: "Teaching strategy successfully generated.",
        data: {
          title: "Draft 1",
          strategyContent: "Draft 1 content",
          goalID: 201,
        },
      })
      .mockResolvedValueOnce({
        message: "Teaching strategy successfully generated.",
        data: {
          title: "Draft 2",
          strategyContent: "Draft 2 regenerated content",
          goalID: 201,
        },
      });

    render(
      <MemoryRouter>
        <ManageTeachingStrategies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alex Rivera"));

    await waitFor(() => {
      expect(screen.getByText(/Language Arts — Alex will read 90 words per minute/)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/Language Arts — Alex will read 90 words per minute/));

    await user.click(screen.getByRole("button", { name: /Generate Teaching Strategy/i }));

    await waitFor(() => {
      expect(screen.getByText("Draft 1")).toBeInTheDocument();
    });

    // Click Regenerate
    const regenBtn = screen.getByRole("button", { name: /🔄 Regenerate/i });
    await user.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText("Draft 2")).toBeInTheDocument();
      expect(screen.getByText("Draft 2 regenerated content")).toBeInTheDocument();
    });

    expect(teachingStrategiesAPI.generate).toHaveBeenCalledTimes(2);
    expect(teachingStrategiesAPI.save).not.toHaveBeenCalled();
  });

  it("explicitly saves strategy when user clicks Confirm & Save Strategy", async () => {
    const user = userEvent.setup();
    teachingStrategiesAPI.generate.mockResolvedValue({
      message: "Teaching strategy successfully generated.",
      data: {
        title: "Strategy for: Reading Fluency",
        strategyContent: "Tactical reading aloud in 5-minute sprints.",
        goalID: 201,
      },
    });

    teachingStrategiesAPI.save.mockResolvedValue({
      message: "Teaching Strategy successfully saved.",
      data: {
        strategyID: 55,
        iep_goal: 201,
        title: "Strategy for: Reading Fluency",
        strategyContent: "Tactical reading aloud in 5-minute sprints.",
      },
    });

    render(
      <MemoryRouter>
        <ManageTeachingStrategies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alex Rivera"));

    await waitFor(() => {
      expect(screen.getByText(/Language Arts — Alex will read 90 words per minute/)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/Language Arts — Alex will read 90 words per minute/));

    await user.click(screen.getByRole("button", { name: /Generate Teaching Strategy/i }));

    await waitFor(() => {
      expect(screen.getByText("Strategy for: Reading Fluency")).toBeInTheDocument();
    });

    // Click Confirm & Save Strategy
    const saveBtn = screen.getByRole("button", { name: /Confirm & Save Strategy/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(teachingStrategiesAPI.save).toHaveBeenCalledWith({
        iep_goal: 201,
        title: "Strategy for: Reading Fluency",
        strategyContent: "Tactical reading aloud in 5-minute sprints.",
      });
      expect(screen.getByText(/Strategy saved successfully to student profile/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /✓ Saved/i })).toBeDisabled();
    });
  });
});

describe("ManageTeachingStrategies Multi-IEP Selection", () => {
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
    teachingStrategiesAPI.getDirectory.mockResolvedValue({ directory: mockStudentsDirectory });
    teachingStrategiesAPI.list.mockResolvedValue([]);
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
        <ManageTeachingStrategies />
      </MemoryRouter>
    );
  }

  it("renders student selector and loads IEP versions upon selecting a student", async () => {
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
      expect(screen.getByText(/Behavioral Skills/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Academic Engagement/i)).toBeInTheDocument();
      expect(screen.getByText(/Lucas will stay on-task with visual timer/i)).toBeInTheDocument();
    });
  });

  it("generates teaching strategy from the goal of the selected IEP version", async () => {
    teachingStrategiesAPI.generate.mockResolvedValue({
      message: "Success",
      data: {
        strategyID: 99,
        title: "Strategy for: Behavioral Skills",
        strategyContent: "**Core Strategy Overview:** Use sensory cards.",
        formattedDate: "September 14, 2026",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText(/Behavioral Skills/i)).toBeInTheDocument();
    });

    // Auto-selected badge is rendered since Version 2 has only 1 goal
    expect(screen.getByTestId("goal-auto-selected-badge")).toBeInTheDocument();
    expect(screen.getByText(/Goal automatically selected from Version 2/i)).toBeInTheDocument();

    // Click Generate Teaching Strategy directly without needing to click the goal item
    const generateBtn = screen.getByRole("button", { name: /Generate Teaching Strategy/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(teachingStrategiesAPI.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          goalID: 302,
        })
      );
    });
  });

  it("does not auto-select when an IEP version has multiple goals, requiring manual selection", async () => {
    const mockMultiGoals = [
      {
        goalID: 501,
        goalName: "Social Turn-Taking",
        subject_category: "Social / Interpersonal Skills",
        annual_goal: "Lucas will take turns during board games.",
      },
      {
        goalID: 502,
        goalName: "Emotional Regulation",
        subject_category: "Behavioral Skills",
        annual_goal: "Lucas will identify emotions using visual cards.",
      },
    ];
    iepAPI.listGoalsByIep.mockResolvedValue(mockMultiGoals);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance").closest(".ts-student-card"));

    await waitFor(() => {
      expect(screen.getByText(/Social \/ Interpersonal Skills/i)).toBeInTheDocument();
      expect(screen.getByText(/Behavioral Skills/i)).toBeInTheDocument();
    });

    // Auto-selected badge should NOT appear
    expect(screen.queryByTestId("goal-auto-selected-badge")).not.toBeInTheDocument();

    // Generate button should be disabled initially
    const generateBtn = screen.getByRole("button", { name: /Generate Teaching Strategy/i });
    expect(generateBtn).toBeDisabled();

    // Select the second goal
    const goalItem = screen.getByText(/Social \/ Interpersonal Skills/i).closest(".ts-goal-item");
    fireEvent.click(goalItem);

    // Button should now be enabled
    expect(generateBtn).not.toBeDisabled();
  });
});
