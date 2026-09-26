import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorState from "../ErrorState";

describe("ErrorState", () => {
  it("renders with default title, message, and alert role", () => {
    render(<ErrorState />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(
      screen.getByText(/an error occurred while loading this content/i)
    ).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(
      <ErrorState
        title="Failed to Load Roster"
        message="The student database could not be reached."
      />
    );

    expect(screen.getByText("Failed to Load Roster")).toBeInTheDocument();
    expect(
      screen.getByText("The student database could not be reached.")
    ).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided and handles click", () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} retryLabel="Try Again" />);

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
