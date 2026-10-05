import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("Modal component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} title="Modal Title">
        Modal Content
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true with title, children, and footer", () => {
    render(
      <Modal
        isOpen={true}
        title="Modal Title"
        footer={<button>Submit</button>}
      >
        Modal Content
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Title">
        Content
      </Modal>
    );

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={true} title="Title">
        Content
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on backdrop click when closeOnBackdrop is true", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdrop={true} title="Title">
        <div>Modal Body Inside</div>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on backdrop click when closeOnBackdrop is false", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdrop={false} title="Title">
        <div>Modal Body Inside</div>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("does not call onClose when clicking inside the modal dialog box", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnBackdrop={true} title="Title">
        <div>Modal Body Content</div>
      </Modal>
    );

    const bodyContent = screen.getByText("Modal Body Content");
    await user.click(bodyContent);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("sets proper dialog accessibility attributes", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Accessible Title">
        <p>Dialog Body</p>
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-dialog-title");

    const titleElement = screen.getByText("Accessible Title");
    expect(titleElement).toHaveAttribute("id", "modal-dialog-title");

    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    expect(closeBtn).toBeInTheDocument();
  });

  it("does not call onClose when Escape is pressed if closeOnEsc is false", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={false} title="Title">
        Content
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("focuses the first focusable element upon opening and traps focus with Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button data-testid="outside-trigger">Open</button>
        <Modal
          isOpen={true}
          onClose={vi.fn()}
          title="Trap Test"
          footer={<button data-testid="modal-save">Save</button>}
        >
          <input data-testid="modal-input" placeholder="Type here" />
        </Modal>
      </div>
    );

    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const input = screen.getByTestId("modal-input");
    const saveBtn = screen.getByTestId("modal-save");

    // Close button is the first focusable element inside modal
    expect(document.activeElement).toBe(closeBtn);

    // Tab -> input
    await user.tab();
    expect(document.activeElement).toBe(input);

    // Tab -> saveBtn
    await user.tab();
    expect(document.activeElement).toBe(saveBtn);

    // Tab on last element wraps back to first element (closeBtn)
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab wraps back to last element (saveBtn)
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(saveBtn);
  });

  it("restores focus to previous active element upon deactivation", () => {
    const trigger = document.createElement("button");
    trigger.setAttribute("id", "test-trigger");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Focus Restore Test">
        <button data-testid="inside-btn">Inside</button>
      </Modal>
    );

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Focus Restore Test">
        <button data-testid="inside-btn">Inside</button>
      </Modal>
    );

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
