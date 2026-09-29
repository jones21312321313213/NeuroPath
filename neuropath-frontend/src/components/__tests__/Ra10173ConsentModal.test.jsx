import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Ra10173ConsentModal } from "../Ra10173ConsentModal";
import { studentsAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  studentsAPI: {
    exportConsentPDF: vi.fn(),
  },
}));

describe("Ra10173ConsentModal", () => {
  const handleClose = vi.fn();
  const handleConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => "blob:mock-consent-pdf");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders when isOpen is true with full RA 10173 statutory disclosures", () => {
    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(
      screen.getByRole("heading", { name: /Republic Act 10173/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Data Privacy Act of 2012/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/1\. Categories of Sensitive Personal Information Collected/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2\. Educational Purposes of Data Processing/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3\. Automated AI Processing & Safeguards/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/4\. Data Retention, Storage & Confidentiality/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/5\. Statutory Rights of the Parent \/ Legal Guardian/i)
    ).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <Ra10173ConsentModal
        isOpen={false}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(
      screen.queryByText(/Republic Act 10173/i)
    ).not.toBeInTheDocument();
  });

  it("calls onConfirm and onClose when 'I Have Read & Understood the Terms' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", {
      name: /i have read & understood the terms/i,
    });
    expect(confirmBtn).toBeInTheDocument();

    await user.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("downloads PDF when 'Download Consent PDF' is clicked with form props", async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    studentsAPI.exportConsentPDF.mockResolvedValueOnce(mockBlob);

    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        learnerName="Ethan Carter"
        guardianName="Maria Carter"
        guardianRelationship="Mother"
        school="Cebu City Central SPED Center"
        schoolYear="2026-2027"
        consentDate="2026-09-29"
      />
    );

    const downloadBtn = screen.getByRole("button", {
      name: /download consent pdf/i,
    });
    expect(downloadBtn).toBeInTheDocument();

    await user.click(downloadBtn);

    expect(studentsAPI.exportConsentPDF).toHaveBeenCalledTimes(1);
    expect(studentsAPI.exportConsentPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerName: "Ethan Carter",
        guardianName: "Maria Carter",
        guardianRelationship: "Mother",
        school: "Cebu City Central SPED Center",
        schoolYear: "2026-2027",
        consentDate: "2026-09-29",
      })
    );
  });

  it("downloads PDF using student ID when student object with pk is provided", async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    studentsAPI.exportConsentPDF.mockResolvedValueOnce(mockBlob);

    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        student={{ studentID: 42, name: "Sophia Ramirez" }}
        readOnly={true}
      />
    );

    const downloadBtn = screen.getByRole("button", {
      name: /download consent pdf/i,
    });
    await user.click(downloadBtn);

    expect(studentsAPI.exportConsentPDF).toHaveBeenCalledWith(42);
  });

  it("displays error message when PDF download fails", async () => {
    const user = userEvent.setup();
    studentsAPI.exportConsentPDF.mockRejectedValueOnce(
      new Error("Failed to export RA 10173 Consent Certificate PDF.")
    );

    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
      />
    );

    const downloadBtn = screen.getByRole("button", {
      name: /download consent pdf/i,
    });
    await user.click(downloadBtn);

    expect(
      await screen.findByText(/Failed to export RA 10173 Consent Certificate PDF/i)
    ).toBeInTheDocument();
  });

  it("calls onClose when Close dialog button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const closeDialogBtn = screen.getByRole("button", { name: /close dialog/i });
    await user.click(closeDialogBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("renders learner and guardian metadata across modal and print layouts when passed via props", () => {
    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        learnerName="Ethan Carter"
        guardianName="Maria Carter"
        guardianRelationship="Mother"
        school="Cebu City Central SPED Center"
        schoolYear="2026-2027"
        consentDate="2026-09-29"
      />
    );

    // Appears in both screen card and print certificate
    expect(screen.getAllByText("Ethan Carter").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maria Carter").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Mother/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cebu City Central SPED Center").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2026-09-29").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Learner & Legal Guardian Record/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Department of Education/i).length).toBeGreaterThanOrEqual(1);
  });

  it("extracts student metadata from student object prop", () => {
    const student = {
      name: "Sophia Ramirez",
      guardian_name: "Roberto Ramirez",
      guardian_relationship: "Father",
      school: "Davao SPED High School",
      school_year: "2026-2027",
      grade: "Grade 4",
      consent_date: "2026-09-20",
      parental_consent_obtained: true,
    };

    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        student={student}
        readOnly={true}
      />
    );

    expect(screen.getAllByText("Sophia Ramirez").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Roberto Ramirez").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Father/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Consent Document|Consent Verified/i)).toBeInTheDocument();
  });

  it("hides agreement button and shows Close button in readOnly mode", () => {
    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        readOnly={true}
      />
    );

    expect(
      screen.queryByRole("button", { name: /i have read & understood the terms/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^close$/i })
    ).toBeInTheDocument();
  });
});
