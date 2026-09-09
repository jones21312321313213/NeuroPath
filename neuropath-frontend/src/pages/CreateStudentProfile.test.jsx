import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateStudentProfile from "./CreateStudentProfile";
import { studentsAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/client", () => ({
  studentsAPI: {
    create: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("CreateStudentProfile Help Text & Difficulty Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, email: "teacher@test.com" } });
  });

  function renderComponent() {
    return render(
      <MemoryRouter>
        <CreateStudentProfile onBack={vi.fn()} />
      </MemoryRouter>
    );
  }

  it("renders the intro banner and difficulty help text on Step 1", () => {
    renderComponent();
    expect(
      screen.getByText(
        /NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Needed before Generate IEP/i)).toBeInTheDocument();
  });

  it("blocks proceeding to Step 2 if difficulty markers are empty", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/Enter student name/i), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter age/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter grade level/i), {
      target: { value: "3" },
    });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], {
      target: { value: "Male" },
    });

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(
        /Please select at least one difficulty marker \(needed before Generate IEP\)\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Section A: Personal Information/i),
    ).toBeInTheDocument();
  });

  it("proceeds to Step 2 when difficulty markers are selected and shows AI goal drafting help texts", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/Enter student name/i), {
      target: { value: "Juan Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter age/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter grade level/i), {
      target: { value: "3" },
    });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], {
      target: { value: "Male" },
    });

    const diffCheckbox = screen.getByLabelText(/Difficulty in Seeing/i);
    fireEvent.click(diffCheckbox);

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Present Levels of Academic Achievement/i),
    ).toBeInTheDocument();

    const aiHelpTexts = screen.getAllByText(/Used by AI when drafting goals/i);
    expect(aiHelpTexts.length).toBeGreaterThanOrEqual(4);
  });
});

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
    fireEvent.change(screen.getByPlaceholderText("Enter student name"), {
      target: { value: "Alex Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter age"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter grade level"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /^gender:/i }), {
      target: { value: "Male" },
    });
    fireEvent.click(screen.getByLabelText(/Difficulty in Seeing/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 2 fields
    fireEvent.change(
      screen.getByPlaceholderText(/the learner fails to finish tasks/i),
      { target: { value: "Recent evaluation details..." } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/the learner can spell random words/i),
      { target: { value: "Strong academic strengths..." } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/needs structured routines/i),
      { target: { value: "Specific learner needs..." } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/write concerns shared by the parent/i),
      { target: { value: "Parental concerns notes..." } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/the learner has difficulty concentrating/i),
      { target: { value: "Curriculum impact notes..." } },
    );

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
  }

  it("shows success modal with primary, secondary, and tertiary next-step CTAs upon successful creation", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CreateStudentProfile
          onBack={onBack}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      </MemoryRouter>,
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
      <MemoryRouter>
        <CreateStudentProfile
          onBack={onBack}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      </MemoryRouter>,
    );

    await fillAndSubmitValidForm(user);

    const generateBtn = await screen.findByRole("button", {
      name: /generate iep for this student/i,
    });
    await user.click(generateBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("generate-iep");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/101/iep");
  });

  it("navigates to View Profile with student context when secondary CTA is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CreateStudentProfile
          onBack={onBack}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      </MemoryRouter>,
    );

    await fillAndSubmitValidForm(user);

    const viewBtn = await screen.findByRole("button", {
      name: /view student profile/i,
    });
    await user.click(viewBtn);

    expect(setSelectedStudentId).toHaveBeenCalledWith(101);
    expect(setActivePage).toHaveBeenCalledWith("view-student-detail");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students/101");
  });

  it("resets the form and returns to step 1 for batch entry when 'Add another student' is clicked", async () => {
    studentsAPI.create.mockResolvedValueOnce({
      studentID: 101,
      name: "Alex Smith",
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CreateStudentProfile
          onBack={onBack}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      </MemoryRouter>,
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

  it("navigates back to /dashboard/students when top/step 1 back button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CreateStudentProfile
          onBack={onBack}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      </MemoryRouter>,
    );

    const backBtn = screen.getByRole("button", { name: "BACK" });
    await user.click(backBtn);

    expect(onBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/students");
  });
});
