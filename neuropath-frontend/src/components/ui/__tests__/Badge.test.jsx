import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge component", () => {
  it("renders with default info variant", () => {
    render(<Badge>New Update</Badge>);
    const badge = screen.getByText("New Update");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-50", "text-blue-700");
  });

  it("renders different color variants", () => {
    const { rerender } = render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText("Info")).toHaveClass("bg-blue-50", "text-blue-700");

    rerender(<Badge variant="success">Completed</Badge>);
    expect(screen.getByText("Completed")).toHaveClass("bg-emerald-50", "text-emerald-700");

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending")).toHaveClass("bg-amber-50", "text-amber-700");

    rerender(<Badge variant="purple">AI Generated</Badge>);
    expect(screen.getByText("AI Generated")).toHaveClass("bg-purple-50", "text-purple-700");

    rerender(<Badge variant="danger">High Support</Badge>);
    expect(screen.getByText("High Support")).toHaveClass("bg-red-50", "text-red-700");

    rerender(<Badge variant="neutral">Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("bg-slate-100", "text-slate-700");
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText("Small")).toHaveClass("text-[11px]");

    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByText("Medium")).toHaveClass("text-xs");
  });

  it("merges custom className and renders children", () => {
    render(<Badge className="custom-test-class">Custom Badge</Badge>);
    const badge = screen.getByText("Custom Badge");
    expect(badge).toHaveClass("custom-test-class");
    expect(badge).toHaveClass("rounded-full");
    expect(badge).toHaveTextContent("Custom Badge");
  });
});
