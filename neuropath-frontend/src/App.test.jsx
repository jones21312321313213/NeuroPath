import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "./test/query-test-utils";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { studentsAPI, iepAPI } from "./api/client";
import { useStudents, useIepDashboardStats } from "./hooks/queries";

vi.mock("./context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock("./api/client", () => ({
  studentsAPI: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 4, name: "Alex Johnson" }),
  },
  iepAPI: {
    dashboardStats: vi.fn().mockResolvedValue({ active_ieps: 0, ai_insights: 0 }),
    listByStudent: vi.fn().mockResolvedValue([]),
    listGoalsByStudent: vi.fn().mockResolvedValue([]),
  },
  lessonPlansAPI: {
    getDirectory: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
  },
  visualAidsAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  teachingStrategiesAPI: {
    getDirectory: vi.fn().mockResolvedValue([]),
  },
  trackingAPI: {
    getProgressDashboard: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("./components/ui/CountUp", () => ({
  default: ({ to }) => <span>{to}</span>,
}));

vi.mock("./components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("App First-Login Tutorial Modal Integration", () => {
  const mockMarkTutorialComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TeacherTutorialModal when user has_completed_tutorial is false", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to neuropath/i)).toBeInTheDocument();
  });

  it("does NOT render TeacherTutorialModal when user has_completed_tutorial is true", () => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "returningteacher@example.com",
        has_completed_tutorial: true,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument();
  });

  it("calls markTutorialComplete when Skip Walkthrough is clicked", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: {
        id: 1,
        email: "newteacher@example.com",
        has_completed_tutorial: false,
      },
      isAuthenticated: true,
      markTutorialComplete: mockMarkTutorialComplete,
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /skip walkthrough/i }));
    expect(mockMarkTutorialComplete).toHaveBeenCalledTimes(1);
  });
});

describe("App Router Nested Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe", has_completed_tutorial: true },
    });
  });

  it("renders Overview when navigating to /dashboard", async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-section")).toBeInTheDocument();
  });

  it("renders Student Profiles list when navigating to /dashboard/students", async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard/students"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("Student Profiles")).toBeInTheDocument();
  });

  it("renders Create Student Profile when navigating to /dashboard/students/create", async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard/students/create"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /create student profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Section A: Personal Information/i)).toBeInTheDocument();
  });

  it("renders Lesson Plans when navigating to /dashboard/lessons", async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard/lessons"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /manage lesson plans/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });
});

describe("App Route Navigation Client-Side Caching Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe", has_completed_tutorial: true },
      isAuthenticated: true,
    });
  });

  it("navigates between Overview and Student Profiles rendering cached data immediately with 0 extra fetch calls due to 5-minute staleTime", async () => {
    const user = userEvent.setup();
    const mockStudents = [
      { studentID: 101, name: "Charlie Davis", grade: "3rd", diagnosis: "ADHD" },
      { studentID: 102, name: "Dana Evans", grade: "4th", diagnosis: "Dyslexia" },
    ];
    studentsAPI.list.mockResolvedValue(mockStudents);
    iepAPI.dashboardStats.mockResolvedValue({ active_ieps: 2, ai_insights: 1 });

    renderWithQueryClient(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    // Initial load on /dashboard: Overview requests students and stats
    expect(await screen.findByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument();
    expect(screen.getByText("Total Students")).toBeInTheDocument();

    // Verify Overview derived student count from query
    await waitFor(() => {
      const metricCard = screen.getByText("Total Students").closest(".glance-stat-col");
      expect(metricCard).toHaveTextContent("2");
    });
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);
    expect(studentsAPI.list).toHaveBeenCalledWith(1);

    // Navigate from Overview to Student Profiles via 'View All Students' button
    const viewAllBtn = screen.getByRole("button", { name: /view all students/i });
    await user.click(viewAllBtn);

    // ViewStudentProfile mounts and renders cached student profiles immediately
    expect(await screen.findByText("Student Profiles")).toBeInTheDocument();
    expect(screen.getByText("Charlie Davis")).toBeInTheDocument();
    expect(screen.getByText("Dana Evans")).toBeInTheDocument();
    expect(screen.getByText("2 students")).toBeInTheDocument();

    // Caching verification: studentsAPI.list was NOT called again (0 extra calls)
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);

    // Navigate back to Overview (/dashboard) via Sidebar Home button
    const homeBtn = screen.getByRole("button", { name: /^home$/i });
    await user.click(homeBtn);

    // Overview mounts again and displays cached stats immediately with zero network requests
    expect(await screen.findByText("Classroom setup workflow")).toBeInTheDocument();
    const metricCardAfterReturn = screen.getByText("Total Students").closest(".glance-stat-col");
    expect(metricCardAfterReturn).toHaveTextContent("2");

    // Network request count remains exactly 1 across full round-trip route transitions
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);

    // Re-navigate to Student Profiles to verify persistent client-side cache
    const viewAllBtnSecond = screen.getByRole("button", { name: /view all students/i });
    await user.click(viewAllBtnSecond);

    expect(await screen.findByText("Student Profiles")).toBeInTheDocument();
    expect(screen.getByText("Charlie Davis")).toBeInTheDocument();
    expect(screen.getByText("Dana Evans")).toBeInTheDocument();
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);
  });
});

describe("App Query Request Deduplication for Concurrent Mounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates parallel student query requests and triggers fetch only once", async () => {
    const mockStudents = [
      { studentID: 201, name: "Jordan Smith" },
      { studentID: 202, name: "Taylor Swift" },
    ];
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    studentsAPI.list.mockReturnValue(pendingPromise);

    function ParallelConsumerA() {
      const { data, isLoading } = useStudents(42);
      if (isLoading) return <div data-testid="consumer-a-loading">Loading A</div>;
      return <div data-testid="consumer-a">{data?.length} students in A</div>;
    }

    function ParallelConsumerB() {
      const { data, isLoading } = useStudents(42);
      if (isLoading) return <div data-testid="consumer-b-loading">Loading B</div>;
      return <div data-testid="consumer-b">{data?.length} students in B</div>;
    }

    function ParallelConsumerContainer() {
      return (
        <div>
          <ParallelConsumerA />
          <ParallelConsumerB />
        </div>
      );
    }

    renderWithQueryClient(<ParallelConsumerContainer />);

    // Both components mounted concurrently and are waiting for data
    expect(screen.getByTestId("consumer-a-loading")).toBeInTheDocument();
    expect(screen.getByTestId("consumer-b-loading")).toBeInTheDocument();

    // Verify TanStack Query deduplicated the requests into exactly 1 network call
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);
    expect(studentsAPI.list).toHaveBeenCalledWith(42);

    // Resolve the single in-flight promise
    resolvePromise(mockStudents);

    // Both components receive resolved data simultaneously
    expect(await screen.findByTestId("consumer-a")).toHaveTextContent("2 students in A");
    expect(screen.getByTestId("consumer-b")).toHaveTextContent("2 students in B");

    // Network request count remains strictly 1
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);
  });

  it("deduplicates parallel IEP dashboard stats queries across concurrent widgets", async () => {
    const mockStats = { active_ieps: 15, ai_insights: 6 };
    let resolveStats;
    const pendingStatsPromise = new Promise((resolve) => {
      resolveStats = resolve;
    });
    iepAPI.dashboardStats.mockReturnValue(pendingStatsPromise);

    function StatsWidgetA() {
      const { data, isLoading } = useIepDashboardStats();
      if (isLoading) return <div>Loading Stats A</div>;
      return <div data-testid="widget-stats-a">IEPs: {data?.active_ieps}</div>;
    }

    function StatsWidgetB() {
      const { data, isLoading } = useIepDashboardStats();
      if (isLoading) return <div>Loading Stats B</div>;
      return <div data-testid="widget-stats-b">Insights: {data?.ai_insights}</div>;
    }

    function ParallelStatsContainer() {
      return (
        <div>
          <StatsWidgetA />
          <StatsWidgetB />
        </div>
      );
    }

    renderWithQueryClient(<ParallelStatsContainer />);

    expect(screen.getByText("Loading Stats A")).toBeInTheDocument();
    expect(screen.getByText("Loading Stats B")).toBeInTheDocument();

    // Deduplication verified: exactly 1 network request triggered
    expect(iepAPI.dashboardStats).toHaveBeenCalledTimes(1);

    resolveStats(mockStats);

    expect(await screen.findByTestId("widget-stats-a")).toHaveTextContent("IEPs: 15");
    expect(screen.getByTestId("widget-stats-b")).toHaveTextContent("Insights: 6");

    expect(iepAPI.dashboardStats).toHaveBeenCalledTimes(1);
  });
});
