import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "../contexts/AuthContext";
import { AppErrorBoundary } from "../components/ui/AppErrorBoundary";
import { I18nProvider } from "../i18n/I18nProvider";
import { router } from "../routes/router";
import "../styles/globals.css";
import { initializeArenaTheme } from "../utils/theme";
import { BootScreen } from "../components/brand/BootScreen";

initializeArenaTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider>
            <Suspense fallback={<BootScreen />}>
              <RouterProvider router={router} />
            </Suspense>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
