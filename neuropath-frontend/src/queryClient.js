import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(customOptions = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
        ...customOptions,
      },
    },
  });
}

export const queryClient = createQueryClient();
