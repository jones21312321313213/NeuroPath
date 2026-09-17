import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeContext";

function TestConsumer() {
  const { theme, isClaymorphism, toggleTheme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-clay">{isClaymorphism ? "true" : "false"}</span>
      <button type="button" onClick={toggleTheme} data-testid="toggle-btn">
        Toggle Theme
      </button>
      <button
        type="button"
        onClick={() => setTheme("claymorphism")}
        data-testid="set-clay-btn"
      >
        Set Claymorphism
      </button>
      <button
        type="button"
        onClick={() => setTheme("default")}
        data-testid="set-default-btn"
      >
        Set Default
      </button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("provides default theme initially when no localStorage is present", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("default");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("false");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("loads stored theme from localStorage", () => {
    localStorage.setItem("neuropath_theme", "claymorphism");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("claymorphism");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("claymorphism");
  });

  it("toggles between default and claymorphism", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");

    await user.click(toggleBtn);
    expect(screen.getByTestId("current-theme")).toHaveTextContent("claymorphism");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("claymorphism");
    expect(localStorage.getItem("neuropath_theme")).toBe("claymorphism");

    await user.click(toggleBtn);
    expect(screen.getByTestId("current-theme")).toHaveTextContent("default");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("false");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(localStorage.getItem("neuropath_theme")).toBe("default");
  });

  it("allows explicitly setting theme via setTheme", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-clay-btn"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("claymorphism");
    expect(document.documentElement.getAttribute("data-theme")).toBe("claymorphism");

    await user.click(screen.getByTestId("set-default-btn"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("default");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("gracefully falls back when used outside ThemeProvider", () => {
    render(<TestConsumer />);

    expect(screen.getByTestId("current-theme")).toHaveTextContent("default");
    expect(screen.getByTestId("is-clay")).toHaveTextContent("false");
  });
});
