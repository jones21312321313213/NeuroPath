import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ViewStudentRecords from "./ViewStudentRecords";
import { studentsAPI, iepAPI, trackingAPI } from "../api/client";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
    get: vi.fn(),
  },
  iepAPI: {
    listByStudent: vi.fn(),
    listGoalsByIep: vi.fn(),
  },
  trackingAPI: {
    exportStudentRecordPDF: vi.fn(),
  },
}));

describe("ViewStudentRecords Component", () => {
  const mockStudents = [
    { studentID: 101, name: "Alice Johnson", grade: 2, age: 8 },
    { studentID: 102, name: "Bob Smith", grade: 3, age: 9 },
  ];

  const mockStudentDetail = {
    data: {
      name: "Alice Johnson",
      age: 8,
      grade: 2,
      gender: "Female",
      diagnosis: "Autism Spectrum Disorder",
      asdBackground: "Mild sensory sensitivities",
      assessmentResult: "Baseline diagnostic reading at Grade 2 level",
      support_needs: "Visual schedule and structured routines",
      profileDetails: {
        studentName: "Alice Johnson",
        school: "Central Elementary",
        schoolYear: "2026-2027",
        birthdate: "2018-05-12",
        disabilityCategory: "Autism Spectrum Disorder",
        diagnosisDetails: "Mild sensory sensitivities",
        difficultyMarkers: ["Difficulty in Reading Comprehension"],
        presentEvaluation: "Baseline diagnostic reading at Grade 2 level",
        academicStrengths: "Strong spatial reasoning and visual memory",
        academicNeeds: "Requires structured phonics drills",
        parentalConcerns: "Struggles with reading confidence",
        curriculumImpact: "Affects independent word problem solving",
      },
    },
  };

  const mockIepList = [
    {
      iepID: 55,
      version: 1,
      formattedDate: "Sep 12, 2026",
      difficulties: "Difficulty in Reading Comprehension",
      learning_barriers: "Struggles with multi-step word problems",
      learning_facilitators: "Visual diagrams",
      learning_accommodations: "Extra time 20 mins",
      generatedDetails: {
        generatedAccommodations: "Provide visual cues and break tasks into steps.",
        barrierRows: [
          {
            difficulty: "Difficulty in Reading Comprehension",
            barrierQualifier: "Struggles with multi-step word problems",
            facilitator: "Visual diagrams",
            accommodation: "Extra time 20 mins",
          },
        ],
      },
    },
  ];

  const mockGoalList = [
    {
      goalID: 701,
      subject_category: "Reading",
      annual_goal: "Improve reading comprehension to Grade 2 level",
      objective_rows: [
        {
          rowID: 1,
          enroute_objectives: "Decode 2-syllable words",
          interventions_procedures: "Phonics flashcards daily",
          timeline_mins_session: "15 mins daily",
          individuals_responsible: "SPED Teacher",
          progress_instructional: "Satisfactory",
          remarks: "Progressing well",
        },
      ],
    },
  ];

  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, name: "Teacher Test" } });
    studentsAPI.list.mockResolvedValue(mockStudents);
    studentsAPI.get.mockResolvedValue(mockStudentDetail);
    iepAPI.listByStudent.mockResolvedValue(mockIepList);
    iepAPI.listGoalsByIep.mockResolvedValue(mockGoalList);

    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-uuid");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("renders the list of students and handles search filtering", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search student records/i);
    await user.type(searchInput, "Alice");

    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
  });

  it("navigates through Section A, Present Levels, and Section B & C", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Step 1: Section A
    expect(
      await screen.findByText("Section A: Personal Information"),
    ).toBeInTheDocument();
    expect(screen.getByText("Difficulty in Reading Comprehension")).toBeInTheDocument();

    // Navigate to Step 2: Present Levels
    const nextBtn = screen.getByRole("button", { name: /next →/i });
    await user.click(nextBtn);
    expect(
      await screen.findByText(
        "Present Levels of Academic Achievement and/or Functional Performance",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Strong spatial reasoning and visual memory"),
    ).toBeInTheDocument();

    // Navigate to Step 3: Section B & C
    const nextBtn2 = screen.getByRole("button", { name: /next →/i });
    await user.click(nextBtn2);
    expect(
      await screen.findByText("Section B: Difficulties, Barriers, and Enabling Supports"),
    ).toBeInTheDocument();
    expect(screen.getByText("Section C: Learner's Goals")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export pdf/i }),
    ).toBeInTheDocument();
  });

  it("clicking 'EXPORT PDF' fetches the PDF blob and triggers direct file download", async () => {
    const mockBlob = new Blob(["%PDF-mock-bytes"], { type: "application/pdf" });
    trackingAPI.exportStudentRecordPDF.mockResolvedValueOnce(mockBlob);

    const origCreateElement = document.createElement.bind(document);
    let createdAnchor = null;
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        createdAnchor = el;
        el.click = clickSpy;
      }
      return el;
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Go to Step 2
    const nextBtn = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn);

    // Go to Step 3
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const exportBtn = await screen.findByRole("button", { name: /export pdf/i });
    await user.click(exportBtn);

    // Verify trackingAPI was called with studentID 101
    await waitFor(() => {
      expect(trackingAPI.exportStudentRecordPDF).toHaveBeenCalledWith(101);
    });

    // Verify object URL was created from the returned blob
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

    // Verify anchor element download property was set with sanitized student name
    expect(createdAnchor).not.toBeNull();
    expect(createdAnchor.download).toBe("StudentRecord_Alice_Johnson.pdf");
    expect(createdAnchor.href).toBe("blob:http://localhost:3000/mock-uuid");
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Verify object URL was cleanly revoked to prevent memory leaks
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost:3000/mock-uuid",
    );

    createElementSpy.mockRestore();
  });

  it("displays loading feedback 'Exporting PDF...' and disables button while export is pending", async () => {
    let resolveExport;
    const exportPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    trackingAPI.exportStudentRecordPDF.mockReturnValueOnce(exportPromise);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Step 1 -> Step 2 -> Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const exportBtn = await screen.findByRole("button", { name: /export pdf/i });
    await user.click(exportBtn);

    // Loading state active
    expect(screen.getByRole("button", { name: /exporting pdf\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exporting pdf\.\.\./i })).toBeDisabled();

    // Resolve export
    const mockBlob = new Blob(["%PDF-mock"], { type: "application/pdf" });
    resolveExport(mockBlob);

    // Loading state clears
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /export pdf/i })).not.toBeDisabled();
    });
  });

  it("renders an accessible alert message when PDF export fails", async () => {
    trackingAPI.exportStudentRecordPDF.mockRejectedValueOnce(
      new Error("Network connection lost. Failed to export PDF."),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Step 1 -> Step 2 -> Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const exportBtn = await screen.findByRole("button", { name: /export pdf/i });
    await user.click(exportBtn);

    // Accessible error alert is shown
    const alertElement = await screen.findByRole("alert");
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveTextContent("Network connection lost. Failed to export PDF.");
    expect(screen.getByRole("button", { name: /export pdf/i })).not.toBeDisabled();
  });
});
