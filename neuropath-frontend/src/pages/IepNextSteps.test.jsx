import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../test/query-test-utils";
import IEPGenerationPage from "./IepGenerationPage";
import Overview from "./Overview";
import { iepAPI, studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

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

    render(
      <MemoryRouter>
        <IEPGenerationPage mode="view" setActivePage={setActivePage} />
      </MemoryRouter>,
    );

    // Type into student search input
    const searchInput = screen.getByPlaceholderText(/type student name/i);
    await user.type(searchInput, "Ethan");

    // Click student result from dropdown
    const studentBtn = await screen.findByRole("button", {
      name: /ethan carter/i,
    });
    await user.click(studentBtn);

    // Verify next steps card is removed from View IEP
    expect(
      screen.queryByText(/Instructional Support: Use this IEP in the Classroom/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create lesson plan/i }),
    ).not.toBeInTheDocument();
  });

  it("removes inline Next Steps result block from Generate IEP tab and redirects to View IEP upon Accept & Save IEP (#267)", async () => {
    const mockStudent = {
      studentID: 10,
      name: "Ethan Carter",
      grade: 3,
      age: 8,
      difficulty: "Sensory Processing",
      parental_consent_obtained: true,
    };
    const savedIep = {
      iepID: 105,
      studentID: 10,
      studentName: "Ethan Carter",
      version: 1,
      formattedDate: "2026-09-01",
    };

    studentsAPI.list.mockResolvedValue([mockStudent]);
    iepAPI.listByStudent.mockResolvedValue([savedIep]);
    iepAPI.listGoalsByIep.mockResolvedValue([]);
    iepAPI.save.mockResolvedValue(savedIep);
    iepAPI.generateGoalsFromIep.mockResolvedValue({
      goals: [
        {
          subject_category: "Functional Academic Skills",
          goalName: "Functional Academic Skills",
          annual_goal: "Ethan will complete visual schedule tasks independently.",
          target_metric: "80% accuracy",
          objective_rows: [],
        },
      ],
    });
    iepAPI.saveGoal.mockResolvedValue({ goalID: 11 });

    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <IEPGenerationPage
          mode="generate"
          initialStudentId={10}
          setActivePage={setActivePage}
          cooldownSeconds={0}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText("NEXT"));
    await user.selectOptions(screen.getByRole("combobox"), "Functional Academic Skills");
    await user.click(screen.getByRole("button", { name: /generate final iep/i }));

    await screen.findByText("Review Generated IEP Draft");
    await user.click(screen.getByRole("button", { name: /accept & save iep/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/iep/view", {
        state: { studentId: 10, iepId: 105 },
      });
      expect(setActivePage).toHaveBeenCalledWith("view-iep");
    });

    // Inline post-generation Next Steps & result banner must not be rendered
    expect(screen.queryByText("IEP Generated Successfully!")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Next Steps: Classroom Tools & Instructional Support/i),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".iep-generation-result")).toBeNull();

    // Redirected View IEP panel is rendered with the newly saved IEP
    await waitFor(() => {
      expect(screen.getByText("View IEP")).toBeInTheDocument();
      expect(
        screen.getByText("Ethan will complete visual schedule tasks independently."),
      ).toBeInTheDocument();
    });
  });

  it("reflects readiness in Overview step 3 when active IEPs exist", async () => {
    studentsAPI.list.mockResolvedValue([{ id: 101, name: "Student A" }]);
    iepAPI.dashboardStats.mockResolvedValue({
      active_ieps: 2,
      ai_insights: 1,
    });

    const setActivePage = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <MemoryRouter>
        <Overview setActivePage={setActivePage} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(iepAPI.dashboardStats).toHaveBeenCalled();
    });

    const step3 = screen.getByTestId("getting-started-step-3");
    await waitFor(() => {
      const step3Btn = within(step3).getByRole("button", {
        name: /open tools|use tools/i,
      });
      expect(step3Btn).toBeEnabled();
    });

    const step3Btn = within(step3).getByRole("button", {
      name: /open tools|use tools/i,
    });
    await user.click(step3Btn);
    expect(setActivePage).toHaveBeenCalledWith("/dashboard/lessons");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/lessons");
  });
});
