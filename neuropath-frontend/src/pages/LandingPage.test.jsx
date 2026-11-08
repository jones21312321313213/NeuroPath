import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./landingPage";

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("LandingPage Component", () => {
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

    // Version badge & Release Notes button in top right navbar
    expect(screen.getByRole("button", { name: /view version v1\.2\.0 changelog/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release Notes" })).toBeInTheDocument();
  });
});
