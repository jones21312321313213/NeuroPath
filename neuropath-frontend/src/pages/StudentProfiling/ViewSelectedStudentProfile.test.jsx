import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ViewSelectedStudentProfile from "./ViewSelectedStudentProfile";
import { studentsAPI } from "../../api/client";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api/client", () => ({
  studentsAPI: {
    get: vi.fn(),
  },
  iepAPI: {
    listByStudent: vi.fn().mockResolvedValue([]),
    listGoalsByStudent: vi.fn().mockResolvedValue([]),
    getInsights: vi.fn().mockResolvedValue([]),
  },
}));

describe("ViewSelectedStudentProfile useParams and routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads student profile using route parameter id", async () => {
    studentsAPI.get.mockResolvedValue({
      id: 42,
      name: "Sam Smith",
      age: 10,
      gender: "Male",
      grade_level: "5th Grade",
      guardian_name: "Parent Smith",
      guardian_contact: "555-0100",
      difficulty_markers: ["Difficulty in Communicating"],
      preferences: JSON.stringify({ preferredLearningStyle: "Visual" }),
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/students/42"]}>
        <Routes>
          <Route
            path="/dashboard/students/:id"
            element={<ViewSelectedStudentProfile />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(studentsAPI.get).toHaveBeenCalledWith("42");
      expect(screen.getByDisplayValue("Sam Smith")).toBeInTheDocument();
    });
  });

  it("navigates back to /dashboard/students when back button is clicked", async () => {
    studentsAPI.get.mockResolvedValue({
      id: 42,
      name: "Sam Smith",
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/students/42"]}>
        <Routes>
          <Route
            path="/dashboard/students/:id"
            element={<ViewSelectedStudentProfile />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Sam Smith")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "←" });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students");
  });

  it("navigates to /dashboard/students/:id/edit when UPDATE button is clicked", async () => {
    studentsAPI.get.mockResolvedValue({
      id: 42,
      name: "Sam Smith",
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard/students/42"]}>
        <Routes>
          <Route
            path="/dashboard/students/:id"
            element={<ViewSelectedStudentProfile />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Sam Smith")).toBeInTheDocument();
    });

    const updateButton = screen.getByRole("button", { name: "UPDATE" });
    await user.click(updateButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/42/edit");
  });

  it("supports legacy studentId and setActivePage props", async () => {
    studentsAPI.get.mockResolvedValue({
      id: 99,
      name: "Legacy Student",
    });
    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewSelectedStudentProfile
          studentId={99}
          setActivePage={setActivePage}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(studentsAPI.get).toHaveBeenCalledWith(99);
      expect(screen.getByDisplayValue("Legacy Student")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "←" });
    await user.click(backButton);
    expect(setActivePage).toHaveBeenCalledWith("view-student-profile");

    const updateButton = screen.getByRole("button", { name: "UPDATE" });
    await user.click(updateButton);
    expect(setActivePage).toHaveBeenCalledWith("update-student-profile");
  });

  it("displays error message when student fetch fails", async () => {
    studentsAPI.get.mockRejectedValue(new Error("Student not found"));

    render(
      <MemoryRouter initialEntries={["/dashboard/students/404"]}>
        <Routes>
          <Route
            path="/dashboard/students/:id"
            element={<ViewSelectedStudentProfile />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Student not found")).toBeInTheDocument();
    });
  });
});
