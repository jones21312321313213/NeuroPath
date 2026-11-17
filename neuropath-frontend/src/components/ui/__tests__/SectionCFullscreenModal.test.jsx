import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionCFullscreenModal } from "../SectionCFullscreenModal";

describe("SectionCFullscreenModal (Mobile 390x844 Auto-Landscape Rotation)", () => {
  const origInnerWidth = window.innerWidth;
  const origInnerHeight = window.innerHeight;
  const origOrientation = window.screen?.orientation;

  const setViewport = (width, height) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: height,
    });
  };

  afterEach(() => {
    setViewport(origInnerWidth, origInnerHeight);
    if (origOrientation !== undefined) {
      Object.defineProperty(window.screen, "orientation", {
        writable: true,
        configurable: true,
        value: origOrientation,
      });
    }
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("renders standard non-rotated fullscreen with 80% default zoom on desktop viewports", () => {
    setViewport(1280, 800);

    render(
      <SectionCFullscreenModal isOpen={true} onClose={vi.fn()}>
        <table>
          <tbody>
            <tr>
              <td>Sample Enroute Objective</td>
            </tr>
          </tbody>
        </table>
      </SectionCFullscreenModal>,
    );

    const dialog = screen.getByRole("dialog", {
      name: /section c learner goals fullscreen view/i,
    });
    expect(dialog).toHaveAttribute("data-landscape-rotated", "false");
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.queryByText("Landscape")).not.toBeInTheDocument();
  });

  it("auto-rotates to landscape on 390x844 mobile portrait and attempts screen.orientation.lock", () => {
    setViewport(390, 844);
    const lockMock = vi.fn().mockResolvedValue(undefined);
    const unlockMock = vi.fn();
    Object.defineProperty(window.screen, "orientation", {
      writable: true,
      configurable: true,
      value: { lock: lockMock, unlock: unlockMock },
    });

    const onClose = vi.fn();
    const { unmount } = render(
      <SectionCFullscreenModal isOpen={true} onClose={onClose}>
        <table>
          <tbody>
            <tr>
              <td>Sample Enroute Objective</td>
            </tr>
          </tbody>
        </table>
      </SectionCFullscreenModal>,
    );

    const dialog = screen.getByRole("dialog", {
      name: /section c learner goals fullscreen view/i,
    });
    expect(dialog).toHaveAttribute("data-landscape-rotated", "true");
    expect(dialog.querySelector(".iep-fullscreen-landscape-rotated")).toBeInTheDocument();
    expect(screen.getByText("Landscape")).toBeInTheDocument();
    expect(lockMock).toHaveBeenCalledWith("landscape");

    // Fit-to-width default zoom for 844px rotated width on 1480px table (~54%)
    expect(screen.getByText("54%")).toBeInTheDocument();

    // User can manually toggle back to Portrait and back to Landscape
    const toggleBtn = screen.getByRole("button", {
      name: /switch to portrait orientation/i,
    });
    fireEvent.click(toggleBtn);
    expect(dialog).toHaveAttribute("data-landscape-rotated", "false");

    fireEvent.click(
      screen.getByRole("button", { name: /rotate to landscape orientation/i }),
    );
    expect(dialog).toHaveAttribute("data-landscape-rotated", "true");

    // Unmount unlocks screen orientation
    unmount();
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });
});
