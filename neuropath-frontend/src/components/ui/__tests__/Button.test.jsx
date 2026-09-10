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

  it("applies variant classes properly", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-blue-600");

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-slate-100");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border-slate-300");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("applies size classes properly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-xs");

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
    await user.click(disabledBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders with an icon prefix", () => {
    render(<Button icon={<span data-testid="test-icon">⭐</span>}>With Icon</Button>);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});
