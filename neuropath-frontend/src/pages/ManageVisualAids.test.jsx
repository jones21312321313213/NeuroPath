import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ManageVisualAids from "./ManageVisualAids";
import { visualAidsAPI, studentsAPI, iepAPI } from "../api/client";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, email: "teacher@example.com" } }),
}));

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
  },
  iepAPI: {
    listLatestGoalsByStudent: vi.fn(),
    listGoalsByStudent: vi.fn(),
  },
  visualAidsAPI: {
    generate: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    listByStudent: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exportUrl: vi.fn((id) => `/api/resources/export-visual-aid/${id}/`),
  },
}));

describe("ManageVisualAids - Issue #217 Sequential 3-Step Task Analysis Visual Aids", () => {
  const mockStudents = [
    { studentID: 101, name: "Leo Miller", grade: 2 },
    { studentID: 102, name: "Sara Conner", grade: 3 },
  ];

  const mockGoals = [
    {
      goalID: 301,
      goalName: "Handwashing Routine",
      annual_goal: "Handwashing Routine",
      subject_category: "Daily Living Skills",
    },
  ];

  const mockGeneratedAid = {
    visualAidID: 55,
    title: "Daily Living Skills — Leo Miller Visual Aid",
    imageUrl: "data:image/jpeg;base64,mockbase64jpegstrip",
    studentName: "Leo Miller",
    dateCreated: "2026-09-29T10:00:00Z",
    steps_data: [
      {
        step: 1,
        title: "Turn on Water & Apply Soap",
        description: "Wet hands and pump soap onto palms.",
        visual_cue: "Child hands under faucet with foam.",
        imageUrl: "data:image/jpeg;base64,mockstep1image",
      },
      {
        step: 2,
        title: "Rub Hands Together",
        description: "Scrub palms and fingers thoroughly for 20 seconds.",
        visual_cue: "Child scrubbing lather bubbles.",
        imageUrl: "data:image/jpeg;base64,mockstep2image",
      },
      {
        step: 3,
        title: "Rinse & Dry",
        description: "Rinse off soap and dry hands with clean towel.",
        visual_cue: "Child drying hands with white towel.",
        imageUrl: "data:image/jpeg;base64,mockstep3image",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    studentsAPI.list.mockResolvedValue(mockStudents);
    iepAPI.listLatestGoalsByStudent.mockResolvedValue(mockGoals);
    iepAPI.listGoalsByStudent.mockResolvedValue(mockGoals);
    visualAidsAPI.generate.mockResolvedValue({ data: mockGeneratedAid });
    visualAidsAPI.create.mockResolvedValue({ data: { ...mockGeneratedAid, isDraft: false } });
    visualAidsAPI.listByStudent.mockResolvedValue([mockGeneratedAid]);
    visualAidsAPI.update.mockResolvedValue({ data: mockGeneratedAid });
    visualAidsAPI.delete.mockResolvedValue({ status: "success" });

    // Mock window.speechSynthesis
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.rate = 1;
        this.onend = null;
        this.onerror = null;
      }
    };
    window.print = vi.fn();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ManageVisualAids />
      </MemoryRouter>
    );

  it("renders page header and navigation tabs", async () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: /manage visual aids/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("renders students in Step 1 and shows IEP goals and preset chips when student is selected", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Leo Miller"));

    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
      expect(screen.getByText(/Preset Quick Templates/i)).toBeInTheDocument();
      expect(screen.getByText(/🧼 Handwashing Routine/i)).toBeInTheDocument();
      expect(screen.getByText(/🥄 Eating with Utensils/i)).toBeInTheDocument();
    });
  });

  it("populates prompt textarea when a preset template chip is clicked", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));

    await waitFor(() => {
      expect(screen.getByText(/🧼 Handwashing Routine/i)).toBeInTheDocument();
    });

    const handwashingChip = screen.getByText(/🧼 Handwashing Routine/i);
    fireEvent.click(handwashingChip);

    const textarea = screen.getByPlaceholderText(/e\.g\. Show a child/i);
    expect(textarea.value).toContain("Handwashing: 1. Turn on water");
  });

  it("generates a sequential 3-step visual aid strip and displays the interactive sequence viewer", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));

    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));

    const generateBtn = screen.getByRole("button", { name: /generate visual aid/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(visualAidsAPI.generate).toHaveBeenCalledWith({
        iep_goal_id: 301,
        prompt: "",
        category: "Daily Living Skills",
        save_to_db: false,
      });
      expect(screen.getByText("Review Generated Draft")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Turn on Water & Apply Soap")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rub Hands Together")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rinse & Dry")).toBeInTheDocument();
    });
  });

  it("allows selecting steps to highlight individual cards", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Rub Hands Together")).toBeInTheDocument();
    });

    // Click Step 2 tab in sequence nav
    const step2Tab = screen.getByRole("tab", { name: /Rub Hands Together/i });
    fireEvent.click(step2Tab);
    expect(step2Tab).toHaveClass("active");
  });

  it("allows inline editing of step captions and persists changes via visualAidsAPI.update", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Turn on Water & Apply Soap")).toBeInTheDocument();
    });

    const step1TitleInput = screen.getByLabelText("Step 1 title");
    await user.clear(step1TitleInput);
    await user.type(step1TitleInput, "Turn On Warm Water");

    const saveBtn = screen.getByRole("button", { name: /save visual aid/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(visualAidsAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({
          steps_data: expect.arrayContaining([
            expect.objectContaining({ title: "Turn On Warm Water" }),
          ]),
        })
      );
      expect(mockToast.success).toHaveBeenCalledWith("Visual aid saved to database successfully!");
    });
  });

  it("triggers audio narration via speechSynthesis when Narration button is clicked", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /narration/i })).toHaveLength(3);
    });

    const narrateButtons = screen.getAllByRole("button", { name: /narration/i });
    fireEvent.click(narrateButtons[0]);

    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it("allows user to decide whether to save, regenerate, or discard draft visual aid", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save visual aid/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
    });

    // Verify Print Flashcards and Open Image are removed
    expect(screen.queryByRole("button", { name: /print flashcards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open image/i })).not.toBeInTheDocument();

    // Click Discard
    const discardBtn = screen.getByRole("button", { name: /discard/i });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save visual aid/i })).not.toBeInTheDocument();
      expect(mockToast.info).toHaveBeenCalledWith("Generated visual aid discarded.");
    });
  });

  it("inspects saved visual aid in View Tab and displays the 3-step sequence viewer modal with Download Classroom PDF", async () => {
    const { container } = renderComponent();

    // Click View tab
    const viewTab = screen.getByRole("button", { name: /view/i, selector: ".va-tab-btn" });
    fireEvent.click(viewTab);

    await waitFor(() => {
      expect(screen.getByText("Saved Visual Aids")).toBeInTheDocument();
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Leo Miller"));

    await waitFor(() => {
      expect(visualAidsAPI.listByStudent).toHaveBeenCalledWith(101);
      expect(screen.getByText("Daily Living Skills — Leo Miller Visual Aid")).toBeInTheDocument();
    });

    const viewButton = container.querySelector(".va-aid-row-actions .va-btn-primary");
    fireEvent.click(viewButton);

    await waitFor(() => {
      // Top duplicate storyboard strip box should be removed
      expect(screen.queryByText(/AI 3-Panel Sequential Task Analysis Storyboard/i)).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Turn on Water & Apply Soap")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save captions/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /download classroom pdf/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /✕ Close/i })).toBeInTheDocument();
    });

    const pdfLink = screen.getByRole("link", { name: /download classroom pdf/i });
    expect(pdfLink).toHaveAttribute("href", "/api/resources/export-visual-aid/55/");

    fireEvent.click(screen.getByRole("button", { name: /✕ Close/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /✕ Close/i })).not.toBeInTheDocument();
    });
  });

  it("deletes a visual aid in Delete Tab with confirmation modal", async () => {
    const { container } = renderComponent();

    const deleteTab = screen.getByRole("button", { name: /delete/i, selector: ".va-tab-btn" });
    fireEvent.click(deleteTab);

    await waitFor(() => {
      expect(screen.getByText("Delete Visual Aids")).toBeInTheDocument();
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Leo Miller"));

    await waitFor(() => {
      expect(screen.getByText("Daily Living Skills — Leo Miller Visual Aid")).toBeInTheDocument();
    });

    const deleteRowBtn = container.querySelector(".va-aid-row-actions .va-btn-danger");
    expect(deleteRowBtn).toBeInTheDocument();
    fireEvent.click(deleteRowBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete Visual Aid?")).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole("button", { name: /yes, delete/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(visualAidsAPI.delete).toHaveBeenCalledWith(55);
      expect(mockToast.success).toHaveBeenCalledWith("Visual aid deleted successfully.");
    });
  });

  it("renders 3 distinct pictures directly inside each individual step card without duplicate top box", async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Turn on Water & Apply Soap")).toBeInTheDocument();
    });

    // Verify duplicate top box is removed
    expect(container.querySelector(".va-output-box")).not.toBeInTheDocument();
    expect(container.querySelector(".va-storyboard-3strip")).not.toBeInTheDocument();

    // Verify 3 distinct pictures are in each step card
    const stepCardImages = container.querySelectorAll(".va-step-card-img");
    expect(stepCardImages).toHaveLength(3);
    expect(stepCardImages[0]).toHaveAttribute("src", "data:image/jpeg;base64,mockstep1image");
    expect(stepCardImages[1]).toHaveAttribute("src", "data:image/jpeg;base64,mockstep2image");
    expect(stepCardImages[2]).toHaveAttribute("src", "data:image/jpeg;base64,mockstep3image");
  });

  it("prompts confirmation modal when user tries to switch tabs with an unsaved draft, and stays when clicking 'No, Stay'", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByText(/Review Generated Draft/i)).toBeInTheDocument();
    });

    // Try to switch to "View" tab while in draft state
    const viewTabBtn = screen.getByRole("button", { name: /view/i });
    fireEvent.click(viewTabBtn);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /unsaved visual aid/i })).toBeInTheDocument();
      expect(screen.getByText(/if you leave without saving, your generated visual aid will be lost/i)).toBeInTheDocument();
    });

    // Click "No, Stay"
    const stayBtn = screen.getByRole("button", { name: /no, stay/i });
    fireEvent.click(stayBtn);

    // Modal should close and draft should still be on screen
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /unsaved visual aid/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Review Generated Draft/i)).toBeInTheDocument();
    });
  });

  it("allows tab switch and discards draft when user confirms 'Yes, Leave Without Saving'", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Leo Miller")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Leo Miller"));
    await waitFor(() => {
      expect(screen.getByText("Handwashing Routine")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Handwashing Routine"));
    fireEvent.click(screen.getByRole("button", { name: /generate visual aid/i }));

    await waitFor(() => {
      expect(screen.getByText(/Review Generated Draft/i)).toBeInTheDocument();
    });

    // Try to switch to "View" tab
    const viewTabBtn = screen.getByRole("button", { name: /view/i });
    fireEvent.click(viewTabBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /unsaved visual aid/i })).toBeInTheDocument();
    });

    // Confirm leave
    const leaveBtn = screen.getByRole("button", { name: /yes, leave without saving/i });
    fireEvent.click(leaveBtn);

    // Modal closes and View tab renders
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /unsaved visual aid/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Review Generated Draft/i)).not.toBeInTheDocument();
    });
  });
});
