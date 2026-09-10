import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";
import { Button } from "../Button";

describe("EmptyState component", () => {
  it("renders with title and description", () => {
    render(
      <EmptyState
        title="No Students Found"
        description="Try adjusting your search criteria or add a new student."
      />
    );

    expect(screen.getByText("No Students Found")).toBeInTheDocument();
    expect(screen.getByText(/adjusting your search criteria/i)).toBeInTheDocument();
  });

  it("renders custom icon and action CTA button", () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">📁</span>}
        title="No Records"
        description="Create your first record to get started."
        action={<Button>Create Record</Button>}
      />
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create record/i })).toBeInTheDocument();
  });
});
