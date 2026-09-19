import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SkipLink from "./SkipLink";

describe("SkipLink component", () => {
  it("renders default skip link pointing to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link).toHaveClass("sr-only");
  });

  it("renders custom targetId and children text", () => {
    render(<SkipLink targetId="custom-content">Skip to content</SkipLink>);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#custom-content");
  });

  it("applies focus styles and extra class names", () => {
    render(<SkipLink className="custom-skip-class" />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveClass("custom-skip-class");
    expect(link).toHaveClass("sr-only");
    expect(link).toHaveClass("focus:not-sr-only");
  });

  it("can receive keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SkipLink />
        <button type="button">Next Element</button>
      </div>
    );

    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).not.toHaveFocus();

    await user.tab();
    expect(link).toHaveFocus();
  });
});
