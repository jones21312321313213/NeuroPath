import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Hook to trap focus inside a container, listen for Escape key, and restore focus on close.
 *
 * @param {object} options
 * @param {boolean} [options.isActive=false] - Whether the trap is currently active (e.g. modal is open)
 * @param {import("react").RefObject<HTMLElement>} options.containerRef - Ref pointing to the trap container element
 * @param {() => void} [options.onEscape] - Callback triggered when user hits Escape
 * @param {boolean} [options.returnFocus=true] - Whether to restore focus to previous active element upon deactivation
 */
export function useFocusTrap({
  isActive = false,
  containerRef,
  onEscape,
  returnFocus = true,
}) {
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Capture currently focused element to return focus later
    triggerElementRef.current = document.activeElement;

    const container = containerRef?.current;
    if (!container) return;

    // Find all focusable elements inside container
    const getFocusables = () => {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
    };

    const focusables = getFocusables();

    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onEscape) {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const currentFocusables = getFocusables();

      if (currentFocusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = currentFocusables[0];
      const lastElement = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element or container, cycle back to last
        if (
          document.activeElement === firstElement ||
          document.activeElement === container
        ) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, cycle forward to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (
        returnFocus &&
        triggerElementRef.current &&
        typeof triggerElementRef.current.focus === "function"
      ) {
        triggerElementRef.current.focus();
      }
    };
  }, [isActive, containerRef, onEscape, returnFocus]);
}

export default useFocusTrap;
