import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherTutorialModal from "./TeacherTutorialModal";

describe("TeacherTutorialModal", () => {
  it("renders step 1 (Student Profiling) initially", () => {
    render(<TeacherTutorialModal onComplete={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/comprehensive student profiling/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip walkthrough/i })).toBeInTheDocument();
  });

  it("navigates forward through all 6 sidebar tab steps and finishes on Notifications History", async () => {
    const user = userEvent.setup();
    const handleComplete = vi.fn();

    render(<TeacherTutorialModal onComplete={handleComplete} />);

    // Step 1: Student Profiling
    expect(screen.getByText(/1\. comprehensive student profiling/i)).toBeInTheDocument();

    // Step 1 -> Step 2
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. intelligent iep goal generation/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 3 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. classroom instructional support/i)).toBeInTheDocument();

    // Step 3 -> Step 4
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 4 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. outcome & progress monitoring/i)).toBeInTheDocument();

    // Step 4 -> Step 5
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 5 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. calendar & schedules/i)).toBeInTheDocument();

    // Step 5 -> Step 6 (Notifications)
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 6 of 6/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. notifications history/i)).toBeInTheDocument();

    // Step 6 has Finish button ("Get Started") instead of Next
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
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();

    // Move back to step 1
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
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

  it("renders spotlight cutout when target tab element exists in the DOM", async () => {
    const targetElement = document.createElement("button");
    targetElement.setAttribute("data-tour-id", "tour-student-profiling");
    vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
      top: 100,
      left: 20,
      width: 200,
      height: 48,
      right: 220,
      bottom: 148,
    });
    document.body.appendChild(targetElement);

    const { container } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelector(".tour-spotlight-cutout")).toBeInTheDocument();
      expect(container.querySelector(".tour-anchored-card")).toBeInTheDocument();
    });

    document.body.removeChild(targetElement);
  });

  it("locks body scrolling while mounted and restores it upon unmount", () => {
    document.body.style.overflow = "visible";
    const { unmount } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.classList.contains("tour-open")).toBe(true);

    unmount();

    expect(document.body.style.overflow).toBe("visible");
    expect(document.body.classList.contains("tour-open")).toBe(false);
  });

  it("clamps walkthrough card cleanly inside viewport even when expanded sidebar pushes target near bottom", async () => {
    const origHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 720,
    });

    const targetElement = document.createElement("button");
    targetElement.setAttribute("data-tour-id", "tour-student-profiling");
    targetElement.scrollIntoView = vi.fn();
    vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
      top: 660,
      left: 20,
      width: 200,
      height: 44,
      right: 220,
      bottom: 704,
    });
    document.body.appendChild(targetElement);

    const { container } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    await waitFor(() => {
      const card = container.querySelector(".tour-anchored-card");
      expect(card).toBeInTheDocument();
      const topPx = parseFloat(card.style.top);
      // Card top must be clamped well above the bottom so Next button stays visible
      expect(topPx).toBeLessThanOrEqual(720 - 440 - 16);
      expect(topPx).toBeGreaterThanOrEqual(16);
      expect(card.style.maxHeight).toBe(`${720 - 32}px`);
    });

    document.body.removeChild(targetElement);
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: origHeight,
    });
  });

  it("ignores off-screen collapsed mobile sidebar targets and renders centered mobile card with Menu hint", async () => {
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });

    const offscreenTarget = document.createElement("button");
    offscreenTarget.setAttribute("data-tour-id", "tour-student-profiling");
    vi.spyOn(offscreenTarget, "getBoundingClientRect").mockReturnValue({
      top: 140,
      left: -252,
      width: 244,
      height: 44,
      right: -8,
      bottom: 184,
    });
    document.body.appendChild(offscreenTarget);

    const { container } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelector(".tour-spotlight-cutout")).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("data-mobile-placement", "centered");
      expect(screen.getByTestId("tutorial-mobile-nav-hint")).toHaveTextContent(
        /menu › student profiling/i,
      );
    });

    document.body.removeChild(offscreenTarget);
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: origWidth });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: origHeight });
  });

  it("docks mobile walkthrough sheet at bottom when mobile drawer tab is visible above, and supports swipe navigation", async () => {
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });

    const targetElement = document.createElement("button");
    targetElement.setAttribute("data-tour-id", "tour-student-profiling");
    targetElement.scrollIntoView = vi.fn();
    vi.spyOn(targetElement, "getBoundingClientRect").mockReturnValue({
      top: 140,
      left: 8,
      width: 244,
      height: 44,
      right: 252,
      bottom: 184,
    });
    document.body.appendChild(targetElement);

    const { container } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelector(".tour-spotlight-cutout")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("data-mobile-placement", "bottom");
      const card = container.querySelector(".tutorial-mobile-sheet");
      expect(card).toBeInTheDocument();
      expect(card.style.bottom).toBe("12px");
    });

    // Swipe left to advance to Step 2
    const card = container.querySelector(".tutorial-mobile-sheet");
    fireEvent.touchStart(card, { touches: [{ clientX: 280 }] });
    fireEvent.touchEnd(card, { changedTouches: [{ clientX: 160 }] });
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
    expect(screen.getByTestId("tutorial-mobile-nav-hint")).toHaveTextContent(
      /menu › ai-based iep generation/i,
    );

    // Swipe right to go back to Step 1
    fireEvent.touchStart(card, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(card, { changedTouches: [{ clientX: 220 }] });
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();

    document.body.removeChild(targetElement);
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: origWidth });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: origHeight });
  });

  it("flips mobile walkthrough sheet to top when highlighted mobile drawer tab is near bottom", async () => {
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });

    const lowTarget = document.createElement("button");
    lowTarget.setAttribute("data-tour-id", "tour-student-profiling");
    lowTarget.scrollIntoView = vi.fn();
    vi.spyOn(lowTarget, "getBoundingClientRect").mockReturnValue({
      top: 620,
      left: 8,
      width: 244,
      height: 44,
      right: 252,
      bottom: 664,
    });
    document.body.appendChild(lowTarget);

    const { container } = render(<TeacherTutorialModal onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelector(".tour-spotlight-cutout")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("data-mobile-placement", "top");
      const card = container.querySelector(".tutorial-mobile-sheet");
      expect(card.style.top).toBe("12px");
    });

    document.body.removeChild(lowTarget);
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: origWidth });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: origHeight });
  });
});
