import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ValidationModal } from "../ValidationModal";

describe("ValidationModal", () => {
  const mockErrors = [
    { field: "Student Name", message: "Student name should contain letters only." },
    { field: "Difficulty Markers", message: "Please select at least one difficulty marker." },
  ];

  it("does not render when isOpen is false", () => {
    render(
      <ValidationModal
        isOpen={false}
        errors={mockErrors}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders modal dialog with specific missing and invalid fields when isOpen is true", () => {
    render(
      <ValidationModal
        isOpen={true}
        title="Required Information Missing"
        errors={mockErrors}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Required Information Missing")).toBeInTheDocument();
    expect(screen.getByText("Student Name")).toBeInTheDocument();
    expect(screen.getByText("Student name should contain letters only.")).toBeInTheDocument();
    expect(screen.getByText("Difficulty Markers")).toBeInTheDocument();
    expect(screen.getByText("Please select at least one difficulty marker.")).toBeInTheDocument();
  });

  it("calls onClose when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <ValidationModal
        isOpen={true}
        errors={mockErrors}
        onClose={handleClose}
      />
    );

    const btn = screen.getByRole("button", { name: /review & correct/i });
    await user.click(btn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
