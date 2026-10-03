import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Pagination from "../Pagination";

describe("Pagination", () => {
  it("renders pagination navigation with page numbers and summary", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByTestId("pagination-summary")).toHaveTextContent(
      /showing 1 to 10 of 50 results/i
    );

    const page1Btn = screen.getByRole("button", { name: "Page 1" });
    expect(page1Btn).toHaveAttribute("aria-current", "page");

    const nextBtn = screen.getByRole("button", { name: /next page/i });
    expect(nextBtn).toBeEnabled();

    const prevBtn = screen.getByRole("button", { name: /previous page/i });
    expect(prevBtn).toBeDisabled();
  });

  it("calls onPageChange when a page number button is clicked", () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={handlePageChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when Next and Previous buttons are clicked", () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        onPageChange={handlePageChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it("disables Next button on the last page", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous page/i })).toBeEnabled();
  });

  it("does not render when totalPages is 1 or less and totalItems <= pageSize", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
