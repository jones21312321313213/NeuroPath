import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import UnsavedChangesModal from "../UnsavedChangesModal";

describe("UnsavedChangesModal", () => {
  it("renders dialog when isOpen is true", () => {
    render(
      <UnsavedChangesModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /unsaved changes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to leave this page/i)
    ).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <UnsavedChangesModal
        isOpen={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onCancel when 'Stay on Page' is clicked", () => {
    const handleCancel = vi.fn();
    render(
      <UnsavedChangesModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /stay on page/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when 'Discard & Leave' is clicked", () => {
    const handleConfirm = vi.fn();
    render(
      <UnsavedChangesModal
        isOpen={true}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /discard & leave/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape key is pressed", () => {
    const handleCancel = vi.fn();
    render(
      <UnsavedChangesModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
