import { describe, it, expect } from "vitest";
import { queryClient, createQueryClient } from "./queryClient";

describe("queryClient", () => {
  it("exports a default queryClient instance with configured default options", () => {
    expect(queryClient).toBeDefined();
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries?.retry).toBe(1);
  });

  it("createQueryClient allows overriding default options", () => {
    const customClient = createQueryClient({
      staleTime: 10000,
      retry: 3,
    });
    const defaultOptions = customClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(10000);
    expect(defaultOptions.queries?.retry).toBe(3);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
});
