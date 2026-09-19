import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../../context/ThemeContext";
import ClaymorphismShowcase from "../ClaymorphismShowcase";
import { runAxeAudit } from "../../../test/a11y-helper";

// Regex matching common emojis
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

describe("ClaymorphismShowcase Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders showcase with brand palette and sample components", () => {
    render(
      <ThemeProvider>
        <ClaymorphismShowcase />
      </ThemeProvider>
    );

    // Title & Header
    expect(
      screen.getByRole("heading", { name: /claymorphism style system prototype/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/issue #185 spike/i)).toBeInTheDocument();

    // Brand Palette Swatches
    expect(screen.getByText("#5aabf0")).toBeInTheDocument();
    expect(screen.getByText("#3d9de8")).toBeInTheDocument();
    expect(screen.getByText("#1e6fbf")).toBeInTheDocument();
    expect(screen.getByText("#f0f4f9")).toBeInTheDocument();
    expect(screen.getByText("#ffffff")).toBeInTheDocument();
    expect(screen.getByText("#1e293b")).toBeInTheDocument();
    expect(screen.getByText("#64748b")).toBeInTheDocument();
    expect(screen.getByText("#0284c7")).toBeInTheDocument();

    // Sample Buttons
    expect(screen.getByRole("button", { name: /clay primary action/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clay secondary pill/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /standard submit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /standard back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disabled state/i })).toBeDisabled();

    // Sample Inputs
    expect(screen.getByLabelText(/student full name:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grade \/ learning tier:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/behavioral & sensory observations:/i)).toBeInTheDocument();
  });

  it("displays permanent system-wide claymorphism indicators without toggle buttons", () => {
    render(
      <ThemeProvider>
        <ClaymorphismShowcase />
      </ThemeProvider>
    );

    expect(screen.getByText(/claymorphism active system-wide/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch to.*theme/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("contains zero emojis across all rendered text and attributes", () => {
    const { container } = render(
      <ThemeProvider>
        <ClaymorphismShowcase />
      </ThemeProvider>
    );

    const text = container.textContent || "";
    expect(EMOJI_REGEX.test(text)).toBe(false);
  });

  it("passes axe accessibility audit with zero violations", async () => {
    const { container } = render(
      <ThemeProvider>
        <ClaymorphismShowcase />
      </ThemeProvider>
    );

    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });
});
