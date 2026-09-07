import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "pixi.js/advanced-blend-modes";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/atoms/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "@posthog/react";
import { convexClient } from "./lib/convex";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
} as const;

const queryClient = new QueryClient();
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <ThemeProvider>
        <ClerkProvider
          publishableKey={publishableKey}
          appearance={{
            theme: shadcn,
          }}>
          <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router}/>
            </QueryClientProvider>
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </ThemeProvider>
    </PostHogProvider>
  </StrictMode>,
);
