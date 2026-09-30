import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  UnsavedChangesProvider,
  useUnsavedChangesContext,
} from "./UnsavedChangesContext";
import { useEffect } from "react";

function TestConsumer({ guardOptions = null, onNavigate }) {
  const { registerGuard, promptNavigation, hasUnsavedChanges } =
    useUnsavedChangesContext();

  useEffect(() => {
    if (guardOptions) {
      return registerGuard(guardOptions);
    }
  }, [guardOptions, registerGuard]);

  return (
    <div>
      <span data-testid="is-dirty-status">
        {hasUnsavedChanges() ? "DIRTY" : "CLEAN"}
      </span>
      <button
        type="button"
        onClick={() => {
          promptNavigation(onNavigate);
        }}
      >
        Try Navigate
      </button>
    </div>
  );
}

describe("UnsavedChangesContext", () => {
  it("provides safe fallback defaults when used outside provider", () => {
    const onNavigate = vi.fn();
    render(<TestConsumer onNavigate={onNavigate} />);

    expect(screen.getByTestId("is-dirty-status")).toHaveTextContent("CLEAN");
    screen.getByRole("button", { name: "Try Navigate" }).click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("navigates immediately when inside provider and no guards are dirty", () => {
    const onNavigate = vi.fn();
    render(
      <UnsavedChangesProvider>
        <TestConsumer onNavigate={onNavigate} />
      </UnsavedChangesProvider>
    );

    expect(screen.getByTestId("is-dirty-status")).toHaveTextContent("CLEAN");
    screen.getByRole("button", { name: "Try Navigate" }).click();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("intercepts navigation when a registered guard is dirty", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const guardPromptNavigation = vi.fn(() => {
      // Mock guard intercepting action
      return false;
    });

    const guardOptions = {
      id: "guard-1",
      isDirty: true,
      promptNavigation: guardPromptNavigation,
    };

    render(
      <UnsavedChangesProvider>
        <TestConsumer guardOptions={guardOptions} onNavigate={onNavigate} />
      </UnsavedChangesProvider>
    );

    expect(screen.getByTestId("is-dirty-status")).toHaveTextContent("DIRTY");
    await user.click(screen.getByRole("button", { name: "Try Navigate" }));

    expect(guardPromptNavigation).toHaveBeenCalledWith(onNavigate);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("prioritizes the most recently registered active guard when multiple guards are dirty", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const pageGuardPrompt = vi.fn();
    const modalGuardPrompt = vi.fn();

    function MultiGuardHarness() {
      const { registerGuard, promptNavigation } = useUnsavedChangesContext();

      useEffect(() => {
        const unreg1 = registerGuard({
          id: "page-guard",
          isDirty: true,
          promptNavigation: pageGuardPrompt,
        });
        const unreg2 = registerGuard({
          id: "modal-guard",
          isDirty: true,
          promptNavigation: modalGuardPrompt,
        });

        return () => {
          unreg1();
          unreg2();
        };
      }, [registerGuard]);

      return (
        <button type="button" onClick={() => promptNavigation(onNavigate)}>
          Navigate
        </button>
      );
    }

    render(
      <UnsavedChangesProvider>
        <MultiGuardHarness />
      </UnsavedChangesProvider>
    );

    await user.click(screen.getByRole("button", { name: "Navigate" }));
    // Modal guard was registered last, so it should be prioritized
    expect(modalGuardPrompt).toHaveBeenCalledTimes(1);
    expect(pageGuardPrompt).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("unregisters guards cleanly on cleanup and allows navigation", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const guardPrompt = vi.fn();

    const { rerender } = render(
      <UnsavedChangesProvider>
        <TestConsumer
          guardOptions={{
            id: "temporary-guard",
            isDirty: true,
            promptNavigation: guardPrompt,
          }}
          onNavigate={onNavigate}
        />
      </UnsavedChangesProvider>
    );

    expect(screen.getByTestId("is-dirty-status")).toHaveTextContent("DIRTY");

    // Remove the guard by rerendering with guardOptions = null
    rerender(
      <UnsavedChangesProvider>
        <TestConsumer guardOptions={null} onNavigate={onNavigate} />
      </UnsavedChangesProvider>
    );

    expect(screen.getByTestId("is-dirty-status")).toHaveTextContent("CLEAN");
    await user.click(screen.getByRole("button", { name: "Try Navigate" }));

    expect(guardPrompt).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
