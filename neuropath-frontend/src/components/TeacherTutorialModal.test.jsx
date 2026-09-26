import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherTutorialModal from "./TeacherTutorialModal";

describe("TeacherTutorialModal", () => {
  it("renders step 1 (Welcome & Philosophy) initially", () => {
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/welcome to neuropath/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip walkthrough/i })).toBeInTheDocument();
  });

  it("navigates forward through all 5 SPED workflow steps and finishes", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    // Step 1 -> Step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/comprehensive student profiling/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/intelligent iep goal generation/i)).toBeInTheDocument();

    // Step 3 -> Step 4
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 4 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/classroom instructional support/i)).toBeInTheDocument();

    // Step 4 -> Step 5
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/outcome & progress monitoring/i)).toBeInTheDocument();

    // Step 5 has Finish button instead of Next
    const finishBtn = screen.getByRole("button", { name: /get started/i });
    expect(finishBtn).toBeInTheDocument();

    await user.click(finishBtn);
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it("navigates backward when clicking Previous button", async () => {
    const user = userEvent.setup();
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    // Move to step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();

    // Move back to step 1
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it("calls onComplete when clicking Skip Walkthrough", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    await user.click(screen.getByRole("button", { name: /skip walkthrough/i }));
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it("sets proper dialog accessibility attributes", () => {
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "tutorial-modal-title");

    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveAttribute("id", "tutorial-modal-title");
  });

  it("calls onComplete when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    await user.keyboard("{Escape}");
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it("traps focus within the modal during keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    const skipBtn = screen.getByRole("button", { name: /skip walkthrough/i });
    const nextBtn = screen.getByRole("button", { name: /next/i });

    // On initial step, 'Previous' button is disabled, so focusable elements are: skipBtn, nextBtn
    expect(document.activeElement).toBe(skipBtn);

    await user.tab();
    expect(document.activeElement).toBe(nextBtn);

    // Tab wraps back to skipBtn
    await user.tab();
    expect(document.activeElement).toBe(skipBtn);

    // Shift+Tab wraps to nextBtn
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(nextBtn);
  });
});
