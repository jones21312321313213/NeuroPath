import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopbarNotificationBell from "../TopbarNotificationBell";
import { renderWithQueryClient } from "../../../test/query-test-utils";
import * as queries from "../../../hooks/queries";

vi.mock("../../../hooks/queries", async () => {
  const actual = await vi.importActual("../../../hooks/queries");
  return {
    ...actual,
    useUpcomingDeadlines: vi.fn(),
  };
});

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, email: "teacher@test.com" } }),
  AuthProvider: ({ children }) => children,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("TopbarNotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  const renderBell = () => {
    return renderWithQueryClient(
      <MemoryRouter>
        <TopbarNotificationBell />
      </MemoryRouter>,
    );
  };

  it("renders notification bell button without badge when no deadlines exist", () => {
    queries.useUpcomingDeadlines.mockReturnValue({ data: [] });
    renderBell();

    const bellBtn = screen.getByTestId("topbar-notification-bell-btn");
    expect(bellBtn).toBeInTheDocument();
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });

  it("renders count badge and pulsing indicator when overdue deadlines exist", () => {
    queries.useUpcomingDeadlines.mockReturnValue({
      data: [
        { eventID: 1, title: "Overdue Task", is_overdue: true },
        { eventID: 2, title: "Upcoming Task", is_overdue: false },
      ],
    });
    renderBell();

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("2");
    expect(badge.className).toContain("animate-pulse");
  });

  it("opens dropdown on bell click and navigates to notifications page on footer click", () => {
    queries.useUpcomingDeadlines.mockReturnValue({
      data: [{ eventID: 1, title: "Quarterly Review", is_overdue: false, priority: "high" }],
    });
    renderBell();

    const bellBtn = screen.getByTestId("topbar-notification-bell-btn");
    fireEvent.click(bellBtn);

    const dropdown = screen.getByTestId("notifications-dropdown");
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByText("Quarterly Review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open Full Schedule/i })).not.toBeInTheDocument();

    const notificationsLinkBtn = screen.getByRole("button", { name: /View All Notifications/i });
    fireEvent.click(notificationsLinkBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/notifications");
  });

  it("removes the badge when the bell is clicked indicating notifications have been seen", () => {
    queries.useUpcomingDeadlines.mockReturnValue({
      data: [{ eventID: 1, title: "Quarterly Review", is_overdue: true }],
    });
    renderBell();

    expect(screen.getByTestId("notification-badge")).toBeInTheDocument();
    const bellBtn = screen.getByTestId("topbar-notification-bell-btn");

    // Click to open and mark as seen
    fireEvent.click(bellBtn);

    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });
});
