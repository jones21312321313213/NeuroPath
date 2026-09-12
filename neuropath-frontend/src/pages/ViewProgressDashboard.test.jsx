import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ViewProgressDashboard from "./ViewProgressDashboard";
import { studentsAPI, trackingAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
  },
  trackingAPI: {
    getProgressDashboard: vi.fn(),
    recordProgress: vi.fn(),
  },
}));

describe("ViewProgressDashboard", () => {
  const mockStudents = [
    { studentID: 1, name: "Alice Wonderland", grade: 3, age: 8 },
    { studentID: 2, name: "Bob Builder", grade: 4, age: 9 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 101, name: "Test Teacher" } });
  });

  it("loads and displays the student list", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Alice Wonderland")).toBeInTheDocument();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
  });

  it("filters students based on search input", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Wonderland");
    const searchInput = screen.getByPlaceholderText(/search student records/i);
    await user.type(searchInput, "Alice");

    expect(screen.getByText("Alice Wonderland")).toBeInTheDocument();
    expect(screen.queryByText("Bob Builder")).not.toBeInTheDocument();
  });

  it("shows empty state when student has no progress records", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    trackingAPI.getProgressDashboard.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Wonderland");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(trackingAPI.getProgressDashboard).toHaveBeenCalledWith(1);
    });

    expect(
      await screen.findByText("No progress data found for this student."),
    ).toBeInTheDocument();
  });

  it("renders subjects and navigates to subject detail with chart", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    const mockSubjects = [
      {
        id: 10,
        name: "Communication Skills",
        progress: 85,
        status: "On Track",
        lastUpdated: "May 15, 2026",
        currentLevel: "Proficient",
        chartData: [75, 85],
        months: ["Apr", "May"],
      },
    ];
    trackingAPI.getProgressDashboard.mockResolvedValueOnce(mockSubjects);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Wonderland");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    expect(await screen.findByText("Communication Skills")).toBeInTheDocument();

    const viewProgressBtn = screen.getByRole("button", { name: /view progress/i });
    await user.click(viewProgressBtn);

    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("On Track")).toBeInTheDocument();
    expect(screen.getByText("May 15, 2026", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Current Level")).toBeInTheDocument();

    // Navigate back to subject list
    const backBtn = screen.getByRole("button", { name: /← back/i });
    await user.click(backBtn);

    expect(screen.getByText("Alice Wonderland – Subjects")).toBeInTheDocument();

    // Navigate back to students list
    const backToStudentsBtn = screen.getByRole("button", { name: /← back to students/i });
    await user.click(backToStudentsBtn);

    expect(screen.getByText("List of Students")).toBeInTheDocument();
  });

  it("renders Executive KPI Summary Cards with aggregate mastery rate and goal counts", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    const mockSubjects = [
      {
        id: 10,
        name: "Mathematics",
        progress: 80,
        status: "On Track",
        lastUpdated: "May 10, 2026",
        currentLevel: "Developing",
        chartData: [80],
        months: ["May"],
      },
      {
        id: 11,
        name: "Reading Comprehension",
        progress: 60,
        status: "Needs Support",
        lastUpdated: "May 12, 2026",
        currentLevel: "Emerging",
        chartData: [60],
        months: ["May"],
      },
    ];
    trackingAPI.getProgressDashboard.mockResolvedValueOnce(mockSubjects);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Wonderland");
    await user.click(screen.getAllByRole("button", { name: /select/i })[0]);

    // Check KPI Cards
    expect(await screen.findByText("Overall Mastery Rate")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument(); // (80 + 60) / 2
    expect(screen.getByText("Goals on Track")).toBeInTheDocument();
    expect(screen.getByText("Needs Support")).toBeInTheDocument();
    expect(screen.getByText("Last Evaluated")).toBeInTheDocument();
    expect(screen.getByText("May 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Log Progress/i })).toBeInTheDocument();
  });

  it("opens RecordProgressModal, logs progress, and dynamically refreshes subjects", async () => {
    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    const initialSubjects = [
      {
        id: 10,
        name: "Mathematics",
        progress: 70,
        status: "On Track",
        lastUpdated: "May 10, 2026",
        currentLevel: "Developing",
        chartData: [70],
        months: ["May"],
      },
    ];
    const updatedSubjects = [
      {
        id: 10,
        name: "Mathematics",
        progress: 85,
        status: "On Track",
        lastUpdated: "May 15, 2026",
        currentLevel: "Proficient",
        chartData: [70, 85],
        months: ["May", "May"],
      },
      {
        id: 12,
        name: "Social Skills",
        progress: 90,
        status: "On Track",
        lastUpdated: "May 15, 2026",
        currentLevel: "Advanced",
        chartData: [90],
        months: ["May"],
      },
    ];
    trackingAPI.getProgressDashboard
      .mockResolvedValueOnce(initialSubjects)
      .mockResolvedValueOnce(updatedSubjects);
    trackingAPI.recordProgress.mockResolvedValueOnce({
      progressID: 12,
      subjectName: "Social Skills",
      performanceScore: 90,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewProgressDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Wonderland");
    await user.click(screen.getAllByRole("button", { name: /select/i })[0]);

    expect(await screen.findByText("Mathematics")).toBeInTheDocument();

    // Click + Log Progress button
    const logProgressBtn = screen.getByRole("button", { name: /\+ Log Progress/i });
    await user.click(logProgressBtn);

    expect(screen.getByText(/Log Student Progress/i)).toBeInTheDocument();

    // Select Social Skills domain and submit score
    const subjectSelect = screen.getByLabelText(/Domain \/ Subject/i);
    await user.selectOptions(subjectSelect, "Social Skills");

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, "90");

    const saveBtn = screen.getByRole("button", { name: /Save Progress/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(trackingAPI.recordProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          studentID: 1,
          subjectName: "Social Skills",
          performanceScore: 90,
        }),
      );
    });

    // Verify dashboard refreshed and new subject appears
    expect(await screen.findByText("Social Skills")).toBeInTheDocument();
  });
});

