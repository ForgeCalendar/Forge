"use client";

import "./globals.css";
import type { ReactNode } from "react";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryProvider } from "@/components/QueryProvider";
import { VibeKanbanWrapper } from "@/components/VibeKanbanWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <html suppressHydrationWarning>
      <body>
        <NuqsAdapter>
          <Provider>
            <QueryProvider>
              <AuthProvider>
                <ErrorBoundary
                  onError={(error, errorInfo) => {
                    // Log errors to console in development
                    console.error(
                      "Error caught by boundary:",
                      error,
                      errorInfo
                    );
                  }}
                >
                  <VibeKanbanWrapper />
                  {children}
                </ErrorBoundary>
                <Toaster />
              </AuthProvider>
            </QueryProvider>
          </Provider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
