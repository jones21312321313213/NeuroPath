import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function TestConsumer() {
  const { theme, isClaymorphism } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-clay">{isClaymorphism ? "true" : "false"}</span>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("provides claymorphism as the permanent universal system theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("claymorphism");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("claymorphism");
  });

  it("gracefully falls back to claymorphism when used outside ThemeProvider", () => {
    render(<TestConsumer />);

    expect(screen.getByTestId("current-theme")).toHaveTextContent("claymorphism");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("true");
  });
});
