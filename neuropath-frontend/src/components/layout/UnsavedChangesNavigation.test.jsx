import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ManageTeachingStrategies from "../../pages/ManageTeachingStrategies";
import ManageVisualAids from "../../pages/ManageVisualAids";
import ManageLessonPlans from "../../pages/ManageLessonPlans";
import { useAuth } from "../../context/AuthContext";
import { UnsavedChangesProvider } from "../../context/UnsavedChangesContext";
import {
  teachingStrategiesAPI,
  iepAPI,
  visualAidsAPI,
  studentsAPI,
  lessonPlansAPI,
} from "../../api/client";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  }),
}));

vi.mock("../../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
  },
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
    exportUrl: vi.fn(),
    exportPDF: vi.fn(),
  },
  visualAidsAPI: {
    listStudents: vi.fn(),
    generate: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
    listByStudent: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exportPDF: vi.fn(),
  },
  lessonPlansAPI: {
    getDirectory: vi.fn(),
    generate: vi.fn(),
    save: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function TestDashboardLayout() {
  return (
    <div className="app-layout">
      <Sidebar collapsed={false} />
      <div className="main-area">
        <Topbar breadcrumb={[{ label: "Dashboard" }]} />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

describe("Unsaved Changes Navigation Interception (Sidebar & Topbar)", () => {
  const mockStudents = [
    {
      studentID: 101,
      name: "Alex Rivera",
      studentName: "Alex Rivera",
      first_name: "Alex",
      last_name: "Rivera",
    },
  ];

  const mockRiveraGoals = [
    {
      goalID: 201,
      goalName: "Reading Fluency",
      annual_goal: "Alex will read 90 words per minute.",
      subject_category: "Language Arts",
      studentName: "Alex Rivera",
      studentID: 101,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
      logout: vi.fn(),
    });

    studentsAPI.list.mockResolvedValue(mockStudents);
    iepAPI.listByStudent.mockResolvedValue([
      { iepID: 10, version: 1, program_type: "Graded", accommodations: "Visual timer", difficulties: "Reading" },
    ]);
    iepAPI.listGoalsByIep.mockResolvedValue(mockRiveraGoals);
    iepAPI.listGoalsByStudent.mockResolvedValue(mockRiveraGoals);
    iepAPI.listLatestGoalsByStudent.mockResolvedValue(mockRiveraGoals);

    teachingStrategiesAPI.getDirectory.mockResolvedValue({
      directory: [
        {
          studentID: 101,
          studentName: "Alex Rivera",
          availableGoals: [],
        },
      ],
    });

    teachingStrategiesAPI.generate.mockResolvedValue({
      data: {
        teaching_strategy_id: 88,
        title: "Visual Cue Strategy for Reading",
        content: "### 1. Pre-reading preparation\nUse flashcards.",
        strategyType: "Standard",
        goalID: 201,
        goalName: "Reading Fluency",
        studentName: "Alex Rivera",
        studentID: 101,
      },
    });

    visualAidsAPI.generate.mockResolvedValue({
      visualAidID: "mock-temp-va",
      isDraft: true,
      title: "Brush Teeth Storyboard",
      steps: [
        { step_number: 1, caption: "Get toothbrush", image_url: "https://example.com/1.png" },
        { step_number: 2, caption: "Apply toothpaste", image_url: "https://example.com/2.png" },
        { step_number: 3, caption: "Brush gently", image_url: "https://example.com/3.png" },
      ],
    });
  });

  it("intercepts clicking 'Home' tab when on Manage Teaching Strategies with an unsaved generated strategy", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/strategies"]}>
        <UnsavedChangesProvider>
          <Routes>
            <Route path="/dashboard" element={<TestDashboardLayout />}>
              <Route index element={<div data-testid="home-page">Home Overview</div>} />
              <Route path="strategies" element={<ManageTeachingStrategies />} />
            </Route>
          </Routes>
        </UnsavedChangesProvider>
      </MemoryRouter>
    );

    // 1. Select student Alex Rivera
    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alex Rivera"));

    // 2. Select goal
    await waitFor(() => {
      expect(
        screen.getByText(/Language Arts — Alex will read 90 words per minute/)
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByText(/Language Arts — Alex will read 90 words per minute/)
    );

    // 3. Click Generate Strategy button
    const generateBtn = screen.getByRole("button", {
      name: /generate teaching strategy/i,
    });
    await user.click(generateBtn);

    // 4. Wait for draft strategy to be rendered
    await waitFor(() => {
      expect(screen.getByText("Visual Cue Strategy for Reading")).toBeInTheDocument();
    });

    // 5. Click "Home" in the Sidebar
    const homeNavBtn = screen.getByRole("button", { name: /^home$/i });
    await user.click(homeNavBtn);

    // 6. Confirmation modal MUST appear!
    expect(
      await screen.findByRole("heading", { name: /unsaved teaching strategy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You have an unsaved teaching strategy/i)
    ).toBeInTheDocument();

    // User should NOT have navigated to Home yet
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();

    // 7. Click "No, Stay"
    const stayBtn = screen.getByRole("button", { name: /no, stay/i });
    await user.click(stayBtn);

    // 8. Modal closes, still on strategies page with draft intact
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /unsaved teaching strategy/i })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Visual Cue Strategy for Reading")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();

    // 9. Click "Home" again
    await user.click(homeNavBtn);

    expect(
      await screen.findByRole("heading", { name: /unsaved teaching strategy/i })
    ).toBeInTheDocument();

    // 10. Click "Yes, Leave Without Saving"
    const leaveBtn = screen.getByRole("button", {
      name: /yes, leave without saving/i,
    });
    await user.click(leaveBtn);

    // 11. Now navigation succeeds and Home page renders!
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });

  it("intercepts clicking 'Home' tab when on Manage Visual Aids with an unsaved generated visual aid", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/visual-aids"]}>
        <UnsavedChangesProvider>
          <Routes>
            <Route path="/dashboard" element={<TestDashboardLayout />}>
              <Route index element={<div data-testid="home-page">Home Overview</div>} />
              <Route path="visual-aids" element={<ManageVisualAids />} />
            </Route>
          </Routes>
        </UnsavedChangesProvider>
      </MemoryRouter>
    );

    // 1. Wait for student card to appear and select Alex Rivera
    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Alex Rivera"));

    // 2. Select goal
    await waitFor(() => {
      expect(
        screen.getByText(/Alex will read 90 words per minute/i)
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByText(/Alex will read 90 words per minute/i)
    );

    // 3. Click Generate Visual Aid
    const generateBtn = screen.getByRole("button", {
      name: /generate visual aid/i,
    });
    await user.click(generateBtn);

    // 4. Wait for generated visual aid to display
    await waitFor(() => {
      expect(screen.getByText("Brush Teeth Storyboard")).toBeInTheDocument();
    });

    // 5. Click "Home" in the Sidebar
    const homeNavBtn = screen.getByRole("button", { name: /^home$/i });
    await user.click(homeNavBtn);

    // 6. Confirmation modal must appear!
    expect(
      await screen.findByRole("heading", { name: /unsaved visual aid/i })
    ).toBeInTheDocument();

    // 7. Click "No, Stay"
    const stayBtn = screen.getByRole("button", { name: /no, stay/i });
    await user.click(stayBtn);

    // 8. Modal disappears, draft is preserved
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /unsaved visual aid/i })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Brush Teeth Storyboard")).toBeInTheDocument();

    // 9. Click "Home" again
    await user.click(homeNavBtn);

    // 10. Click "Yes, Leave Without Saving"
    const leaveBtn = await screen.findByRole("button", {
      name: /yes, leave without saving/i,
    });
    await user.click(leaveBtn);

    // 11. Navigation succeeds
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });

  it("intercepts clicking 'Home' tab when on Manage Lesson Plans with an unsaved generated lesson plan", async () => {
    const user = userEvent.setup();

    const mockLucasGoals = [
      {
        goalID: 301,
        goalName: "Break Request",
        annual_goal: "Lucas will request a break using a break card 4 out of 5 opportunities.",
        subject_category: "Behavioral Skills",
        studentName: "Lucas Vance",
        studentID: 101,
      },
    ];

    lessonPlansAPI.getDirectory.mockResolvedValue({
      directory: [
        {
          studentID: 101,
          studentName: "Lucas Vance",
          grade: 3,
          availableIEPs: [
            {
              iepID: 202,
              version: 2,
              createdDate: "September 10, 2026",
              label: "IEP Version 2 (September 10, 2026)",
              accommodations: "Sensory room breaks",
            },
          ],
          availableGoals: [],
        },
      ],
    });

    iepAPI.listGoalsByIep.mockResolvedValue(mockLucasGoals);
    iepAPI.listGoalsByStudent.mockResolvedValue(mockLucasGoals);
    iepAPI.listLatestGoalsByStudent.mockResolvedValue(mockLucasGoals);

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

    render(
      <MemoryRouter initialEntries={["/dashboard/lessons"]}>
        <UnsavedChangesProvider>
          <Routes>
            <Route path="/dashboard" element={<TestDashboardLayout />}>
              <Route index element={<div data-testid="home-page">Home Overview</div>} />
              <Route path="lessons" element={<ManageLessonPlans />} />
            </Route>
          </Routes>
        </UnsavedChangesProvider>
      </MemoryRouter>
    );

    // 1. Select student Lucas Vance
    await waitFor(() => {
      expect(screen.getByText("Lucas Vance")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Lucas Vance"));

    // 2. Select goal
    await waitFor(() => {
      expect(screen.getByText("Behavioral Skills")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Behavioral Skills"));

    // 3. Click Generate Lesson Plan button
    const generateBtn = screen.getByRole("button", {
      name: /generate lesson plan/i,
    });
    await user.click(generateBtn);

    // 4. Wait for draft plan to render
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /confirm & save plan/i })
      ).toBeInTheDocument();
    });

    // 5. Click "Home" in the Sidebar
    const homeNavBtn = screen.getByRole("button", { name: /^home$/i });
    await user.click(homeNavBtn);

    // 6. Confirmation modal must appear!
    expect(
      await screen.findByRole("heading", { name: /unsaved lesson plan/i })
    ).toBeInTheDocument();

    // 7. Click "No, Stay"
    const stayBtn = screen.getByRole("button", { name: /no, stay/i });
    await user.click(stayBtn);

    // 8. Modal disappears, draft is preserved
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /unsaved lesson plan/i })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /confirm & save plan/i })
    ).toBeInTheDocument();

    // 9. Click "Home" again
    await user.click(homeNavBtn);

    // 10. Click "Yes, Leave Without Saving"
    const leaveBtn = await screen.findByRole("button", {
      name: /yes, leave without saving/i,
    });
    await user.click(leaveBtn);

    // 11. Navigation succeeds
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
  });
});
