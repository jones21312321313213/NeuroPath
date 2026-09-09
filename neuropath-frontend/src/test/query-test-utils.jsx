import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithQueryClient(ui, options = {}) {
  const testQueryClient = options.queryClient || createTestQueryClient();
  const rendered = render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>,
    options,
  );
  return {
    ...rendered,
    queryClient: testQueryClient,
  };
}
