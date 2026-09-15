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

    // Select the goal
    const goalItem = screen.getByText(/Behavioral Skills/i).closest(".ts-goal-item");
    fireEvent.click(goalItem);

    // Click Generate Teaching Strategy
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
});

describe("ManageTeachingStrategies - Unified Manage Interface (Issue #161)", () => {
  const mockStrategies = [
    {
      strategyID: 11,
      title: "Reading Comprehension Scaffolding",
      strategyContent: "Use graphic organizers and chunked passages.",
      formattedDate: "September 12, 2026",
      goalName: "Reading Fluency",
      studentID: 101,
      studentName: "Lucas Vance",
    },
    {
      strategyID: 12,
      title: "Math Visual Aids",
      strategyContent: "Utilize manipulatives for multi-digit addition.",
      formattedDate: "September 14, 2026",
      goalName: "Math Problem Solving",
      studentID: 101,
      studentName: "Lucas Vance",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, email: "teacher@test.com" } });
    teachingStrategiesAPI.getDirectory.mockResolvedValue({
      directory: [
        {
          studentID: 101,
          studentName: "Lucas Vance",
          grade: 3,
        },
        {
          studentID: 102,
          studentName: "Maya Lin",
          grade: 4,
        },
      ],
    });
    teachingStrategiesAPI.list.mockResolvedValue(mockStrategies);
    teachingStrategiesAPI.update.mockResolvedValue({ message: "Teaching Strategy updated successfully." });
    teachingStrategiesAPI.delete.mockResolvedValue({ message: "Teaching Strategy deleted successfully." });
  });

  function renderComponent() {
    return render(
      <MemoryRouter>
        <ManageTeachingStrategies />
      </MemoryRouter>
    );
  }

  it("switches to Manage tab and displays student selection grid", async () => {
    renderComponent();

    const manageTabBtn = screen.getByRole("tab", { name: /Manage/i });
    expect(manageTabBtn).toBeInTheDocument();
    fireEvent.click(manageTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText("Manage Teaching Strategies").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
      expect(screen.getByText("Maya Lin")).toBeInTheDocument();
    });
  });

  it("loads student's teaching strategies with contextual View, Edit, and Delete row actions", async () => {
    renderComponent();

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(teachingStrategiesAPI.list).toHaveBeenCalledWith(101);
      expect(screen.getByText("Reading Comprehension Scaffolding")).toBeInTheDocument();
      expect(screen.getByText("Math Visual Aids")).toBeInTheDocument();
    });

    // Check contextual action buttons on rows
    const viewButtons = screen.getAllByRole("button", { name: /View/i });
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });

    expect(viewButtons.length).toBeGreaterThanOrEqual(2);
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("views full strategy detail and allows navigation back to list", async () => {
    renderComponent();

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByText("Reading Comprehension Scaffolding")).toBeInTheDocument();
    });

    // Click View on the first strategy
    const viewButtons = screen.getAllByRole("button", { name: /View/i });
    fireEvent.click(viewButtons[0]);

    // Detail view should display content and contextual actions
    await waitFor(() => {
      expect(screen.getByText("Use graphic organizers and chunked passages.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Edit Strategy/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete Strategy/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Export PDF/i })).toBeInTheDocument();
    });

    // Click Back to List
    fireEvent.click(screen.getByRole("button", { name: /Back to List/i }));

    await waitFor(() => {
      expect(screen.getByText("Reading Comprehension Scaffolding")).toBeInTheDocument();
      expect(screen.getByText("Math Visual Aids")).toBeInTheDocument();
    });
  });

  it("edits strategy title and content in-place and saves updates", async () => {
    const user = userEvent.setup();
    renderComponent();

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByText("Reading Comprehension Scaffolding")).toBeInTheDocument();
    });

    // Click Edit on the first strategy row
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    // Edit form should be open
    await waitFor(() => {
      expect(screen.getByText("Edit Teaching Strategy")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/Strategy Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Strategy Title");

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(teachingStrategiesAPI.update).toHaveBeenCalledWith(11, {
        title: "Updated Strategy Title",
        strategyContent: "Use graphic organizers and chunked passages.",
      });
      expect(screen.getByText(/Teaching strategy saved successfully/i)).toBeInTheDocument();
    });
  });

  it("opens delete confirmation modal and confirms deletion", async () => {
    const user = userEvent.setup();
    renderComponent();

    fireEvent.click(screen.getByRole("tab", { name: /Manage/i }));

    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Lucas Vance"));

    await waitFor(() => {
      expect(screen.getByText("Reading Comprehension Scaffolding")).toBeInTheDocument();
    });

    // Click Delete on the first strategy row
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    await user.click(deleteButtons[0]);

    // Modal dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Strategy?")).toBeInTheDocument();
      expect(screen.getByText(/You are about to permanently delete/i)).toBeInTheDocument();
    });

    // Confirm delete inside modal
    const confirmBtn = screen.getByRole("button", { name: /Yes, Delete/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(teachingStrategiesAPI.delete).toHaveBeenCalledWith(11);
      expect(screen.getByText(/was deleted/i)).toBeInTheDocument();
    });
  });
});

