import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UpcomingDeadlinesWidget from "../UpcomingDeadlinesWidget";
import { renderWithQueryClient } from "../../../test/query-test-utils";
import * as queries from "../../../hooks/queries";
import { ToastProvider } from "../../../context/ToastContext";

vi.mock("../../../hooks/queries", async () => {
  const actual = await vi.importActual("../../../hooks/queries");
  return {
    ...actual,
    useUpcomingDeadlines: vi.fn(),
    useCompleteScheduleEvent: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("UpcomingDeadlinesWidget", () => {
  const mockMutateAsync = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    queries.useCompleteScheduleEvent.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  const renderWidget = (props = {}) => {
    return renderWithQueryClient(
      <ToastProvider>
        <MemoryRouter>
          <UpcomingDeadlinesWidget {...props} />
        </MemoryRouter>
      </ToastProvider>,
    );
  };

  it("renders loading state when fetching deadlines", () => {
    queries.useUpcomingDeadlines.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    renderWidget();
    expect(screen.getByTestId("deadlines-loading")).toBeInTheDocument();
  });

  it("renders empty state when there are no upcoming deadlines", () => {
    queries.useUpcomingDeadlines.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    renderWidget();
    expect(screen.getByTestId("deadlines-empty")).toBeInTheDocument();
    expect(screen.getByText("All IEP Milestones Up to Date!")).toBeInTheDocument();
  });

  it("renders deadline items with urgency tags and student names", () => {
    const mockDeadlines = [
      {
        eventID: 101,
        title: "Month 1 Milestone Assessment",
        student_id: 12,
        student_name: "Juan Dela Cruz",
        due_date: "2026-11-12",
        is_overdue: true,
        days_remaining: -1,
        timeline_mins_session: "10 mins 5x/wk",
      },
      {
        eventID: 102,
        title: "Quarterly Review & Regression Check",
        student_id: 14,
        student_name: "Maria Santos",
        due_date: "2026-11-15",
        is_overdue: false,
        days_remaining: 3,
      },
    ];

    queries.useUpcomingDeadlines.mockReturnValue({
      data: mockDeadlines,
      isLoading: false,
      isError: false,
    });

    renderWidget();
    expect(screen.getByText("Month 1 Milestone Assessment")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Quarterly Review & Regression Check")).toBeInTheDocument();
    expect(screen.getByText("In 3 days")).toBeInTheDocument();
    expect(screen.getByText("👤 Juan Dela Cruz")).toBeInTheDocument();
  });

  it("navigates to Outcome Monitoring pre-filtered to student when Record Progress is clicked", () => {
    const mockDeadlines = [
      {
        eventID: 201,
        title: "Month 2 Milestone Review",
        student_id: 42,
        student_name: "Carlo Mendoza",
        due_date: "2026-11-14",
        is_overdue: false,
        days_remaining: 2,
      },
    ];

    queries.useUpcomingDeadlines.mockReturnValue({
      data: mockDeadlines,
      isLoading: false,
      isError: false,
    });

    renderWidget();
    const recordBtn = screen.getByRole("button", { name: /Record Progress/i });
    fireEvent.click(recordBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/monitoring?studentId=42");
  });

  it("triggers complete mutation when Mark Done is clicked", async () => {
    const mockDeadlines = [
      {
        eventID: 301,
        title: "Check-in Task",
        student_id: 12,
        student_name: "Juan Dela Cruz",
        due_date: "2026-11-12",
        is_overdue: false,
        days_remaining: 0,
      },
    ];

    queries.useUpcomingDeadlines.mockReturnValue({
      data: mockDeadlines,
      isLoading: false,
      isError: false,
    });

    renderWidget();
    const markDoneBtn = screen.getByRole("button", { name: /Mark Done/i });
    fireEvent.click(markDoneBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith(301);
  });
});
