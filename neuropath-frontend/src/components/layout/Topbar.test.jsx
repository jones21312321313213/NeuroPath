import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Topbar from "./Topbar";
import { AuthProvider } from "../../context/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

function renderTopbar(props = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <Topbar breadcrumb="DASHBOARD / Home" {...props} />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe("Topbar Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders breadcrumb and profile button with claymorphic styling", () => {
    renderTopbar();

    expect(screen.getByText("DASHBOARD / Home")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view user profile/i })
    ).toBeInTheDocument();
  });

  it("does not render a theme toggle button since claymorphism is permanent system-wide", () => {
    renderTopbar();

    expect(
      screen.queryByRole("button", { name: /switch to.*theme/i })
    ).not.toBeInTheDocument();
  });

  it("contains no emojis anywhere in rendered HTML", () => {
    const { container } = renderTopbar();
    expect(EMOJI_REGEX.test(container.textContent || "")).toBe(false);
  });
});
