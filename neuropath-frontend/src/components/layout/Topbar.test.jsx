import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders breadcrumb, profile button, and clay theme toggle", () => {
    renderTopbar();

    expect(screen.getByText("DASHBOARD / Home")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view user profile/i })
    ).toBeInTheDocument();

    const themeBtn = screen.getByRole("button", {
      name: /switch to claymorphism theme/i,
    });
    expect(themeBtn).toBeInTheDocument();
    expect(themeBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles claymorphism theme when theme toggle button is clicked", async () => {
    const user = userEvent.setup();
    renderTopbar();

    const themeBtn = screen.getByRole("button", {
      name: /switch to claymorphism theme/i,
    });

    await user.click(themeBtn);

    expect(document.documentElement.getAttribute("data-theme")).toBe("claymorphism");
    expect(
      screen.getByRole("button", { name: /switch to default theme/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to default theme/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // Toggle back
    await user.click(screen.getByRole("button", { name: /switch to default theme/i }));
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("contains no emojis anywhere in rendered HTML", () => {
    const { container } = renderTopbar();
    expect(EMOJI_REGEX.test(container.textContent || "")).toBe(false);
  });
});
