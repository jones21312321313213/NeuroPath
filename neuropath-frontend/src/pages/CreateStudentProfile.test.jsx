import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateStudentProfile from "./CreateStudentProfile";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, email: "teacher@test.com" },
    token: "token123",
  }),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    create: vi.fn(),
  },
}));

function renderComponent() {
  return render(<CreateStudentProfile onBack={vi.fn()} />);
}

describe("CreateStudentProfile Help Text & Difficulty Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the intro banner and difficulty help text on Step 1", () => {
    renderComponent();
    expect(
      screen.getByText(
        /NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts/i
      )
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
        /Please select at least one difficulty marker \(needed before Generate IEP\)\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Section A: Personal Information/i)
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
      await screen.findByText(/Present Levels of Academic Achievement/i)
    ).toBeInTheDocument();

    const aiHelpTexts = screen.getAllByText(/Used by AI when drafting goals/i);
    expect(aiHelpTexts.length).toBeGreaterThanOrEqual(4);
  });
});
