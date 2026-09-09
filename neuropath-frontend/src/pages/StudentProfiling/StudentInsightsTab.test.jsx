import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);

    expect(
      await screen.findByText(/Summary 1 — 2026-08-28 10:00/i),
    ).toBeInTheDocument();
  });

  it("displays placeholder text when student has no insights", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);
    expect(
      await screen.findByText(/No quick summary generated yet/i),
    ).toBeInTheDocument();
  });

  it("displays error banner when fetching insights fails", async () => {
    iepAPI.getInsights.mockRejectedValueOnce(new Error("Network error loading insights"));

    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Network error loading insights/i),
    ).toBeInTheDocument();
  });

  it("renders distinction notice stating this is not a full IEP and links to Generate IEP", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);
    const setActivePage = vi.fn();

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Note: This is not a full Individualized Education Program \(IEP\)/i),
    ).toBeInTheDocument();

    const goIepBtn = screen.getByRole("button", {
      name: /go to generate iep/i,
    });
    expect(goIepBtn).toBeInTheDocument();

    await user.click(goIepBtn);
    expect(setActivePage).toHaveBeenCalledWith("iep-generation");
  });

  it("calls iepAPI.generateInsight when Generate button is clicked for studentId=4", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);
    iepAPI.generateInsight.mockResolvedValueOnce({
      id: 99,
      created_at: "2026-08-28 12:00",
      summary_text: "Newly generated AI insight for Ethan.",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    await waitFor(() => expect(iepAPI.getInsights).toHaveBeenCalledWith(4));

    const generateBtn = screen.getByRole("button", {
      name: /generate quick summary/i,
    });
    await user.click(generateBtn);

    expect(iepAPI.generateInsight).toHaveBeenCalledWith(4);

    expect(
      await screen.findByText(/Summary 1 — 2026-08-28 12:00/i),
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
    render(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    const header = await screen.findByRole("button", {
      name: /Summary 1 — 2026-08-28 10:00/i,
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
