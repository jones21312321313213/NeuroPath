import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpdateStudentProfile from "./UpdateStudentProfile";
import { studentsAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  studentsAPI: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

const mockStudent = {
  id: "student-123",
  name: "Maria Clara",
  age: 9,
  grade: 3,
  gender: "Female",
  diagnosis: "Autism Spectrum Disorder",
  support_needs: "Visual schedule",
  assessmentResult: "Standard evaluation",
  profileDetails: {
    school: "Central School",
    schoolYear: "2025 - 2026",
    learnerName: "Maria Clara",
    birthdate: "05-12-2017",
    disabilityCategory: "Autism Spectrum Disorder",
    diagnosisDetails: "ASD Level 1",
    difficultyMarkers: ["Difficulty in Seeing"],
    presentEvaluation: "Good auditory comprehension",
    academicStrengths: "Math calculation",
    academicNeeds: "Reading comprehension",
    parentalConcerns: "Social interaction",
    curriculumImpact: "Requires visual aids",
  },
};

describe("UpdateStudentProfile Help Text & Difficulty Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders intro banner and difficulty help text when loaded", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    expect(
      await screen.findByText(/NeuroPath uses this form for AI IEP drafts; fuller answers usually mean better drafts/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Needed before Generate IEP/i)
    ).toBeInTheDocument();
  });

  it("blocks advancing to Step 2 if all difficulty markers are unchecked", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    await screen.findByDisplayValue("Maria Clara");

    const diffCheckbox = screen.getByLabelText(/Difficulty in Seeing/i);
    expect(diffCheckbox).toBeChecked();
    fireEvent.click(diffCheckbox); // uncheck

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Please select at least one difficulty marker \(needed before Generate IEP\)\./i)
    ).toBeInTheDocument();
  });

  it("shows AI goal drafting help texts in Step 2", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    render(<UpdateStudentProfile studentId="student-123" onBack={vi.fn()} />);

    await screen.findByDisplayValue("Maria Clara");

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    expect(
      await screen.findByText(/Present Levels of Academic Achievement/i)
    ).toBeInTheDocument();

    const aiHelpTexts = screen.getAllByText(/Used by AI when drafting goals/i);
    expect(aiHelpTexts.length).toBeGreaterThanOrEqual(4);
  });
});
