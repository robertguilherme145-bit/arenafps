import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "../contexts/AuthContext";
import { AppErrorBoundary } from "../components/ui/AppErrorBoundary";
import { router } from "../routes/router";
import "../styles/globals.css";
import { initializeArenaTheme } from "../utils/theme";

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
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-arena-bg text-sm font-semibold text-cyan-100">Carregando Arena Camp...</div>}>
            <RouterProvider router={router} />
          </Suspense>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
