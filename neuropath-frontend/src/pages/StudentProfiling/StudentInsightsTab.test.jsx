import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StudentInsightsTab from "./StudentInsightsTab";
import { iepAPI } from "../../api/client";
import { renderWithQueryClient } from "../../test/query-test-utils";

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

  it("calls iepAPI.getInsights for real student and displays fetched insights", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([
      {
        id: 1,
        created_at: "2026-08-28 10:00",
        summary_text: "Real insight from database for student 1.",
      },
    ]);

    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).toHaveBeenCalledWith(1);

    expect(
      await screen.findByText(/Summary 1 — 2026-08-28 10:00/i)
    ).toBeInTheDocument();
  });

  it("displays placeholder text when student has no insights", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);

    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).toHaveBeenCalledWith(1);
    expect(
      await screen.findByText(/No quick summary generated yet/i)
    ).toBeInTheDocument();
  });

  it("displays error banner when fetching insights fails", async () => {
    iepAPI.getInsights.mockRejectedValueOnce(
      new Error("Network error loading insights")
    );

    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Network error loading insights/i)
    ).toBeInTheDocument();
  });

  it("renders distinction notice stating this is not a full IEP and links to Generate IEP", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);
    const setActivePage = vi.fn();

    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    expect(
      screen.getByText(
        /Note: This is not a full Individualized Education Program \(IEP\)/i
      )
    ).toBeInTheDocument();

    const goIepBtn = screen.getByRole("button", {
      name: /go to generate iep/i,
    });
    expect(goIepBtn).toBeInTheDocument();

    await user.click(goIepBtn);
    expect(setActivePage).toHaveBeenCalledWith("iep-generation");
  });

  it("calls iepAPI.generateInsight when Generate button is clicked for real student and reflects updated insights", async () => {
    iepAPI.getInsights
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 99,
          created_at: "2026-08-28 12:00",
          summary_text: "Newly generated AI insight for Ethan.",
        },
      ]);
    iepAPI.generateInsight.mockResolvedValueOnce({
      id: 99,
      created_at: "2026-08-28 12:00",
      summary_text: "Newly generated AI insight for Ethan.",
    });

    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    await waitFor(() => expect(iepAPI.getInsights).toHaveBeenCalledWith(1));

    const generateBtn = screen.getByRole("button", {
      name: /generate quick summary/i,
    });
    await user.click(generateBtn);

    expect(iepAPI.generateInsight).toHaveBeenCalledWith(1);

    expect(
      await screen.findByText(/Summary 1 — 2026-08-28 12:00/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Newly generated AI insight for Ethan./i)
    ).toBeInTheDocument();
  });

  it("displays error banner when generating insight fails", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([]);
    iepAPI.generateInsight.mockRejectedValueOnce(new Error("Generation failed"));

    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    await waitFor(() => expect(iepAPI.getInsights).toHaveBeenCalledWith(1));

    const generateBtn = screen.getByRole("button", {
      name: /generate quick summary/i,
    });
    await user.click(generateBtn);

    expect(await screen.findByText(/Generation failed/i)).toBeInTheDocument();
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
    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={1} />
      </MemoryRouter>
    );

    const header = await screen.findByRole("button", {
      name: /Summary 1 — 2026-08-28 10:00/i,
    });

    // Initially collapsed
    expect(
      screen.queryByText(/Accordion test insight text./i)
    ).not.toBeInTheDocument();

    // Click to open
    await user.click(header);
    expect(
      screen.getByText(/Accordion test insight text./i)
    ).toBeInTheDocument();

    // Click again to close
    await user.click(header);
    expect(
      screen.queryByText(/Accordion test insight text./i)
    ).not.toBeInTheDocument();
  });

  it("calls iepAPI.getInsights for studentId=4 when not in mock mode", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([
      {
        id: 4,
        created_at: "2026-08-28 10:00",
        summary_text: "Insight for student 4 from database.",
      },
    ]);

    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);
    expect(
      await screen.findByText(/Summary 1 — 2026-08-28 10:00/i)
    ).toBeInTheDocument();
  });

  it("renders mock fallback insights when VITE_USE_MOCK_INSIGHTS is 'true' without calling API", async () => {
    vi.stubEnv("VITE_USE_MOCK_INSIGHTS", "true");

    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Summary 2 — 2026-05-24 21:00/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Summary 1 — 2026-05-20 14:30/i)
    ).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it("generates mock insight when Generate button is clicked in mock mode without calling API", async () => {
    vi.stubEnv("VITE_USE_MOCK_INSIGHTS", "true");

    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <StudentInsightsTab studentId={4} />
      </MemoryRouter>
    );

    expect(iepAPI.getInsights).not.toHaveBeenCalled();
    const generateBtn = screen.getByRole("button", {
      name: /generate quick summary/i,
    });
    await user.click(generateBtn);

    expect(iepAPI.generateInsight).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Ethan Carter demonstrates high affinity/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Summary 3 —/i)).toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
