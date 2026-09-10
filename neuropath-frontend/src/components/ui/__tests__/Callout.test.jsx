import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout } from "../Callout";

describe("Callout component", () => {
  it("renders with default info variant and children content", () => {
    render(<Callout>This is an informative notice.</Callout>);
    const alert = screen.getByRole("region");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("This is an informative notice.");
    expect(alert).toHaveClass("bg-blue-50/70", "border-blue-200");
  });

  it("renders title, custom icon, and action CTA", () => {
    render(
      <Callout
        title="Notice Title"
        icon={<span data-testid="custom-icon">ℹ️</span>}
        action={<button>Review</button>}
      >
        Detailed explanation text
      </Callout>
    );

    expect(screen.getByText("Notice Title")).toBeInTheDocument();
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByText("Detailed explanation text")).toBeInTheDocument();
  });

  it("renders error and warning variants with appropriate roles", () => {
    const { rerender } = render(<Callout variant="error">Something went wrong</Callout>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50/80", "text-red-900");

    rerender(<Callout variant="warning">Please proceed with caution</Callout>);
    expect(screen.getByRole("region")).toHaveClass("bg-amber-50/80", "text-amber-900");
  });

  it("renders success variant and applies custom className", () => {
    render(<Callout variant="success" className="custom-callout">Success message</Callout>);
    const region = screen.getByRole("region");
    expect(region).toHaveClass("bg-emerald-50/80", "text-emerald-900", "custom-callout");
    expect(region).toHaveTextContent("Success message");
  });
});
