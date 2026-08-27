import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentInsightsTab from "./StudentInsightsTab";
import { iepAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  iepAPI: {
    getInsights: vi.fn(),
    generateInsight: vi.fn(),
  },
}));

describe("StudentInsightsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls iepAPI.getInsights for studentId=4 and displays fetched insights", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([
      {
        id: 1,
        created_at: "2026-08-28 10:00",
        summary_text: "Real insight from database for student 4.",
      },
    ]);

    render(<StudentInsightsTab studentId={4} />);

    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);

    expect(
      await screen.findByText(/Generation 1 — 2026-08-28 10:00/i),
    ).toBeInTheDocument();
  });

  it("displays placeholder text when student has no insights", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);

    render(<StudentInsightsTab studentId={4} />);

    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);
    expect(
      await screen.findByText(/No insights yet. Click the button below/i),
    ).toBeInTheDocument();
  });

  it("displays error banner when fetching insights fails", async () => {
    iepAPI.getInsights.mockRejectedValueOnce(new Error("Network error loading insights"));

    render(<StudentInsightsTab studentId={4} />);

    expect(
      await screen.findByText(/Network error loading insights/i),
    ).toBeInTheDocument();
  });

  it("calls iepAPI.generateInsight when Generate button is clicked for studentId=4", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);
    iepAPI.generateInsight.mockResolvedValueOnce({
      id: 99,
      created_at: "2026-08-28 12:00",
      summary_text: "Newly generated AI insight for Ethan.",
    });

    const user = userEvent.setup();
    render(<StudentInsightsTab studentId={4} />);

    await waitFor(() => expect(iepAPI.getInsights).toHaveBeenCalledWith(4));

    const generateBtn = screen.getByRole("button", {
      name: /generate and analyze/i,
    });
    await user.click(generateBtn);

    expect(iepAPI.generateInsight).toHaveBeenCalledWith(4);

    expect(
      await screen.findByText(/Generation 1 — 2026-08-28 12:00/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Newly generated AI insight for Ethan./i),
    ).toBeInTheDocument();
  });

  it("toggles accordion open and closed", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([
      {
        id: 1,
        created_at: "2026-08-28 10:00",
        summary_text: "Accordion test insight text.",
      },
    ]);

    const user = userEvent.setup();
    render(<StudentInsightsTab studentId={4} />);

    const header = await screen.findByRole("button", {
      name: /Generation 1 — 2026-08-28 10:00/i,
    });

    // Initially collapsed
    expect(screen.queryByText(/Accordion test insight text./i)).not.toBeInTheDocument();

    // Click to open
    await user.click(header);
    expect(screen.getByText(/Accordion test insight text./i)).toBeInTheDocument();

    // Click again to close
    await user.click(header);
    expect(screen.queryByText(/Accordion test insight text./i)).not.toBeInTheDocument();
  });
});
