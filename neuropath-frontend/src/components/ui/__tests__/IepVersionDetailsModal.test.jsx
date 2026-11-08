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
    expect(screen.queryByText(/IEP Version 2 Details/i)).not.toBeInTheDocument();
  });

  it("renders version metadata, accommodations, and fetches goals when open", async () => {
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

    expect(screen.getByRole("heading", { name: /IEP Version 2 Details/i })).toBeInTheDocument();
    expect(screen.getByText("Transition Program")).toBeInTheDocument();
    expect(screen.getAllByText(/October 15, 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Extended time for tests, sensory breaks every 30 minutes.")
    ).toBeInTheDocument();
    expect(screen.getByText("Auditory processing sensitivity")).toBeInTheDocument();

    await waitFor(() => {
      expect(iepAPI.listGoalsByIep).toHaveBeenCalledWith(201);
      expect(
        screen.getByText("Student will read 80 words per minute accurately.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Student will complete 2-step word problems with visual models.")
      ).toBeInTheDocument();
    });

    const selectBtn = screen.getByRole("button", { name: /Select This Version/i });
    fireEvent.click(selectBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockIep);
    expect(handleClose).toHaveBeenCalled();
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
