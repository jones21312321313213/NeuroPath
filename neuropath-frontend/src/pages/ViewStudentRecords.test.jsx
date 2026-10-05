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
          month_1_target: "Decode 2-syllable phonemes with flashcards",
          month_2_target: "Decode 2-syllable sight words with faded cues",
          month_3_target: "Decode 2-syllable words independently",
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
    expect(studentsAPI.list).toHaveBeenCalledTimes(1);

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
    expect(screen.getByText("Month 1 Milestone (1st Month)")).toBeInTheDocument();
    expect(screen.getByText("Month 2 Milestone (2nd Month)")).toBeInTheDocument();
    expect(screen.getByText("Month 3 Milestone (3rd Month)")).toBeInTheDocument();
    expect(screen.getByText("Decode 2-syllable phonemes with flashcards")).toBeInTheDocument();
    expect(screen.getByText("Decode 2-syllable sight words with faded cues")).toBeInTheDocument();
    expect(screen.getByText("Decode 2-syllable words independently")).toBeInTheDocument();
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

    // Verify trackingAPI was called with studentID 101 and selected versions
    await waitFor(() => {
      expect(trackingAPI.exportStudentRecordPDF).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ section_b_version: 1, section_c_version: 1 }),
      );
    });

    // Verify object URL was created from the returned blob
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

    // Verify anchor element download property was set with sanitized student name
    expect(createdAnchor).not.toBeNull();
    expect(createdAnchor.download).toBe("StudentRecord_Alice_Johnson.pdf");
    expect(createdAnchor.href).toBe("blob:http://localhost:3000/mock-uuid");
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Verify object URL was cleanly revoked to prevent memory leaks
    await waitFor(
      () => {
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(
          "blob:http://localhost:3000/mock-uuid",
        );
      },
      { timeout: 2000 },
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

  it("renders ErrorState with retry button when loading students fails, and clicking retry re-fetches", async () => {
    studentsAPI.list.mockRejectedValueOnce(new Error("Network Error"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to Load Student Records")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    studentsAPI.list.mockResolvedValueOnce(mockStudents);
    await user.click(retryBtn);

    expect(await screen.findByText("Alice Johnson")).toBeInTheDocument();
  });

  it("paginates students when list exceeds pageSize of 6", async () => {
    const manyStudents = Array.from({ length: 8 }, (_, i) => ({
      studentID: 200 + i,
      name: `Student ${i + 1}`,
      grade: 3,
      age: 9,
    }));
    studentsAPI.list.mockResolvedValueOnce(manyStudents);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Student 1")).toBeInTheDocument();
    expect(screen.getByText("Student 6")).toBeInTheDocument();
    expect(screen.queryByText("Student 7")).not.toBeInTheDocument();

    // Check pagination exists and click Next
    const nextBtn = screen.getByRole("button", { name: /next/i });
    await user.click(nextBtn);

    expect(await screen.findByText("Student 7")).toBeInTheDocument();
    expect(screen.getByText("Student 8")).toBeInTheDocument();
    expect(screen.queryByText("Student 1")).not.toBeInTheDocument();
  });

  it("allows user to independently choose Section B and Section C versions and reflects selections in showcase and export", async () => {
    const user = userEvent.setup();

    const mockMultiIeps = [
      {
        iepID: 56,
        version: 2,
        formattedDate: "Sep 20, 2026",
        difficulties: "Difficulty in Mathematics v2",
        learning_barriers: "Multi-digit math operations v2",
        learning_facilitators: "Number blocks v2",
        learning_accommodations: "Calculator usage v2",
        generatedDetails: {
          barrierRows: [
            {
              difficulty: "Difficulty in Mathematics v2",
              barrierQualifier: "Multi-digit math operations v2",
              facilitator: "Number blocks v2",
              accommodation: "Calculator usage v2",
            },
          ],
        },
      },
      {
        iepID: 55,
        version: 1,
        formattedDate: "Sep 10, 2026",
        difficulties: "Difficulty in Reading v1",
        learning_barriers: "Phonics decoding barriers v1",
        learning_facilitators: "Flashcards v1",
        learning_accommodations: "Extra time 20 mins v1",
        generatedDetails: {
          barrierRows: [
            {
              difficulty: "Difficulty in Reading v1",
              barrierQualifier: "Phonics decoding barriers v1",
              facilitator: "Flashcards v1",
              accommodation: "Extra time 20 mins v1",
            },
          ],
        },
      },
    ];

    const goalsV2 = [
      {
        goalID: 801,
        subject_category: "Mathematics v2",
        annual_goal: "Master single-step addition equations",
        objective_rows: [
          {
            rowID: 1,
            enroute_objectives: "Add numbers up to 20",
            month_1_target: "Add to 10 with blocks",
            month_2_target: "Add to 15 with finger math",
            month_3_target: "Add to 20 mentally",
          },
        ],
      },
    ];

    const goalsV1 = [
      {
        goalID: 701,
        subject_category: "Reading v1",
        annual_goal: "Master phonetic word decoding",
        objective_rows: [
          {
            rowID: 2,
            enroute_objectives: "Read single-syllable sight words",
            month_1_target: "Read 10 words",
            month_2_target: "Read 20 words",
            month_3_target: "Read 30 words",
          },
        ],
      },
    ];

    iepAPI.listByStudent.mockResolvedValueOnce(mockMultiIeps);
    iepAPI.listGoalsByIep.mockImplementation(async (iepId) => {
      if (iepId === 56) return goalsV2;
      if (iepId === 55) return goalsV1;
      return [];
    });

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Navigate Step 1 -> Step 2 -> Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    // Verify Teacher Guide is present
    expect(
      screen.getByText(/choosing versions for review and printing/i),
    ).toBeInTheDocument();

    // Verify Section B and Section C default to latest version (Version 2)
    const selectB = screen.getByLabelText(/select section b version/i);
    const selectC = screen.getByLabelText(/select section c version/i);
    expect(selectB.value).toBe("2");
    expect(selectC.value).toBe("2");

    // On-screen showcase reflects Version 2
    expect(screen.getByText("Difficulty in Mathematics v2")).toBeInTheDocument();
    expect(screen.getByText("Mathematics v2 — Annual Goal / Long Term")).toBeInTheDocument();
    expect(screen.getByText("Add numbers up to 20")).toBeInTheDocument();

    // Switch Section B to Version 1
    await user.selectOptions(selectB, "1");
    expect(selectB.value).toBe("1");
    expect(screen.getByText("Difficulty in Reading v1")).toBeInTheDocument();
    expect(screen.queryByText("Difficulty in Mathematics v2")).not.toBeInTheDocument();

    // Section C should still be Version 2
    expect(screen.getByText("Mathematics v2 — Annual Goal / Long Term")).toBeInTheDocument();

    // Switch Section C to Version 1
    await user.selectOptions(selectC, "1");
    expect(selectC.value).toBe("1");
    expect(await screen.findByText("Reading v1 — Annual Goal / Long Term")).toBeInTheDocument();
    expect(screen.getByText("Read single-syllable sight words")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics v2 — Annual Goal / Long Term")).not.toBeInTheDocument();

    // Export PDF should now pass selected versions (section_b_version: 1, section_c_version: 1)
    const mockBlob = new Blob(["%PDF-multi"], { type: "application/pdf" });
    trackingAPI.exportStudentRecordPDF.mockResolvedValueOnce(mockBlob);

    const exportBtn = screen.getByRole("button", { name: /export pdf/i });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(trackingAPI.exportStudentRecordPDF).toHaveBeenCalledWith(101, {
        section_b_version: 1,
        section_c_version: 1,
      });
    });
  });

  it("invokes window.print when clicking PRINT RECORD", async () => {
    const user = userEvent.setup();
    const printSpy = vi.fn();
    window.print = printSpy;

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Navigate Step 1 -> Step 2 -> Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const printBtn = await screen.findByRole("button", { name: /print record/i });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves and restores chosen versions across session using sessionStorage", async () => {
    const user = userEvent.setup();

    const mockMultiIeps = [
      {
        iepID: 56,
        version: 2,
        formattedDate: "Sep 20, 2026",
        difficulties: "Math v2",
        learning_barriers: "Barriers v2",
      },
      {
        iepID: 55,
        version: 1,
        formattedDate: "Sep 10, 2026",
        difficulties: "Reading v1",
        learning_barriers: "Barriers v1",
      },
    ];

    iepAPI.listByStudent.mockResolvedValue(mockMultiIeps);
    iepAPI.listGoalsByIep.mockResolvedValue([]);

    // Pre-seed session storage with previous selection: Section B = 1, Section C = 2
    sessionStorage.setItem(
      "vsr_versions_101",
      JSON.stringify({ sectionBVersion: 1, sectionCVersion: 2 }),
    );

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Navigate to Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const selectB = screen.getByLabelText(/select section b version/i);
    const selectC = screen.getByLabelText(/select section c version/i);

    // Verified: Restored from sessionStorage!
    expect(selectB.value).toBe("1");
    expect(selectC.value).toBe("2");
    expect(screen.getByText("Reading v1")).toBeInTheDocument();

    sessionStorage.clear();
  });

  it("handles loading and error retry state when fetching goals for Section C version", async () => {
    const user = userEvent.setup();

    const mockMultiIeps = [
      {
        iepID: 56,
        version: 2,
        formattedDate: "Sep 20, 2026",
        difficulties: "Math v2",
      },
      {
        iepID: 55,
        version: 1,
        formattedDate: "Sep 10, 2026",
        difficulties: "Reading v1",
      },
    ];

    iepAPI.listByStudent.mockResolvedValueOnce(mockMultiIeps);
    // Version 2 resolves empty, Version 1 rejects first then resolves
    iepAPI.listGoalsByIep
      .mockResolvedValueOnce([]) // Initial load for v2
      .mockRejectedValueOnce(new Error("Server error")) // Switching to v1 fails
      .mockResolvedValueOnce([ // Retry succeeds
        {
          goalID: 701,
          subject_category: "Reading v1",
          annual_goal: "Read smoothly",
          objective_rows: [],
        },
      ]);

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Go to Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    const selectC = screen.getByLabelText(/select section c version/i);
    await user.selectOptions(selectC, "1");

    // Error state appears
    expect(
      await screen.findByText(/failed to load learner goals for version 1/i),
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    await user.click(retryBtn);

    // Goal successfully loaded
    expect(await screen.findByText("Reading v1 — Annual Goal / Long Term")).toBeInTheDocument();
  });

  it("displays clear empty states when student has no recorded IEPs", async () => {
    const user = userEvent.setup();
    iepAPI.listByStudent.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <ViewStudentRecords />
      </MemoryRouter>,
    );

    await screen.findByText("Alice Johnson");
    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    // Navigate Step 1 -> Step 2 -> Step 3
    const nextBtn1 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn1);
    const nextBtn2 = await screen.findByRole("button", { name: /next →/i });
    await user.click(nextBtn2);

    expect(screen.getByText("No Section B details available.")).toBeInTheDocument();
    expect(screen.getByText("No learner goals available for this student.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate iep goals/i })).toBeInTheDocument();
  });
});
