import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme, THEMES } from "./ThemeContext";

function TestThemeConsumer() {
  const { theme, toggleTheme, isMinimalist, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-minimalist">{String(isMinimalist)}</span>
      <button type="button" onClick={toggleTheme} data-testid="toggle-btn">
        Toggle Theme
      </button>
      <button type="button" onClick={() => setTheme(THEMES.DEFAULT)} data-testid="set-default-btn">
        Set Default
      </button>
    </div>
  );
}

describe("ThemeContext and Minimalist Design System", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to minimalist theme and sets data-theme attribute on documentElement", () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.MINIMALIST);
    expect(screen.getByTestId("is-minimalist")).toHaveTextContent("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.MINIMALIST);
    expect(localStorage.getItem("neuropath_theme")).toBe(THEMES.MINIMALIST);
  });

  it("initializes from stored localStorage preference when available", () => {
    localStorage.setItem("neuropath_theme", THEMES.DEFAULT);

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.DEFAULT);
    expect(screen.getByTestId("is-minimalist")).toHaveTextContent("false");
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.DEFAULT);
  });

  it("toggles theme between minimalist and default on toggleTheme call", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");

    // Initially minimalist
    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.MINIMALIST);
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.MINIMALIST);

    // Toggle to default
    await user.click(toggleBtn);
    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.DEFAULT);
    expect(screen.getByTestId("is-minimalist")).toHaveTextContent("false");
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.DEFAULT);
    expect(localStorage.getItem("neuropath_theme")).toBe(THEMES.DEFAULT);

    // Toggle back to minimalist
    await user.click(toggleBtn);
    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.MINIMALIST);
    expect(screen.getByTestId("is-minimalist")).toHaveTextContent("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.MINIMALIST);
    expect(localStorage.getItem("neuropath_theme")).toBe(THEMES.MINIMALIST);
  });

  it("allows setting theme directly via setTheme", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-default-btn"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.DEFAULT);
    expect(document.documentElement.getAttribute("data-theme")).toBe(THEMES.DEFAULT);
  });

  it("provides safe fallback defaults when consumed outside ThemeProvider", () => {
    render(<TestThemeConsumer />);

    expect(screen.getByTestId("current-theme")).toHaveTextContent(THEMES.MINIMALIST);
    expect(screen.getByTestId("is-minimalist")).toHaveTextContent("true");
  });
});
