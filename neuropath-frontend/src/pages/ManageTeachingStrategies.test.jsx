import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ManageTeachingStrategies from "./ManageTeachingStrategies";
import { iepAPI, teachingStrategiesAPI } from "../api/client";
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
    listLatestGoalsByStudent: vi.fn(),
    listGoalsByStudent: vi.fn(),
  },
  teachingStrategiesAPI: {
    getDirectory: vi.fn(),
    generate: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    exportUrl: vi.fn((id) => `/export/${id}`),
    update: vi.fn(),
    listForDelete: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ManageTeachingStrategies - Issue #158 Decoupled Save", () => {
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

    iepAPI.listLatestGoalsByStudent.mockResolvedValue([
      {
        goalID: 201,
        goalName: "Reading Fluency",
        annual_goal: "Alex will read 90 words per minute.",
        subject_category: "Language Arts",
      },
    ]);
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
