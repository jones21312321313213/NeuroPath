import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import useUnsavedChanges from "../useUnsavedChanges";

describe("useUnsavedChanges", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches beforeunload listener when isDirty is true", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("does not attach beforeunload listener when isDirty is false", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useUnsavedChanges({ isDirty: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("allows immediate execution when promptNavigation is called and form is not dirty", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: false }));

    let allowed = false;
    act(() => {
      allowed = result.current.promptNavigation(action);
    });

    expect(allowed).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.showPrompt).toBe(false);
  });

  it("blocks execution and shows prompt when promptNavigation is called on dirty form", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    let allowed = false;
    act(() => {
      allowed = result.current.promptNavigation(action);
    });

    expect(allowed).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(result.current.showPrompt).toBe(true);
  });

  it("executes pending action and closes prompt when confirmLeave is called", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.promptNavigation(action);
    });
    expect(result.current.showPrompt).toBe(true);

    act(() => {
      result.current.confirmLeave();
    });

    expect(result.current.showPrompt).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("discards pending action and closes prompt when cancelLeave is called", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    act(() => {
      result.current.promptNavigation(action);
    });
    expect(result.current.showPrompt).toBe(true);

    act(() => {
      result.current.cancelLeave();
    });

    expect(result.current.showPrompt).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });
});
