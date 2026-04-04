"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toaster } from "@/components/ui/toaster";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Show toast for query errors
            toaster.create({
              title: "Error loading data",
              description: error.message || "An unexpected error occurred",
              type: "error",
              duration: 5000,
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Show toast for mutation errors
            toaster.create({
              title: "Operation failed",
              description: error.message || "An unexpected error occurred",
              type: "error",
              duration: 5000,
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            throwOnError: false, // Don't throw - handle with toast
          },
          mutations: {
            throwOnError: false, // Don't throw - handle with toast
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
