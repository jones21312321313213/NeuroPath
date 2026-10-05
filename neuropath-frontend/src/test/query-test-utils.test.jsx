import { describe, it, expect } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { createTestQueryClient, renderWithQueryClient } from "./query-test-utils";

function TestComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ["test"],
    queryFn: () => Promise.resolve("query success"),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data}</div>;
}

describe("query-test-utils", () => {
  it("creates a test query client with retry false and standard staleTime", () => {
    const client = createTestQueryClient();
    const defaultOptions = client.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(false);
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.mutations?.retry).toBe(false);
  });

  it("renders a component wrapped in QueryClientProvider and provides queryClient", async () => {
    const { queryClient } = renderWithQueryClient(<TestComponent />);
    expect(queryClient).toBeDefined();
    expect(await screen.findByText("query success")).toBeInTheDocument();
  });

  it("uses provided queryClient if passed in options", () => {
    const customClient = createTestQueryClient();
    const { queryClient } = renderWithQueryClient(<TestComponent />, {
      queryClient: customClient,
    });
    expect(queryClient).toBe(customClient);
  });
});
