import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotificationsPage from "../NotificationsPage";
import { renderWithQueryClient } from "../../test/query-test-utils";
import * as queries from "../../hooks/queries";

vi.mock("../../hooks/queries", async () => {
  const actual = await vi.importActual("../../hooks/queries");
  return {
    ...actual,
    useNotifications: vi.fn(),
    useMarkNotificationRead: vi.fn(),
    useMarkAllNotificationsRead: vi.fn(),
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

describe("NotificationsPage (Issue #311)", () => {
  const mockMarkReadMutate = vi.fn();
  const mockMarkAllReadMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queries.useMarkNotificationRead.mockReturnValue({
      mutate: mockMarkReadMutate,
      isPending: false,
    });
    queries.useMarkAllNotificationsRead.mockReturnValue({
      mutate: mockMarkAllReadMutate,
      isPending: false,
    });
  });

  const makeNotifications = (count) =>
    Array.from({ length: count }, (_, idx) => ({
      notificationID: idx + 1,
      title: `Month 1 Milestone Assessment #${idx + 1}`,
      message: `Upcoming in ${idx === 0 ? 3 : 2} days`,
      priority: idx === 0 ? "high" : idx === 1 ? "low" : "medium",
      trigger_type: idx === 0 ? "due_today" : "advance_notice",
      lead_days: idx === 0 ? 3 : idx === 1 ? 1 : 2,
      due_date: "2026-12-01",
      student_id: 101,
      student_name: "Juan Dela Cruz",
      is_read: idx >= 2,
      created_at: "2026-11-17T10:00:00Z",
    }));

  const renderPage = () =>
    renderWithQueryClient(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

  it("renders summary counters, notification history rows, and 10-per-page pagination", () => {
    queries.useNotifications.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        count: 15,
        page_size: 10,
        current_page: 1,
        total_pages: 2,
        unread_count: 2,
        high_priority_count: 1,
        results: makeNotifications(10),
      },
    });

    renderPage();

    expect(screen.getByTestId("notif-total-count")).toHaveTextContent("15");
    expect(screen.getByTestId("notif-unread-count")).toHaveTextContent("2");
    expect(screen.getByTestId("notif-high-count")).toHaveTextContent("1");

    const pagination = screen.getByTestId("notifications-pagination");
    expect(pagination).toHaveTextContent("1–10 of 15 notifications (10 per page)");

    // Navigate to page 2
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(queries.useNotifications).toHaveBeenLastCalledWith({
      page: 2,
      status: "all",
      priority: "all",
    });
  });

  it("filters by status and priority while resetting to page 1", () => {
    queries.useNotifications.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        count: 15,
        total_pages: 2,
        unread_count: 2,
        high_priority_count: 1,
        results: makeNotifications(10),
      },
    });

    renderPage();

    // Advance to page 2 first
    fireEvent.click(screen.getByRole("button", { name: "Next →" }));
    expect(queries.useNotifications).toHaveBeenLastCalledWith({
      page: 2,
      status: "all",
      priority: "all",
    });

    // Click Unread filter -> resets to page 1
    fireEvent.click(screen.getByRole("button", { name: "Unread" }));
    expect(queries.useNotifications).toHaveBeenLastCalledWith({
      page: 1,
      status: "unread",
      priority: "all",
    });

    // Select High priority
    fireEvent.change(screen.getByLabelText("Priority:"), {
      target: { value: "high" },
    });
    expect(queries.useNotifications).toHaveBeenLastCalledWith({
      page: 1,
      status: "unread",
      priority: "high",
    });
  });

  it("triggers mark read and mark all read mutations", () => {
    queries.useNotifications.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        count: 2,
        total_pages: 1,
        unread_count: 2,
        high_priority_count: 1,
        results: makeNotifications(2),
      },
    });

    renderPage();

    const markReadButtons = screen.getAllByRole("button", { name: "Mark Read" });
    fireEvent.click(markReadButtons[0]);
    expect(mockMarkReadMutate).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /Mark All as Read/i }));
    expect(mockMarkAllReadMutate).toHaveBeenCalledTimes(1);
  });
});
