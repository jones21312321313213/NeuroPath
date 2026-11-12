import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IepCalendarPage from "../IepCalendarPage";
import { renderWithQueryClient } from "../../test/query-test-utils";
import * as queries from "../../hooks/queries";
import { ToastProvider } from "../../context/ToastContext";
import { AuthProvider } from "../../context/AuthContext";

vi.mock("../../hooks/queries", async () => {
  const actual = await vi.importActual("../../hooks/queries");
  return {
    ...actual,
    useStudents: vi.fn(),
    useScheduleEvents: vi.fn(),
    useCreateScheduleEvent: vi.fn(),
    useCompleteScheduleEvent: vi.fn(),
    useReopenScheduleEvent: vi.fn(),
    useDeleteScheduleEvent: vi.fn(),
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

describe("IepCalendarPage", () => {
  const mockStudents = [
    { studentID: 1, name: "Juan Dela Cruz" },
    { studentID: 2, name: "Maria Santos" },
  ];

  // We set due_date matching current year & month so events appear in the Month grid
  const now = new Date();
  const yearStr = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const testDate = `${yearStr}-${monthStr}-15`;

  const mockEvents = [
    {
      eventID: 10,
      title: "Month 1 Milestone Assessment",
      student_id: 1,
      student_name: "Juan Dela Cruz",
      event_type: "month_1_milestone",
      due_date: testDate,
      due_time: "10:00",
      status: "pending",
      priority: "medium",
      notes: "Number recognition targets",
      timeline_mins_session: "10 mins 5x/wk",
      iep_version: 1,
    },
    {
      eventID: 11,
      title: "Parent Consultation",
      student_id: 2,
      student_name: "Maria Santos",
      event_type: "custom_meeting",
      due_date: testDate,
      due_time: "14:00",
      status: "completed",
      priority: "high",
      notes: "Discuss sensory accommodations",
    },
  ];

  const mockCreateMutateAsync = vi.fn().mockResolvedValue({});
  const mockCompleteMutateAsync = vi.fn().mockResolvedValue({});
  const mockDeleteMutateAsync = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    queries.useStudents.mockReturnValue({ data: mockStudents });
    queries.useScheduleEvents.mockReturnValue({ data: mockEvents, isLoading: false });
    queries.useCreateScheduleEvent.mockReturnValue({ mutateAsync: mockCreateMutateAsync });
    queries.useCompleteScheduleEvent.mockReturnValue({ mutateAsync: mockCompleteMutateAsync });
    queries.useReopenScheduleEvent.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) });
    queries.useDeleteScheduleEvent.mockReturnValue({ mutateAsync: mockDeleteMutateAsync });
  });

  const renderPage = () => {
    return renderWithQueryClient(
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter>
            <IepCalendarPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>,
    );
  };

  it("renders page title, today's date, year navigation, and controls", () => {
    renderPage();
    expect(screen.getByText("Calendar & Schedules")).toBeInTheDocument();
    expect(screen.getByTestId("today-date-text")).toHaveTextContent("Today's Date:");
    expect(screen.getByTestId("prev-year-btn")).toBeInTheDocument();
    expect(screen.getByTestId("next-year-btn")).toBeInTheDocument();
    expect(screen.getByTestId("year-select")).toBeInTheDocument();
    expect(screen.getByTestId("prev-month-btn")).toBeInTheDocument();
    expect(screen.getByTestId("next-month-btn")).toBeInTheDocument();
    expect(screen.getByTestId("today-btn")).toBeInTheDocument();
    expect(screen.getByTestId("add-event-btn")).toBeInTheDocument();
  });

  it("navigates years using the year select dropdown", () => {
    renderPage();
    const yearSelect = screen.getByTestId("year-select");
    const targetYear = String(now.getFullYear() + 1);
    fireEvent.change(yearSelect, { target: { value: targetYear } });
    expect(yearSelect.value).toBe(targetYear);
  });

  it("opens Event Details Drawer when an event chip in the month grid is clicked", () => {
    renderPage();
    const eventChip = screen.getByTestId("event-pill-10");
    fireEvent.click(eventChip);

    expect(screen.getByTestId("event-details-drawer")).toBeInTheDocument();
    expect(screen.getAllByText("Number recognition targets").length).toBeGreaterThan(0);
    expect(screen.getByText("10 mins 5x/wk")).toBeInTheDocument();
    expect(screen.getByText(new RegExp("@10:00"))).toBeInTheDocument();
  });

  it("opens Add Custom Event modal and validates required time input before submission", async () => {
    renderPage();
    const addBtn = screen.getByTestId("add-event-btn");
    fireEvent.click(addBtn);

    expect(screen.getByTestId("add-custom-event-modal")).toBeInTheDocument();

    const titleInput = screen.getByTestId("event-title-input");
    fireEvent.change(titleInput, { target: { value: "Speech Assessment Session" } });

    const timeInput = screen.getByTestId("event-time-input");
    expect(timeInput).toBeRequired();
    fireEvent.change(timeInput, { target: { value: "11:30" } });

    const submitBtn = screen.getByTestId("save-event-submit-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Speech Assessment Session",
          due_time: "11:30",
        }),
      );
    });
  });

  it("opens custom ConfirmDeleteModal on delete click and invokes delete mutation", async () => {
    renderPage();
    const eventChip = screen.getByTestId("event-pill-10");
    fireEvent.click(eventChip);

    const openDeleteBtn = screen.getByTestId("open-delete-event-btn");
    fireEvent.click(openDeleteBtn);

    expect(screen.getByTestId("confirm-delete-modal")).toBeInTheDocument();
    expect(screen.getByText("Delete Scheduled Event?")).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith(10);
    });
  });

  it("toggles event completion status when Mark Done is clicked", async () => {
    renderPage();
    const eventChip = screen.getByTestId("event-pill-10");
    fireEvent.click(eventChip);

    const markDoneBtn = screen.getByTestId("toggle-event-complete-btn");
    fireEvent.click(markDoneBtn);

    await waitFor(() => {
      expect(mockCompleteMutateAsync).toHaveBeenCalledWith(10);
    });
  });
});
