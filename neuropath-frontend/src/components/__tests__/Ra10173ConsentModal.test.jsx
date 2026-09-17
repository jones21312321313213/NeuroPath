import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Ra10173ConsentModal } from "../Ra10173ConsentModal";

describe("Ra10173ConsentModal", () => {
  const handleClose = vi.fn();
  const handleConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("invokes window.print when 'Print / Export Copy' is clicked", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <Ra10173ConsentModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const printBtn = screen.getByRole("button", {
      name: /print \/ export copy/i,
    });
    expect(printBtn).toBeInTheDocument();

    await user.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
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
});
