import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./landingPage";

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("LandingPage Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders hero title, feature sections, and authentic Progress Dashboard preview card", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    // Hero title & subtitle
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Every student/i);
    expect(screen.getAllByText(/Individualized Education Plans/i).length).toBeGreaterThanOrEqual(1);

    // Progress Dashboard preview card topbar & status
    expect(screen.getByText("Progress Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Active IEP/i)).toBeInTheDocument();

    // Student profile
    expect(screen.getByText("Angelo Singson")).toBeInTheDocument();
    expect(screen.getByText("Grade 1 · SPED Learner")).toBeInTheDocument();
    expect(screen.getAllByText("On Track").length).toBeGreaterThanOrEqual(1);

    // Classroom Executive KPIs
    expect(screen.getByText("Mastery Rate")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Goals on Track")).toBeInTheDocument();
    expect(screen.getAllByText("Needs Support").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Target Benchmark")).toBeInTheDocument();

    // DepEd Learning Domains
    expect(screen.getByText("DepEd Learning Domains")).toBeInTheDocument();
    expect(screen.getByText("70% Target Benchmark")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("Social Skills")).toBeInTheDocument();

    // Features section
    expect(screen.getByText("Lesson Plan Management")).toBeInTheDocument();
    expect(screen.getByText("Visual Aid Management")).toBeInTheDocument();
    expect(screen.getByText("Outcome Monitoring")).toBeInTheDocument();

    // Version popup & Release Notes button
    expect(screen.getByRole("button", { name: /view version v1\.2\.1 changelog/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release Notes" })).toBeInTheDocument();
  });

  it("shows top-right version popup for 5 seconds and keeps it open while hovered", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const popup = screen.getByRole("status", { name: /latest version release popup/i });
    expect(popup).toBeInTheDocument();

    // Hovering pauses the 5-second auto-dismiss
    fireEvent.mouseEnter(popup);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByRole("status", { name: /latest version release popup/i })).toBeInTheDocument();

    // Unhovering resumes the 5-second auto-dismiss
    fireEvent.mouseLeave(popup);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("status", { name: /latest version release popup/i })).not.toBeInTheDocument();
  });

  it("toggles mobile navigation drawer when hamburger button is clicked", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByTestId("mobile-menu-toggle-btn");
    expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("mobile-menu-drawer")).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId("mobile-menu-drawer")).not.toBeInTheDocument();
  });

  it("does not show version popup if user has already seen the current release version in localStorage", () => {
    localStorage.setItem("neuropath_last_seen_release", "v1.2.1");
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("status", { name: /latest version release popup/i })).not.toBeInTheDocument();
  });

  it("records current release version in localStorage upon dismissal", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const dismissBtn = screen.getByRole("button", { name: /dismiss version popup/i });
    expect(screen.getByRole("status", { name: /latest version release popup/i })).toBeInTheDocument();

    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("status", { name: /latest version release popup/i })).not.toBeInTheDocument();
    expect(localStorage.getItem("neuropath_last_seen_release")).toBe("v1.2.1");
  });
});
