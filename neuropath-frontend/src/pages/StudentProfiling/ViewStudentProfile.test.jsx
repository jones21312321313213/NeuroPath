import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ViewStudentProfile from "./ViewStudentProfile";
import { studentsAPI } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

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
    list: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("ViewStudentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, name: "Teacher User" } });
  });

  it("loads and displays students list", async () => {
    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 10, name: "Alice Cooper", grade: 2, gender: "Female", age: 7, diagnosis: "ASD" },
      { studentID: 20, name: "Bob Marley", grade: 4, gender: "Male", age: 9, diagnosis: "ADHD" },
    ]);

    render(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Alice Cooper")).toBeInTheDocument();
    expect(screen.getByText("Bob Marley")).toBeInTheDocument();
    expect(screen.getByText("2 students")).toBeInTheDocument();
  });

  it("navigates to /dashboard/students/:id when View profile button is clicked", async () => {
    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 10, name: "Alice Cooper", grade: 2, gender: "Female", age: 7 },
    ]);
    const setSelectedStudentId = vi.fn();
    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewStudentProfile
          setSelectedStudentId={setSelectedStudentId}
          setActivePage={setActivePage}
        />
      </MemoryRouter>
    );

    const viewBtn = await screen.findByRole("button", { name: /view profile/i });
    await user.click(viewBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(10);
    expect(setActivePage).toHaveBeenCalledWith("view-student-detail");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/10");
  });

  it("navigates to /dashboard/students/create when empty state Create Student button is clicked", async () => {
    studentsAPI.list.mockResolvedValueOnce([]);
    const setActivePage = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewStudentProfile setActivePage={setActivePage} />
      </MemoryRouter>
    );

    const createBtn = await screen.findByRole("button", { name: /create student/i });
    await user.click(createBtn);

    expect(setActivePage).toHaveBeenCalledWith("create-student-profile");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/create");
  });

  it("filters student list when search query is typed", async () => {
    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 10, name: "Alice Cooper" },
      { studentID: 20, name: "Bob Marley" },
    ]);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    await screen.findByText("Alice Cooper");

    const searchInput = screen.getByPlaceholderText(/search by student name/i);
    await user.type(searchInput, "Alice");

    expect(screen.getByText("Alice Cooper")).toBeInTheDocument();
    expect(screen.queryByText("Bob Marley")).not.toBeInTheDocument();
  });

  it("displays error message when studentsAPI fails", async () => {
    studentsAPI.list.mockRejectedValueOnce(new Error("Failed to fetch"));

    render(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
  });
});
