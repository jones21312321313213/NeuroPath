import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAxeAudit } from "./a11y-helper";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import Topbar from "../components/layout/Topbar";
import Sidebar from "../components/layout/Sidebar";
import SkipLink from "../components/layout/SkipLink";
import CreateStudentProfile from "../pages/CreateStudentProfile";
import UpdateStudentProfile from "../pages/StudentProfiling/UpdateStudentProfile";
import { AuthProvider } from "../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { studentsAPI } from "../api/client";

vi.mock("../api/client", () => ({
  studentsAPI: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
  usersAPI: {
    updateProfile: vi.fn(),
    completeTutorial: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const mockStudent = {
  id: "student-123",
  name: "Maria Clara",
  age: 9,
  grade: 3,
  gender: "Female",
  diagnosis: "Autism Spectrum Disorder",
  support_needs: "Visual schedule",
  assessmentResult: "Standard evaluation",
  profileDetails: {
    school: "Central School",
    schoolYear: "2025 - 2026",
    learnerName: "Maria Clara",
    birthdate: "05-12-2017",
    disabilityCategory: "Autism Spectrum Disorder",
    diagnosisDetails: "ASD Level 1",
    difficultyMarkers: ["Difficulty in Seeing"],
    presentEvaluation: "Good auditory comprehension",
    academicStrengths: "Math calculation",
    academicNeeds: "Reading comprehension",
    parentalConcerns: "Social interaction",
    curriculumImpact: "Requires visual aids",
  },
};

describe("Automated WCAG 2.1 AA Accessibility Audit (axe-core)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({
        id: 1,
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@test.com",
      })
    );
  });

  it("Button primitives (all variants & disabled states) have zero axe violations", async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary Action</Button>
        <Button variant="secondary">Secondary Action</Button>
        <Button variant="outline">Outline Action</Button>
        <Button variant="danger">Danger Action</Button>
        <Button disabled>Disabled Action</Button>
      </div>
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("SkipLink component has zero axe violations", async () => {
    const { container } = render(
      <div>
        <SkipLink targetId="main-content">Skip to main content</SkipLink>
        <main id="main-content">
          <h1>Main Content Area</h1>
        </main>
      </div>
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Topbar header landmark (<header role='banner'>) has zero axe violations", async () => {
    const { container } = renderWithProviders(
      <Topbar breadcrumb="DASHBOARD / Home" />
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Sidebar navigation landmark (<aside>, <nav aria-label='Main Navigation'>) has zero axe violations", async () => {
    const { container } = renderWithProviders(<Sidebar collapsed={false} />);
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Sidebar collapsed state has zero axe violations", async () => {
    const { container } = renderWithProviders(<Sidebar collapsed={true} />);
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("Modal dialog (<Modal>) has zero axe violations", async () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Student Details Dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => {}}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => {}}>
              Save Changes
            </Button>
          </>
        }
      >
        <p>Accessible modal dialog content body.</p>
      </Modal>
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("CreateStudentProfile form has zero axe violations", async () => {
    const { container } = renderWithProviders(
      <CreateStudentProfile onBack={() => {}} />
    );
    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });

  it("UpdateStudentProfile form has zero axe violations", async () => {
    studentsAPI.get.mockResolvedValueOnce({ data: mockStudent });
    const { container } = renderWithProviders(
      <UpdateStudentProfile studentId="student-123" onBack={() => {}} />
    );

    // Wait for student profile data to populate
    await screen.findByDisplayValue("Maria Clara");

    const results = await runAxeAudit(container);
    expect(results.violations).toEqual([]);
  });
});
