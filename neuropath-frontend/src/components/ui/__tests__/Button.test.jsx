import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button component", () => {
  it("renders with default props and children", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies base focus ring classes to all buttons", () => {
    render(<Button>Focus Ring</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("focus-visible:outline-none");
    expect(button).toHaveClass("focus-visible:ring-2");
    expect(button).toHaveClass("focus-visible:ring-offset-2");
  });

  it("applies variant classes and variant-specific focus rings properly", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole("button");
    expect(button).toHaveClass("bg-blue-600");
    expect(button).toHaveClass("focus-visible:ring-blue-500");

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole("button");
    expect(button).toHaveClass("bg-slate-100");
    expect(button).toHaveClass("focus-visible:ring-slate-400");

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole("button");
    expect(button).toHaveClass("border-slate-300");
    expect(button).toHaveClass("focus-visible:ring-slate-400");

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-600");
    expect(button).toHaveClass("focus-visible:ring-red-500");
  });

  it("applies size classes properly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-xs");

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-sm");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-base");
  });

  it("handles clicks and respects disabled state", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Active</Button>);
    
    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={handleClick} disabled>Disabled</Button>);
    const disabledBtn = screen.getByRole("button");
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).toHaveClass("disabled:opacity-50");
    expect(disabledBtn).toHaveClass("disabled:cursor-not-allowed");
    await user.click(disabledBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard activation via Enter and Space keys", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Keyboard Accessible</Button>);
    
    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();

    // Trigger Enter key
    await user.keyboard("{Enter}");
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Trigger Space key
    await user.keyboard(" ");
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it("does not trigger keyboard activation when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
    
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    // Direct key interaction
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with an icon prefix", () => {
    render(<Button icon={<span data-testid="test-icon">⭐</span>}>With Icon</Button>);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("forwards extra props and merges custom className", () => {
    render(
      <Button
        className="custom-test-class"
        aria-label="Custom Accessible Button"
        data-testid="custom-btn"
      >
        Custom
      </Button>
    );
    const button = screen.getByTestId("custom-btn");
    expect(button).toHaveClass("custom-test-class");
    expect(button).toHaveAttribute("aria-label", "Custom Accessible Button");
  });
});
