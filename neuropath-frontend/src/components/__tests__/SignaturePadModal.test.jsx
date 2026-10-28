import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SignaturePadModal from "../SignaturePadModal";

describe("SignaturePadModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SignaturePadModal isOpen={false} onClose={vi.fn()} onConfirmExport={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with teacher and student names when isOpen is true", () => {
    render(
      <SignaturePadModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmExport={vi.fn()}
        teacherName="John Doe"
        studentName="Jane Smith"
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Official Document Signature")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip \(sign with pen\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign & export pdf/i })).toBeDisabled();
  });

  it("clicking 'Skip (Sign with Pen)' calls onConfirmExport with null", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <SignaturePadModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmExport={handleConfirm}
      />
    );

    const skipBtn = screen.getByRole("button", { name: /skip \(sign with pen\)/i });
    await user.click(skipBtn);
    expect(handleConfirm).toHaveBeenCalledWith(null);
  });

  it("calls onClose when Close/Cancel buttons are clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <SignaturePadModal
        isOpen={true}
        onClose={handleClose}
        onConfirmExport={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole("button", { name: /close signature modal/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
