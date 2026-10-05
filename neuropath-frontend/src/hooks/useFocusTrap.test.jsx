import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

function TrapComponent({ onEscape, returnFocus = true, hasFocusables = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useFocusTrap({
    isActive: isOpen,
    containerRef,
    onEscape: () => {
      onEscape?.();
      setIsOpen(false);
    },
    returnFocus,
  });

  return (
    <div>
      <button
        type="button"
        id="trigger-btn"
        onClick={() => setIsOpen(true)}
      >
        Open Dialog
      </button>

      {isOpen && (
        <div ref={containerRef} tabIndex={-1} data-testid="dialog-container">
          {hasFocusables ? (
            <>
              <button type="button" id="first-btn">
                First
              </button>
              <input type="text" id="middle-input" placeholder="Middle" />
              <button type="button" id="last-btn">
                Last
              </button>
            </>
          ) : (
            <p>No focusable elements</p>
          )}
        </div>
      )}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("focuses the first focusable element when opened", async () => {
    const user = userEvent.setup();
    render(<TrapComponent />);

    const trigger = screen.getByRole("button", { name: "Open Dialog" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("traps focus inside the container on Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<TrapComponent />);

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    const firstBtn = screen.getByRole("button", { name: "First" });
    const middleInput = screen.getByPlaceholderText("Middle");
    const lastBtn = screen.getByRole("button", { name: "Last" });

    expect(firstBtn).toHaveFocus();

    await user.tab();
    expect(middleInput).toHaveFocus();

    await user.tab();
    expect(lastBtn).toHaveFocus();

    // Tab on last element should wrap around to first
    await user.tab();
    expect(firstBtn).toHaveFocus();

    // Shift+Tab on first element should wrap backwards to last
    await user.tab({ shift: true });
    expect(lastBtn).toHaveFocus();
  });

  it("calls onEscape when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleEscape = vi.fn();
    render(<TrapComponent onEscape={handleEscape} />);

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    expect(screen.getByTestId("dialog-container")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it("restores focus to trigger element when unmounted/closed", async () => {
    const user = userEvent.setup();
    render(<TrapComponent returnFocus={true} />);

    const trigger = screen.getByRole("button", { name: "Open Dialog" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("does not restore focus if returnFocus is false", async () => {
    const user = userEvent.setup();
    render(<TrapComponent returnFocus={false} />);

    const trigger = screen.getByRole("button", { name: "Open Dialog" });
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).not.toHaveFocus();
  });

  it("focuses container if there are no focusable children", async () => {
    const user = userEvent.setup();
    render(<TrapComponent hasFocusables={false} />);

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    const container = screen.getByTestId("dialog-container");
    expect(container).toHaveFocus();
  });
});
