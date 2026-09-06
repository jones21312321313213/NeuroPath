import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateStudentProfile from "./CreateStudentProfile";
import { studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  studentsAPI: {
    create: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("CreateStudentProfile next-step actions", () => {
  const onBack = vi.fn();
  const setActivePage = vi.fn();
  const setSelectedStudentId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, name: "Test Teacher" } });
  });

  async function fillAndSubmitValidForm(user) {
    // Step 1 fields
    await user.type(
      screen.getByPlaceholderText("Enter student name"),
      "Alex Smith",
    );
    await user.type(screen.getByPlaceholderText("Enter age"), "8");
    await user.type(screen.getByPlaceholderText("Enter grade level"), "3");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /^gender:/i }),
      "Male",
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2 fields
    await user.type(
      screen.getByPlaceholderText(/the learner fails to finish tasks/i),
      "Recent evaluation details...",
    );
    await user.type(
      screen.getByPlaceholderText(/the learner can spell random words/i),
      "Strong academic strengths...",
    );
    await user.type(
      screen.getByPlaceholderText(/needs structured routines/i),
      "Specific learner needs...",
    );
    await user.type(
      screen.getByPlaceholderText(/write concerns shared by the parent/i),
      "Parental concerns notes...",
    );
    await user.type(
      screen.getByPlaceholderText(/the learner has difficulty concentrating/i),
      "Curriculum impact notes...",
    );

    await user.click(screen.getByRole("button", { name: /submit/i }));
  }

  it("shows success modal with primary, secondary, and tertiary next-step CTAs upon successful creation", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    expect(await screen.findByText(/Profile Created!/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Smith/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate iep for this student/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view student profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add another student/i }),
    ).toBeInTheDocument();
  });

  it("navigates to Generate IEP with student context when primary CTA is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const generateBtn = await screen.findByRole("button", {
      name: /generate iep for this student/i,
    });
    await user.click(generateBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("generate-iep");
  });

  it("navigates to View Profile with student context when secondary CTA is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const viewBtn = await screen.findByRole("button", {
      name: /view student profile/i,
    });
    await user.click(viewBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("view-student-detail");
  });

  it("resets the form and returns to step 1 for batch entry when 'Add another student' is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <CreateStudentProfile
        onBack={onBack}
        setActivePage={setActivePage}
        setSelectedStudentId={setSelectedStudentId}
      />,
    );

    await fillAndSubmitValidForm(user);

    const addAnotherBtn = await screen.findByRole("button", {
      name: /add another student/i,
    });
    await user.click(addAnotherBtn);

    expect(screen.queryByText(/Profile Created!/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter student name")).toHaveValue("");
  });
});
