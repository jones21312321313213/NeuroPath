import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import IEPGenerationPage from "./IepGenerationPage";
import { sanitizeDifficulties, mergeDifficulties } from "../utils/difficultyUtils";

import { studentsAPI, iepAPI } from "../api/client";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  },
  iepAPI: {
    listByStudent: vi.fn(),
    listGoalsByIep: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    generateGoalsFromIep: vi.fn(),
    saveGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

describe("IEPGenerationPage - Special Factor Notes and Manual Goal Add", () => {
  const mockStudent = {
    id: 1,
    studentID: 1,
    name: "Alex Doe",
    grade: "3",
    age: "8",
    diagnosis: "Autism Spectrum Disorder",
    difficulty: "Sensory Processing",
  };

  const mockIep = {
    iepID: 101,
    studentID: 1,
    studentName: "Alex Doe",
    version: 1,
    formattedDate: "September 8, 2026",
    baselineData: "Some baseline",
    accommodations: "Visual schedule",
    generatedDetails: JSON.stringify({
      specialFactorNotes: "Sensitive to sudden auditory alarms and loud bells.",
      barrierRows: [
        {
          difficulty: "Sensory Processing",
          barrierQualifier: "Moderate barrier",
          facilitator: "Headphones",
          accommodation: "Quiet room",
        },
      ],
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ id: 10, teacherID: 10 }),
    );
    studentsAPI.list.mockResolvedValue([mockStudent]);
    studentsAPI.update.mockResolvedValue({
      message: "Student profile updated successfully.",
    });
    iepAPI.listByStudent.mockResolvedValue([mockIep]);
    iepAPI.listGoalsByIep.mockResolvedValue([]);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders 'Other Special Factor Notes' under Considerations of Special Factors in View mode", async () => {
    render(
      <MemoryRouter>
        <IEPGenerationPage mode="view" initialStudentId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
    });

    expect(screen.getByText("Other Special Factor Notes")).toBeInTheDocument();
    expect(
      screen.getByText(/Sensitive to sudden auditory alarms and loud bells/i),
    ).toBeInTheDocument();
  });

  it("allows editing Other Special Factor Notes in Edit mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IEPGenerationPage mode="view" initialStudentId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
    });

    await user.click(screen.getByText("EDIT IEP"));

    expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();
    const notesInput = screen.getByDisplayValue(
      "Sensitive to sudden auditory alarms and loud bells.",
    );
    expect(notesInput).toBeInTheDocument();

    await user.clear(notesInput);
    await user.type(notesInput, "Updated sensory notes.");

    iepAPI.update.mockResolvedValue({
      iepID: 101,
      generatedDetails: {
        specialFactorNotes: "Updated sensory notes.",
      },
    });

    await user.click(screen.getByText("SAVE CHANGES"));

    await waitFor(() => {
      expect(iepAPI.update).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          generatedDetails: expect.objectContaining({
            specialFactorNotes: "Updated sensory notes.",
          }),
        }),
      );
    });
  });

  it("allows adding a goal manually in Step 2 without AI", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IEPGenerationPage mode="generate" initialStudentId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    });

    // Advance to step 2
    await user.click(screen.getByText("NEXT"));

    expect(screen.getByText("+ Add Goal Manually")).toBeInTheDocument();

    // Click to expand manual goal section
    await user.click(screen.getByText("+ Add Goal Manually"));

    expect(screen.getByText("Custom Goals")).toBeInTheDocument();
    expect(screen.getByText("SAVE GOAL MANUALLY")).toBeInTheDocument();

    // Type goal details
    const goalAreaInput = screen.getByPlaceholderText(/Communication Skills/i);
    await user.type(goalAreaInput, "Social Skills");

    const annualGoalInput = screen.getByPlaceholderText(
      "Write the annual learner goal.",
    );
    await user.type(annualGoalInput, "Will greet peers independently 4 out of 5 times.");

    iepAPI.save.mockResolvedValue({ iepID: 202, studentID: 1 });
    iepAPI.saveGoal.mockResolvedValue({
      goalID: 55,
      goalName: "Social Skills",
      annual_goal: "Will greet peers independently 4 out of 5 times.",
    });

    await user.click(screen.getByText("SAVE GOAL MANUALLY"));

    await waitFor(() => {
      expect(iepAPI.saveGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_category: "Social Skills",
          annual_goal: "Will greet peers independently 4 out of 5 times.",
        }),
      );
    });
  });

  it("passes special_factor_notes to iepAPI.generateGoalsFromIep in handleGenerateFinalIep", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IEPGenerationPage mode="generate" initialStudentId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Alex Doe")).toBeInTheDocument();
    });

    // Enter special factor notes in Step 1
    const notesInput = screen.getByPlaceholderText(
      /Add notes about behavior, communication, sensory/i,
    );
    await user.clear(notesInput);
    await user.type(notesInput, "Needs quiet space during loud assemblies.");

    // Advance to Step 2
    await user.click(screen.getByText("NEXT"));

    // Select a goal area
    const goalSelect = screen.getByRole("combobox");
    await user.selectOptions(goalSelect, "Functional Academic Skills");

    iepAPI.save.mockResolvedValue({ iepID: 303, studentID: 1 });
    iepAPI.generateGoalsFromIep.mockResolvedValue({
      goals: [
        {
          subject_category: "Functional Academic Skills",
          annual_goal: "Learner will complete daily tasks.",
          _rgori_score: 90,
          _rgori_feedback: "Good",
          objective_rows: [],
        },
      ],
    });
    iepAPI.saveGoal.mockResolvedValue({ goalID: 88 });

    // Click generate
    await user.click(screen.getByText("GENERATE FINAL IEP"));

    await waitFor(() => {
      expect(iepAPI.generateGoalsFromIep).toHaveBeenCalled();
    });
    const callArgs = iepAPI.generateGoalsFromIep.mock.calls[0][0];
    expect(callArgs.special_factor_notes).toBe(
      "Needs quiet space during loud assemblies.",
    );
  });

  it("renders difficulty markers as static paragraph text instead of read-only inputs in Step 1", async () => {
    render(
      <MemoryRouter>
        <IEPGenerationPage mode="generate" initialStudentId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    });

    // Verify difficulty items render within the difficulty list container
    await waitFor(() => {
      const diffList = screen.getByTestId("iep-difficulty-list");
      expect(diffList).toBeInTheDocument();
      expect(diffList.querySelector(".iep-difficulty-item")).toBeInTheDocument();
      expect(diffList).toHaveTextContent("Sensory Processing");
    });

    // Ensure no read-only input exists for difficulty markers
    expect(screen.queryByPlaceholderText(/Difficulty 1/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Difficulty from profile/i)).not.toBeInTheDocument();

    // Section B Table difficulty column renders as paragraph text
    const cellText = document.querySelector(".iep-difficulty-cell-text");
    expect(cellText).toBeInTheDocument();
    expect(cellText.tagName.toLowerCase()).toBe("p");
    expect(cellText).toHaveTextContent("Sensory Processing");
  });

  describe("Assistive Technology Row Limit & Preset Chips (#127)", () => {
    it("renders all 6 preset suggestion chips for assistive technology", async () => {
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Assistive Technologies Needed")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /\+ AAC Communication Board/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Speech-to-Text \/ Audio Dictation/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Visual Schedule & Choice Cards/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Screen Magnifier \/ Reader/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ FM Listening System/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Pencil Grip \/ Adaptive Utensils/i })).toBeInTheDocument();
    });

    it("clicking a preset chip automatically appends it to the assistive technologies list", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Assistive Technologies Needed")).toBeInTheDocument();
      });

      const aacChip = screen.getByRole("button", { name: /\+ AAC Communication Board/i });
      await user.click(aacChip);

      expect(screen.getByDisplayValue("AAC Communication Board")).toBeInTheDocument();

      const fmChip = screen.getByRole("button", { name: /\+ FM Listening System/i });
      await user.click(fmChip);

      expect(screen.getByDisplayValue("FM Listening System")).toBeInTheDocument();
    });

    it("enforces maximum limit of 5 items, disables Add Row button, and shows (Maximum 5 reached) badge", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Assistive Technologies Needed")).toBeInTheDocument();
      });

      const addRowBtn = screen.getByRole("button", { name: /\+ Add Row/i });
      expect(addRowBtn).not.toBeDisabled();
      expect(screen.queryByText(/Maximum 5 reached/i)).not.toBeInTheDocument();

      // Add 5 items
      await user.click(addRowBtn);
      await user.click(addRowBtn);
      await user.click(addRowBtn);
      await user.click(addRowBtn);
      await user.click(addRowBtn);

      expect(addRowBtn).toBeDisabled();
      expect(screen.getAllByText(/Maximum 5 reached/i).length).toBeGreaterThanOrEqual(1);

      // Verify preset chips are also disabled
      const aacChip = screen.getByRole("button", { name: /\+ AAC Communication Board/i });
      expect(aacChip).toBeDisabled();
    });

    it("re-enables Add Row button and removes badge when a row is deleted", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Assistive Technologies Needed")).toBeInTheDocument();
      });

      const addRowBtn = screen.getByRole("button", { name: /\+ Add Row/i });

      // Add 5 items
      for (let i = 0; i < 5; i++) {
        await user.click(addRowBtn);
      }

      expect(addRowBtn).toBeDisabled();
      expect(screen.getAllByText(/Maximum 5 reached/i).length).toBeGreaterThanOrEqual(1);

      // Remove the first item
      const removeButtons = screen.getAllByRole("button", { name: /✕|Remove technology/i });
      await user.click(removeButtons[0]);

      // Verify re-enabled state
      expect(addRowBtn).not.toBeDisabled();
      expect(screen.queryByText(/Maximum 5 reached/i)).not.toBeInTheDocument();

      const aacChip = screen.getByRole("button", { name: /\+ AAC Communication Board/i });
      expect(aacChip).not.toBeDisabled();
    });
  });

  describe("Other Special Factor Notes UX Enhancements (#128)", () => {
    it("renders all 6 preset suggestion chips, helper text, and character counter in Step 1", async () => {
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      // Verify preset chips
      expect(screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Sensory sensitivity: frequent quiet breaks/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Non-verbal communication: requires AAC/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Visual schedules & explicit verbal cues/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Fine motor fatigue: allow speech-to-text/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Transition warnings & structured routine/i })).toBeInTheDocument();

      // Verify character counter initial state
      expect(screen.getByText(/0 \/ 500 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Notes guide AI goal synthesis/i)).toBeInTheDocument();
    });

    it("clicking preset chips appends text with clean formatting and updates character count", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      await user.click(pbspChip);

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      expect(textarea).toHaveValue("Positive Behavior Support Plan (PBSP) active");
      expect(screen.getByText(/44 \/ 500 characters/i)).toBeInTheDocument();

      const sensoryChip = screen.getByRole("button", { name: /\+ Sensory sensitivity: frequent quiet breaks/i });
      await user.click(sensoryChip);

      expect(textarea.value).toContain("Positive Behavior Support Plan (PBSP) active; Sensory sensitivity: frequent quiet breaks");
    });

    it("provides a Clear Notes button when text is present", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      await user.click(pbspChip);

      const clearBtn = screen.getByRole("button", { name: /Clear notes/i });
      expect(clearBtn).toBeInTheDocument();

      await user.click(clearBtn);

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      expect(textarea).toHaveValue("");
      expect(screen.getByText(/0 \/ 500 characters/i)).toBeInTheDocument();
    });

    it("enforces 500 character maximum limit and disables preset chips when capacity reached", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Add notes about behavior, communication, sensory/i);
      const longText = "A".repeat(500);
      await user.type(textarea, longText);

      expect(screen.getByText(/500 \/ 500 characters \(Maximum reached\)/i)).toBeInTheDocument();

      const pbspChip = screen.getByRole("button", { name: /\+ Positive Behavior Support Plan/i });
      expect(pbspChip).toBeDisabled();
    });

    it("renders preset chips, character counter, and edit support in Edit Mode", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Edit IEP/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Edit IEP/i }));

      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /\+ Positive Behavior Support Plan/i }).length).toBeGreaterThanOrEqual(1);

      const editTextarea = screen.getAllByPlaceholderText(/Add notes about behavior, communication, sensory/i)[0];
      expect(editTextarea).toBeInTheDocument();
    });
  });

  describe("Isolate Edit IEP Mode (#134)", () => {
    it("hides all read-only sections and top action buttons and displays active Editing IEP indicator in edit mode", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      // Assert read-only elements and actions are present in read-only mode
      expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Instructional Support Next Steps" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Section C: Learner's Goals")).toBeInTheDocument();
      expect(screen.queryByText(/Editing IEP/i)).not.toBeInTheDocument();

      // Enter Edit Mode
      await user.click(screen.getByText("EDIT IEP"));

      // Verify header indicator is displayed
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();

      // Verify uneditable/read-only sections and top actions are removed from the DOM
      expect(screen.queryByRole("button", { name: /^EDIT IEP$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^DELETE IEP$/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Instructional Support Next Steps" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Considerations of Special Factors")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Section C: Learner's Goals")).not.toBeInTheDocument();

      // Verify edit form controls and footer actions are present
      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Edit Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Edit Section C: Learner's Goals")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^SAVE CHANGES$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^CANCEL$/i })).toBeInTheDocument();
    });

    it("restores read-only view cleanly upon clicking CANCEL without leaving edit artifacts", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();
      expect(screen.getByText("Edit Considerations of Special Factors")).toBeInTheDocument();

      // Click CANCEL
      await user.click(screen.getByRole("button", { name: /^CANCEL$/i }));

      // Verify read-only view is restored
      expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Instructional Support Next Steps" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.getByText("Section B: Difficulties, Barriers, and Enabling Supports"),
      ).toBeInTheDocument();
      expect(screen.getByText("Section C: Learner's Goals")).toBeInTheDocument();

      // Verify edit panel is no longer in DOM
      expect(
        screen.queryByText("Edit Considerations of Special Factors"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Editing IEP/i)).not.toBeInTheDocument();
    });

    it("restores read-only view cleanly upon clicking SAVE CHANGES", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        generatedDetails: {
          specialFactorNotes: "Sensitive to sudden auditory alarms and loud bells.",
        },
      });

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      expect(screen.getByText("DELETE IEP")).toBeInTheDocument();
      expect(screen.getByText("Considerations of Special Factors")).toBeInTheDocument();
      expect(
        screen.queryByText("Edit Considerations of Special Factors"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Sync Section B Difficulties to Student Profile & Generator (#135)", () => {
    it("sanitizeDifficulties utility deduplicates case-insensitively and filters empty items", () => {
      const input = [
        { difficulty: "Difficulty in Seeing" },
        "difficulty in seeing",
        "  ",
        { difficulty: "Difficulty in Hearing" },
        "DIFFICULTY IN HEARING",
      ];
      const result = sanitizeDifficulties(input);
      expect(result).toEqual(["Difficulty in Seeing", "Difficulty in Hearing"]);
    });

    it("mergeDifficulties utility deduplicates case-insensitively and preserves order", () => {
      const existing = ["Difficulty in Seeing", "Sensory Processing"];
      const newItems = ["difficulty in seeing", "Difficulty in Hearing", "DIFFICULTY IN HEARING", "  "];
      const result = mergeDifficulties(existing, newItems);
      expect(result).toEqual([
        "Difficulty in Seeing",
        "Sensory Processing",
        "Difficulty in Hearing",
      ]);
    });


    it("syncs newly added Section B difficulty row to student profile via studentsAPI.update on save", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        difficulties: "Sensory Processing\nDifficulty in Speech",
        generatedDetails: {
          barrierRows: [
            {
              difficulty: "Sensory Processing",
              barrierQualifier: "Moderate barrier",
              facilitator: "Headphones",
              accommodation: "Quiet room",
            },
            {
              difficulty: "Difficulty in Speech",
              barrierQualifier: "High barrier",
              facilitator: "Visual AAC",
              accommodation: "Extra time",
            },
          ],
        },
      });

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      expect(screen.getByText(/Editing IEP/i)).toBeInTheDocument();

      // Click + ADD ROW to add a new Section B difficulty row
      await user.click(screen.getByText("+ ADD ROW"));

      // Find the inputs for the newly added row
      const difficultyInputs = screen.getAllByPlaceholderText("Type difficulty");
      expect(difficultyInputs.length).toBeGreaterThanOrEqual(2);
      const newDifficultyInput = difficultyInputs[difficultyInputs.length - 1];

      await user.type(newDifficultyInput, "Difficulty in Speech");

      // Click SAVE CHANGES
      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(iepAPI.update).toHaveBeenCalled();
      });

      // Verify studentsAPI.update was called with the merged difficulties
      expect(studentsAPI.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          profileDetails: expect.objectContaining({
            difficultyMarkers: expect.arrayContaining([
              "Sensory Processing",
              "Difficulty in Speech",
            ]),
          }),
        }),
      );
    });

    it("immediately renders the newly synced difficulty in Generate IEP tab", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        difficulties: "Sensory Processing\nDifficulty in Speech",
        generatedDetails: {
          barrierRows: [
            {
              difficulty: "Sensory Processing",
              barrierQualifier: "Moderate barrier",
              facilitator: "Headphones",
              accommodation: "Quiet room",
            },
            {
              difficulty: "Difficulty in Speech",
              barrierQualifier: "High barrier",
              facilitator: "Visual AAC",
              accommodation: "Extra time",
            },
          ],
        },
      });

      const { rerender } = render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      await user.click(screen.getByText("+ ADD ROW"));

      const difficultyInputs = screen.getAllByPlaceholderText("Type difficulty");
      const newDifficultyInput = difficultyInputs[difficultyInputs.length - 1];
      await user.type(newDifficultyInput, "Difficulty in Speech");

      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(studentsAPI.update).toHaveBeenCalled();
      });

      // Switch to Generate mode for the same student
      rerender(
        <MemoryRouter>
          <IEPGenerationPage mode="generate" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getAllByText("Difficulty in Speech").length,
        ).toBeGreaterThanOrEqual(1);
      });
      expect(
        screen.getAllByText("Sensory Processing").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("deduplicates difficulties so duplicate markers are not duplicated", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        difficulties: "Sensory Processing\nsensory processing",
        generatedDetails: {
          barrierRows: [
            { difficulty: "Sensory Processing" },
            { difficulty: "sensory processing" },
          ],
        },
      });

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));
      await user.click(screen.getByText("+ ADD ROW"));

      const difficultyInputs = screen.getAllByPlaceholderText("Type difficulty");
      const newDifficultyInput = difficultyInputs[difficultyInputs.length - 1];
      await user.type(newDifficultyInput, "sensory processing");

      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(studentsAPI.update).toHaveBeenCalled();
      });

      const callArgs = studentsAPI.update.mock.calls[0];
      const savedMarkers = callArgs[1].profileDetails.difficultyMarkers;
      expect(savedMarkers).toEqual(["Sensory Processing"]);
    });

    it("renaming an existing difficulty in Section B replaces the old name without creating duplicate rows", async () => {
      const user = userEvent.setup();
      iepAPI.update.mockResolvedValue({
        iepID: 101,
        difficulties: "test",
        generatedDetails: {
          barrierRows: [
            { difficulty: "test", barrierQualifier: "Moderate barrier", facilitator: "F", accommodation: "A" },
          ],
        },
      });

      render(
        <MemoryRouter>
          <IEPGenerationPage mode="view" initialStudentId={1} />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText("EDIT IEP")).toBeInTheDocument();
      });

      await user.click(screen.getByText("EDIT IEP"));

      // Edit the existing difficulty input (which initially was "Sensory Processing") to "test"
      const difficultyInputs = screen.getAllByPlaceholderText("Type difficulty");
      expect(difficultyInputs[0]).toHaveValue("Sensory Processing");
      await user.clear(difficultyInputs[0]);
      await user.type(difficultyInputs[0], "test");

      await user.click(screen.getByRole("button", { name: /^SAVE CHANGES$/i }));

      await waitFor(() => {
        expect(studentsAPI.update).toHaveBeenCalled();
      });

      const callArgs = studentsAPI.update.mock.calls[0];
      const savedMarkers = callArgs[1].profileDetails.difficultyMarkers;
      // Must be replaced with ["test"], NOT ["Sensory Processing", "test"]
      expect(savedMarkers).toEqual(["test"]);
    });
  });
});

