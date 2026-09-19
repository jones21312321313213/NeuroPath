import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IepPostGenerationModal } from "../IepPostGenerationModal";

describe("IepPostGenerationModal", () => {
  const mockGoals = [
    {
      subject_category: "Communication Skills",
      goalName: "Communication Skills",
      annual_goal: "Student will independently use an AAC device to make 3-word requests.",
      target_metric: "80% accuracy across 3 trials",
      _rgori_score: 88,
      _rgori_feedback: "Well-defined criteria and specific contextual timeline.",
      objective_rows: [
        {
          objective: "Identify target icons on communication board",
          interventions: "Point prompt with visual cue cards",
          timeline: "Quarter 1",
        },
        {
          objective: "Formulate 3-word sentence requests independently",
          interventions: "Fading verbal prompts in natural routines",
          timeline: "Quarter 2",
        },
      ],
    },
  ];

  it("does not render when isOpen is false", () => {
    render(
      <IepPostGenerationModal
        isOpen={false}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal dialog with student name, goal area, and drafted goals when isOpen is true", () => {
    render(
      <IepPostGenerationModal
        isOpen={true}
        studentName="Alex Santos"
        goalArea="Communication Skills"
        goals={mockGoals}
        accommodations="Visual schedule, AAC device"
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Review Generated IEP Draft")).toBeInTheDocument();
    expect(screen.getByText("Alex Santos")).toBeInTheDocument();
    expect(screen.getAllByText("Communication Skills").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 Goal Drafted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Student will independently use an AAC device to make 3-word requests.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/80% accuracy across 3 trials/)).toBeInTheDocument();
    expect(screen.getByText("Visual schedule, AAC device")).toBeInTheDocument();
  });

  it("displays R-GORI score badge with appropriate styling and feedback note", () => {
    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    expect(screen.getByText("R-GORI: 88/100 (Exemplary)")).toBeInTheDocument();
    expect(
      screen.getByText("Well-defined criteria and specific contextual timeline."),
    ).toBeInTheDocument();
  });

  it("renders empty state placeholder when no goals are supplied", () => {
    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={[]}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No goals were generated in this draft. Please click Regenerate to try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept & save iep/i })).toBeDisabled();
  });

  it("triggers onAcceptAndSave when Accept & Save IEP button is clicked", async () => {
    const user = userEvent.setup();
    const handleAccept = vi.fn();

    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={handleAccept}
        onRegenerate={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /accept & save iep/i });
    await user.click(saveBtn);
    expect(handleAccept).toHaveBeenCalledTimes(1);
  });

  it("triggers onRegenerate without notes when clicked directly", async () => {
    const user = userEvent.setup();
    const handleRegen = vi.fn();

    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={handleRegen}
      />,
    );

    const regenBtn = screen.getByRole("button", { name: /regenerate/i });
    await user.click(regenBtn);
    expect(handleRegen).toHaveBeenCalledWith(undefined);
  });

  it("allows entering optional guidance and triggers onRegenerate with custom notes", async () => {
    const user = userEvent.setup();
    const handleRegen = vi.fn();

    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={handleRegen}
      />,
    );

    // Expand optional guidance accordion
    const toggleBtn = screen.getByText(/guidance for regeneration/i);
    await user.click(toggleBtn);

    const promptTextarea = screen.getByLabelText(/provide specific guidance/i);
    await user.type(promptTextarea, "Focus more on peer interaction in sensory gym.");

    const regenBtn = screen.getByRole("button", { name: /regenerate/i });
    await user.click(regenBtn);
    expect(handleRegen).toHaveBeenCalledWith(
      "Focus more on peer interaction in sensory gym.",
    );
  });

  it("displays loading indicators and disables buttons while saving or regenerating", () => {
    const { rerender } = render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
        isSaving={true}
      />,
    );

    expect(screen.getByText("Saving Goals...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /saving goals.../i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeDisabled();

    rerender(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={vi.fn()}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
        isRegenerating={true}
      />,
    );

    expect(screen.getByText("Regenerating...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regenerating.../i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /accept & save iep/i })).toBeDisabled();
  });

  it("calls onClose when Cancel / Close button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={mockGoals}
        onClose={handleClose}
        onAcceptAndSave={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel \/ close/i });
    await user.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders objective rows formatted with backend snake_case keys correctly", () => {
    const goalsWithBackendKeys = [
      {
        subject_category: "Mathematical Skills",
        goalName: "Mathematical Skills",
        annual_goal: "Solve two-step word problems.",
        objective_rows: [
          {
            enroute_objectives: "Identify operation sign",
            interventions_procedures: "Color-coded word problems",
            timeline_mins_session: "15 minutes per session",
          },
        ],
      },
    ];

    render(
      <IepPostGenerationModal
        isOpen={true}
        goals={goalsWithBackendKeys}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Identify operation sign")).toBeInTheDocument();
    expect(screen.getByText("Color-coded word problems")).toBeInTheDocument();
    expect(screen.getByText("15 minutes per session")).toBeInTheDocument();
  });
});
