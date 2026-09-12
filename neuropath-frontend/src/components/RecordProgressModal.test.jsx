import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecordProgressModal from "./RecordProgressModal";
import { trackingAPI } from "../api/client";

vi.mock("../api/client", () => ({
  trackingAPI: {
    recordProgress: vi.fn(),
  },
}));

describe("RecordProgressModal", () => {
  const mockStudent = { studentID: 1, name: "Alice Wonderland" };
  const mockSubjects = [{ name: "Mathematics" }, { name: "Communication" }];
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <RecordProgressModal
        isOpen={false}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    expect(screen.queryByText(/Log Student Progress/i)).not.toBeInTheDocument();
  });

  it("renders modal form when isOpen is true with student details", () => {
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText(/Log Student Progress/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Wonderland")).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain \/ Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Performance Score/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Evaluation Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Observation Notes/i)).toBeInTheDocument();
  });

  it("allows selecting a preset domain and entering custom domain", async () => {
    const user = userEvent.setup();
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const subjectSelect = screen.getByLabelText(/Domain \/ Subject/i);
    await user.selectOptions(subjectSelect, "Mathematics");
    expect(subjectSelect.value).toBe("Mathematics");

    // Select custom option
    await user.selectOptions(subjectSelect, "__custom__");
    const customInput = screen.getByPlaceholderText(/Enter custom subject/i);
    expect(customInput).toBeInTheDocument();
    fireEvent.change(customInput, { target: { value: "Speech Therapy" } });
    expect(customInput.value).toBe("Speech Therapy");
  });

  it("updates score preview level dynamically", () => {
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    fireEvent.change(scoreInput, { target: { value: "35" } });
    expect(screen.getByText(/Emerging/i)).toBeInTheDocument();

    fireEvent.change(scoreInput, { target: { value: "65" } });
    expect(screen.getByText(/Developing/i)).toBeInTheDocument();

    fireEvent.change(scoreInput, { target: { value: "85" } });
    expect(screen.getByText(/Proficient/i)).toBeInTheDocument();

    fireEvent.change(scoreInput, { target: { value: "95" } });
    expect(screen.getByText(/Advanced/i)).toBeInTheDocument();
  });

  it("validates score bounds and prevents invalid submission", async () => {
    const user = userEvent.setup();
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    fireEvent.change(scoreInput, { target: { value: "150" } });

    const submitBtn = screen.getByRole("button", { name: /Save Progress/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Score must be between 0 and 100/i)).toBeInTheDocument();
    expect(trackingAPI.recordProgress).not.toHaveBeenCalled();
  });

  it("submits progress successfully and calls onSubmitSuccess callback", async () => {
    const user = userEvent.setup();
    trackingAPI.recordProgress.mockResolvedValueOnce({
      progressID: 42,
      subjectName: "Mathematics",
      performanceScore: 88,
    });

    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const subjectSelect = screen.getByLabelText(/Domain \/ Subject/i);
    await user.selectOptions(subjectSelect, "Mathematics");

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    fireEvent.change(scoreInput, { target: { value: "88" } });

    const notesInput = screen.getByLabelText(/Observation Notes/i);
    fireEvent.change(notesInput, { target: { value: "Demonstrated great accuracy in addition." } });

    const submitBtn = screen.getByRole("button", { name: /Save Progress/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(trackingAPI.recordProgress).toHaveBeenCalledWith({
        studentID: 1,
        subjectName: "Mathematics",
        performanceScore: 88,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("displays error message if recording progress fails", async () => {
    const user = userEvent.setup();
    trackingAPI.recordProgress.mockRejectedValueOnce(
      new Error("Network error occurred."),
    );

    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const subjectSelect = screen.getByLabelText(/Domain \/ Subject/i);
    await user.selectOptions(subjectSelect, "Mathematics");

    const scoreInput = screen.getByLabelText(/Performance Score/i);
    fireEvent.change(scoreInput, { target: { value: "88" } });

    const submitBtn = screen.getByRole("button", { name: /Save Progress/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/Failed to record progress/i)).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("closes modal on cancel button click or escape key", async () => {
    const user = userEvent.setup();
    render(
      <RecordProgressModal
        isOpen={true}
        onClose={mockOnClose}
        student={mockStudent}
        existingSubjects={mockSubjects}
        onSubmitSuccess={mockOnSuccess}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
