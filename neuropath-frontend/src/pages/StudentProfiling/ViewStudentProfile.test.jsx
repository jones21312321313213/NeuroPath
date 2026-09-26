import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ViewStudentProfile from "./ViewStudentProfile";
import { studentsAPI } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { renderWithQueryClient } from "../../test/query-test-utils";

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
    delete: vi.fn(),
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

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Alice Cooper")).toBeInTheDocument();
    expect(screen.getByText("Bob Marley")).toBeInTheDocument();
    expect(screen.getByText("2 students")).toBeInTheDocument();
  });

  it("handles paginated results response structure", async () => {
    studentsAPI.list.mockResolvedValueOnce({
      results: [
        { studentID: 30, name: "Charlie Brown", grade: 3, gender: "Male", age: 8 },
      ],
    });

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Charlie Brown")).toBeInTheDocument();
    expect(screen.getByText("1 student")).toBeInTheDocument();
  });

  it("navigates to /dashboard/students/:id when View profile button is clicked", async () => {
    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 10, name: "Alice Cooper", grade: 2, gender: "Female", age: 7 },
    ]);
    const setSelectedStudentId = vi.fn();
    const setActivePage = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
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

    renderWithQueryClient(
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

    renderWithQueryClient(
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

  it("displays ErrorState with retry button when studentsAPI fails and retries on click", async () => {
    studentsAPI.list.mockRejectedValueOnce(new Error("Failed to fetch"));
    const user = userEvent.setup();

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 10, name: "Alice Cooper", grade: 2 },
    ]);

    await user.click(retryBtn);
    expect(await screen.findByText("Alice Cooper")).toBeInTheDocument();
  });

  it("sorts students correctly using sort selector", async () => {
    studentsAPI.list.mockResolvedValueOnce([
      { studentID: 1, name: "Charlie", grade: 3, age: 9 },
      { studentID: 2, name: "Alice", grade: 1, age: 7 },
      { studentID: 3, name: "Bob", grade: 2, age: 8 },
    ]);
    const user = userEvent.setup();

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    await screen.findByText("Alice");
    const sortSelect = screen.getByRole("combobox", { name: /sort students by/i });

    // Select Name (Z – A)
    await user.selectOptions(sortSelect, "name_desc");

    const studentCards = screen.getAllByText(/(Charlie|Bob|Alice)/, {
      selector: "p.vsp-card-name",
    });
    expect(studentCards[0]).toHaveTextContent("Charlie");
    expect(studentCards[1]).toHaveTextContent("Bob");
    expect(studentCards[2]).toHaveTextContent("Alice");
  });

  it("paginates students list when student count exceeds pageSize", async () => {
    const manyStudents = Array.from({ length: 10 }, (_, i) => ({
      studentID: i + 1,
      name: `Student ${String(i + 1).padStart(2, "0")}`,
      grade: 1,
      age: 6,
    }));
    studentsAPI.list.mockResolvedValueOnce(manyStudents);
    const user = userEvent.setup();

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Student 01")).toBeInTheDocument();
    expect(screen.getByText("Student 06")).toBeInTheDocument();
    // Student 07 should be on page 2
    expect(screen.queryByText("Student 07")).not.toBeInTheDocument();

    // Pagination navigation should be rendered
    const nav = screen.getByRole("navigation", { name: /pagination/i });
    expect(nav).toBeInTheDocument();

    const page2Btn = screen.getByRole("button", { name: "Page 2" });
    await user.click(page2Btn);

    expect(screen.getByText("Student 07")).toBeInTheDocument();
    expect(screen.queryByText("Student 01")).not.toBeInTheDocument();
  });

  it("opens delete confirmation modal and calls delete when confirmed", async () => {
    studentsAPI.list.mockResolvedValue([
      { studentID: 10, name: "Alice Cooper", grade: 2, gender: "Female", age: 7 },
    ]);
    studentsAPI.delete.mockResolvedValueOnce({ message: "Student profile successfully deleted." });
    const user = userEvent.setup();

    renderWithQueryClient(
      <MemoryRouter>
        <ViewStudentProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText("Alice Cooper")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete alice cooper's profile/i });
    await user.click(deleteBtn);

    // Modal dialog is shown
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /yes, delete/i });
    await user.click(confirmBtn);

    expect(studentsAPI.delete).toHaveBeenCalledWith(10);
  });
});
