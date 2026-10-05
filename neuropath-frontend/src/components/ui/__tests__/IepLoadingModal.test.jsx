import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { IepLoadingModal } from "../IepLoadingModal";
import { IEP_STAGES } from "../../../constants/iepLoadingStages";

describe("IepLoadingModal component (Issue #156)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when isOpen is false", () => {
    render(
      <IepLoadingModal
        isOpen={false}
        studentName="Alex Doe"
        goalArea="Mathematics"
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders accessible dialog with aria-busy and title when isOpen is true", () => {
    render(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByText("Generating Individualized Education Plan"),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
  });

  it("renders progress bar and updates percentage with custom progressProp", () => {
    const { rerender } = render(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
        progressProp={30}
      />,
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("Drafting SMART Goals...")).toBeInTheDocument();

    // Rerender with 90% (almost done state)
    rerender(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
        progressProp={90}
      />,
    );

    expect(progressBar).toHaveAttribute("aria-valuenow", "90");
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(
      screen.getByText(/Almost done! Finalizing IEP document.../i),
    ).toBeInTheDocument();
  });

  it("renders all 4 pedagogical milestone stages", () => {
    render(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
        progressProp={60}
      />,
    );

    // Verify all 4 stage titles exist
    IEP_STAGES.forEach((stage) => {
      expect(screen.getByText(stage.title)).toBeInTheDocument();
      expect(screen.getByText(stage.description)).toBeInTheDocument();
    });

    // At 60%: Stage 1 & 2 are Completed, Stage 3 is In progress, Stage 4 is Pending
    const completedBadges = screen.getAllByText("Completed");
    expect(completedBadges).toHaveLength(2);

    expect(screen.getByText("In progress...")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("simulates progressive timer over time", () => {
    render(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
      />,
    );

    expect(screen.getByText("8%")).toBeInTheDocument();

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Progress should have increased beyond initial 8%
    const progressBar = screen.getByRole("progressbar");
    const currentValue = parseInt(progressBar.getAttribute("aria-valuenow"), 10);
    expect(currentValue).toBeGreaterThan(8);
  });

  it("displays reassuring footnote to discourage closing during generation", () => {
    render(
      <IepLoadingModal
        isOpen={true}
        studentName="Alex Doe"
        goalArea="Mathematics"
      />,
    );

    expect(
      screen.getByText(/Please keep this window open while AI crafts goals and checks rubric compliance/i),
    ).toBeInTheDocument();
  });
});
