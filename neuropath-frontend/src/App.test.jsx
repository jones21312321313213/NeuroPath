import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { studentsAPI, iepAPI } from "./api/client";

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

describe("App Router Nested Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
    });
  });

  it("renders Overview when navigating to /dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument();
    expect(screen.getByTestId("getting-started-section")).toBeInTheDocument();
  });

  it("renders Student Profiles list when navigating to /dashboard/students", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/students"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("Student Profiles")).toBeInTheDocument();
  });

  it("renders Create Student Profile when navigating to /dashboard/students/create", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/students/create"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /create student profile/i })).toBeInTheDocument();
    expect(screen.getByText(/Section A: Personal Information/i)).toBeInTheDocument();
  });

  it("renders Lesson Plans when navigating to /dashboard/lessons", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/lessons"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /manage lesson plans/i })).toBeInTheDocument();
  });
});
