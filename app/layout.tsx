import "./globals.css";
import type { ReactNode } from "react";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryProvider } from "@/components/QueryProvider";
import { VibeKanbanWrapper } from "@/components/VibeKanbanWrapper";

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <html suppressHydrationWarning>
      <body>
        <NuqsAdapter>
          <Provider>
            <QueryProvider>
              <AuthProvider>
                <VibeKanbanWrapper />
                {children}
              </AuthProvider>
            </QueryProvider>
          </Provider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
