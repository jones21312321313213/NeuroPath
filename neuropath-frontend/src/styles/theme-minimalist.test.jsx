import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Topbar from "../components/layout/Topbar";
import Sidebar from "../components/layout/Sidebar";
import Card from "../components/ui/Card";
import { ThemeProvider } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Minimalist Style System Spike (Issue #184)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    useAuth.mockReturnValue({
      user: { first_name: "Jane", last_name: "Doe" },
      logout: vi.fn(),
    });
  });

  describe("theme-minimalist.css file & design tokens", () => {
    const cssPath = path.resolve(__dirname, "./theme-minimalist.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    it("defines exact brand palette CSS variables", () => {
      expect(cssContent).toContain("--color-brand-primary: #5aabf0");
      expect(cssContent).toContain("--color-brand-action: #3d9de8");
      expect(cssContent).toContain("--color-focus-ring: #0284c7");
      expect(cssContent).toContain("--color-page-bg: #f9f7f7");
      expect(cssContent).toContain("--color-card-surface: #ffffff");
      expect(cssContent).toContain("--color-text-primary: #1e293b");
      expect(cssContent).toContain("--color-text-secondary: #64748b");
      expect(cssContent).toContain("--color-border-subtle: #e2e8f0");
      expect(cssContent).toContain("--color-border-strong: #cbd5e1");
    });

    it("defines hairline borders and ultra-subtle box-shadow surfaces", () => {
      expect(cssContent).toContain("1px solid #e2e8f0");
      expect(cssContent).toContain("0 1px 2px rgba(0, 0, 0, 0.04)");
    });

    it("defines high breathing room content padding tokens (16px to 24px)", () => {
      expect(cssContent).toContain("--space-content-padding: 24px");
      expect(cssContent).toContain("--space-card-padding: 24px");
      expect(cssContent).toContain("--space-compact-padding: 16px");
    });

    it("enforces WCAG 2.1 AA accessible focus rings (2px solid #0284c7, 2px offset)", () => {
      expect(cssContent).toContain("outline: 2px solid #0284c7");
      expect(cssContent).toContain("outline-offset: 2px");
    });

    it("contains zero emojis anywhere in theme-minimalist.css", () => {
      const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
      expect(emojiRegex.test(cssContent)).toBe(false);
    });
  });

  describe("Topbar minimalist theme toggle", () => {
    it("renders theme toggle button with clean SVG icon and accessible label", () => {
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Topbar breadcrumb="DASHBOARD / Home" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const toggleBtn = screen.getByRole("button", { name: /toggle theme: minimalist/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
      expect(toggleBtn.querySelector("svg")).toBeInTheDocument();
    });

    it("toggles minimalist theme state on click", async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter>
            <Topbar breadcrumb="DASHBOARD / Home" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const toggleBtn = screen.getByRole("button", { name: /toggle theme: minimalist/i });
      expect(toggleBtn).toHaveAttribute("aria-pressed", "true");

      await user.click(toggleBtn);

      const defaultBtn = screen.getByRole("button", { name: /toggle theme: default/i });
      expect(defaultBtn).toHaveAttribute("aria-pressed", "false");
      expect(document.documentElement.getAttribute("data-theme")).toBe("default");
    });
  });

  describe("Sidebar Lucide SVG icon adoption & zero emojis", () => {
    it("renders Sidebar navigation landmarks with clean SVG icons and zero emojis", () => {
      const { container } = render(
        <ThemeProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Sidebar collapsed={false} onToggleCollapse={vi.fn()} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const navButtons = screen.getAllByRole("button");
      navButtons.forEach((btn) => {
        // Assert no emoji characters in button text
        const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
        expect(emojiRegex.test(btn.textContent || "")).toBe(false);
      });

      // Assert SVG icons are rendered inside navigation items
      const svgs = container.querySelectorAll("svg.sidebar-icon");
      expect(svgs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Card component minimalist styling integration", () => {
    it("renders standard Card with ui-card semantic classes and hairline border", () => {
      render(
        <Card data-testid="test-card">
          <Card.Header data-testid="test-card-header">Header</Card.Header>
          <Card.Body data-testid="test-card-body">Content</Card.Body>
          <Card.Footer data-testid="test-card-footer">Footer</Card.Footer>
        </Card>
      );

      const card = screen.getByTestId("test-card");
      expect(card).toHaveClass("ui-card", "bg-white", "rounded-xl", "border");

      const header = screen.getByTestId("test-card-header");
      expect(header).toHaveClass("ui-card-header");

      const body = screen.getByTestId("test-card-body");
      expect(body).toHaveClass("ui-card-body");

      const footer = screen.getByTestId("test-card-footer");
      expect(footer).toHaveClass("ui-card-footer");
    });
  });
});
