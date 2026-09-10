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
});
