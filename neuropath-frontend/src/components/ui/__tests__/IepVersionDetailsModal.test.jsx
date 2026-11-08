import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IepVersionDetailsModal from "../IepVersionDetailsModal";
import { iepAPI } from "../../../api/client";

vi.mock("../../../api/client", () => ({
  iepAPI: {
    listGoalsByIep: vi.fn(),
  },
}));

describe("IepVersionDetailsModal", () => {
  const mockIep = {
    iepID: 201,
    version: 2,
    program_type: "Transition",
    createdDate: "2026-10-15T12:00:00Z",
    formattedDate: "October 15, 2026",
    accommodations: "Extended time for tests, sensory breaks every 30 minutes.",
    learning_barriers: "Auditory processing sensitivity",
    learning_facilitators: "Visual prompts and checklists",
  };

  const mockGoals = [
    {
      goalID: 501,
      goalArea: "Language Arts",
      annual_goal: "Student will read 80 words per minute accurately.",
    },
    {
      goalID: 502,
      subject_category: "Mathematics",
      annual_goal: "Student will complete 2-step word problems with visual models.",
      objective_rows: [
        {
          rowID: 39,
          enroute_objectives: "Given large-print visual number lines and direct physical prompts, the learner will identify and count numbers 1-10 sequentially.",
          month_1_target: "Given large-print visual number lines and direct physical prompts, the learner will count numbers 1-3 with 70% accuracy in 3 of 5 trials.",
          month_2_target: "Given large-print visual number lines and faded verbal cues, the learner will count numbers 1-5 with 75% accuracy in 4 of 5 trials.",
          month_3_target: "Given large-print visual number lines, the learner will independently count and identify numbers 5-10 with 80% accuracy in 4 of 5 trials.",
          interventions_procedures: "Use large-print tactile number lines with high-contrast markers.",
          timeline_mins_session: "20 minutes, 3 times per week",
          individuals_responsible: "Special Education Teacher",
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    iepAPI.listGoalsByIep.mockResolvedValue(mockGoals);
  });

  it("does not render when isOpen is false", () => {
    render(
      <IepVersionDetailsModal
        isOpen={false}
        onClose={vi.fn()}
        iep={mockIep}
        studentName="Leo Miller"
      />
    );
    expect(screen.queryByRole("heading", { name: /IEP Version 2/i })).not.toBeInTheDocument();
  });

  it("renders streamlined modal with goals associated with version when open", async () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <IepVersionDetailsModal
        isOpen={true}
        onClose={handleClose}
        iep={mockIep}
        studentName="Leo Miller"
        onSelect={handleSelect}
      />
    );

    expect(screen.getByRole("heading", { name: /^IEP Version 2$/i })).toBeInTheDocument();
    expect(screen.getByText("Goals Associated with Version 2")).toBeInTheDocument();

    await waitFor(() => {
      expect(iepAPI.listGoalsByIep).toHaveBeenCalledWith(201);
      expect(
        screen.getByText("Student will read 80 words per minute accurately.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Student will complete 2-step word problems with visual models.")
      ).toBeInTheDocument();
    });

    // Verify objective is parsed cleanly as human-readable text and not raw JSON
    expect(
      screen.getByText(/Given large-print visual number lines and direct physical prompts, the learner will identify and count numbers 1-10 sequentially/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Month 1 Target/i)).toBeInTheDocument();
    expect(screen.getByText(/Month 2 Target/i)).toBeInTheDocument();
    expect(screen.getByText(/Month 3 Target/i)).toBeInTheDocument();
    expect(screen.queryByText(/\"rowID\":39/)).not.toBeInTheDocument();

    const selectBtn = screen.getByRole("button", { name: /Select This Version/i });
    fireEvent.click(selectBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockIep);
    expect(handleClose).toHaveBeenCalled();
  });

  it("safely unpacks stringified JSON objective rows into human-readable milestones", async () => {
    const stringifiedGoals = [
      {
        goalID: 503,
        goalArea: "Mathematics",
        annual_goal: "Perform single-digit addition.",
        objectives: [
          JSON.stringify({
            rowID: 40,
            enroute_objectives: "Given large-print base-ten blocks and auditory cues, the learner will perform single-digit addition without regrouping.",
            month_1_target: "Solve addition problems (sums 1-5) with 70% accuracy.",
            month_2_target: "Solve addition problems (sums 6-10) with 75% accuracy.",
            month_3_target: "Independently solve addition problems (sums 1-10) with 80% accuracy.",
            interventions_procedures: "Use visual supports",
            timeline_mins_session: "15-20 minutes every day",
          }),
        ],
      },
    ];

    iepAPI.listGoalsByIep.mockResolvedValueOnce(stringifiedGoals);

    render(
      <IepVersionDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        iep={mockIep}
        studentName="Leo Miller"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Given large-print base-ten blocks and auditory cues, the learner will perform single-digit addition without regrouping/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Solve addition problems \(sums 1-5\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/\"rowID\":40/)).not.toBeInTheDocument();
    });
  });

  it("displays fallback when goals fail to load", async () => {
    iepAPI.listGoalsByIep.mockRejectedValueOnce(new Error("Network error"));

    render(
      <IepVersionDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        iep={{ ...mockIep, goals: [] }}
        studentName="Leo Miller"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No specific goals saved under this version/i)
      ).toBeInTheDocument();
    });
  });
});
