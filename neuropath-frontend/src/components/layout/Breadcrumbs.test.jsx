import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Breadcrumbs from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders a list of breadcrumb items with links and terminal current page", () => {
    const items = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Student Profiling", to: "/dashboard/students" },
      { label: "Student Detail" },
    ];

    render(
      <BrowserRouter>
        <Breadcrumbs items={items} />
      </BrowserRouter>
    );

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const profilingLink = screen.getByRole("link", { name: "Student Profiling" });
    expect(profilingLink).toHaveAttribute("href", "/dashboard/students");

    const currentItem = screen.getByText("Student Detail");
    expect(currentItem).toHaveAttribute("aria-current", "page");
    expect(currentItem.tagName).not.toBe("A");
  });

  it("handles legacy string breadcrumbs gracefully", () => {
    render(
      <BrowserRouter>
        <Breadcrumbs items="DASHBOARD / Home" />
      </BrowserRouter>
    );

    expect(screen.getByText("DASHBOARD / Home")).toBeInTheDocument();
  });

  it("renders separators between multiple items with aria-hidden", () => {
    const items = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Settings" },
    ];

    const { container } = render(
      <BrowserRouter>
        <Breadcrumbs items={items} />
      </BrowserRouter>
    );

    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBeGreaterThan(0);
  });
});
