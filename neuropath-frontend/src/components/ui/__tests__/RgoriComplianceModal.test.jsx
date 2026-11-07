import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RgoriComplianceModal } from "../RgoriComplianceModal";

describe("RgoriComplianceModal", () => {
  const mockAudit = {
    total_score: 88,
    status: "Exemplary",
    compliant: true,
    feedback: "Exemplary SMART ABCD alignment across all 4 pedagogical R-GORI criteria.",
    breakdown: {
      measurability: {
        score: 24,
        explanation: "Employs clear observable action verb ('transition') with verifiable execution boundaries.",
      },
      functionality: {
        score: 23,
        explanation: "Directly facilitates student access, interaction, and essential independence in daily classroom routines.",
      },
      generality: {
        score: 21,
        explanation: "Targets a generic behavioral competency that readily generalizes across settings.",
      },
      instructional_context: {
        score: 20,
        explanation: "Expressed in clean, jargon-free pedagogical language directly teachable by general ed teachers.",
      },
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    goalTitle: "Social-Emotional Skills",
    annualGoal: "Given visual schedule strips, Alex will independently transition between classroom activities with 80% accuracy.",
    audit: mockAudit,
  };

  it("renders modal dialog when isOpen is true with score and status badge", () => {
    render(<RgoriComplianceModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("R-GORI Pedagogical Compliance Audit")).toBeInTheDocument();
    expect(screen.getByText("88/100")).toBeInTheDocument();
    expect(screen.getByText("Exemplary")).toBeInTheDocument();
  });

  it("renders 4-dimension criteria breakdown with scores and pedagogical explanations", () => {
    render(<RgoriComplianceModal {...defaultProps} />);

    expect(screen.getByText("Measurability")).toBeInTheDocument();
    expect(screen.getByText("24/25")).toBeInTheDocument();
    expect(
      screen.getByText(/Employs clear observable action verb \('transition'\)/)
    ).toBeInTheDocument();

    expect(screen.getByText("Functionality")).toBeInTheDocument();
    expect(screen.getByText("23/25")).toBeInTheDocument();
    expect(
      screen.getByText(/Directly facilitates student access, interaction/)
    ).toBeInTheDocument();

    expect(screen.getByText("Generality")).toBeInTheDocument();
    expect(screen.getByText("21/25")).toBeInTheDocument();
    expect(
      screen.getByText(/Targets a generic behavioral competency/)
    ).toBeInTheDocument();

    expect(screen.getByText("Instructional Context")).toBeInTheDocument();
    expect(screen.getByText("20/25")).toBeInTheDocument();
    expect(
      screen.getByText(/Expressed in clean, jargon-free pedagogical language/)
    ).toBeInTheDocument();
  });

  it("renders the target annual goal and does not render the removed pedagogical feedback block", () => {
    render(<RgoriComplianceModal {...defaultProps} />);

    expect(
      screen.getByText(/Given visual schedule strips, Alex will independently transition/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Pedagogical Review Summary/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Exemplary SMART ABCD alignment across all 4 pedagogical R-GORI criteria/)
    ).not.toBeInTheDocument();
  });

  it("does not render modal when isOpen is false", () => {
    render(<RgoriComplianceModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(<RgoriComplianceModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: /close audit/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
