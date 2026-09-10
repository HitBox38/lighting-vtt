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
import { createAnalyticsPrivacyOptions } from "./lib/analyticsPrivacy";
import { DeferredAnalyticsExtensions } from "./components/atoms/DeferredAnalyticsExtensions";
import { deferredAnalyticsScripts } from "./lib/deferredAnalyticsScripts";
import { lazyClerkUi } from "./lib/lazyClerkUi";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key");
}

const options = {
  ...createAnalyticsPrivacyOptions(),
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  prepare_external_dependency_script: deferredAnalyticsScripts.prepare,
} as const;

const queryClient = new QueryClient();
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <DeferredAnalyticsExtensions />
      <ThemeProvider>
        <ClerkProvider
          publishableKey={publishableKey}
          ui={lazyClerkUi}
          appearance={{
            theme: shadcn,
            options: {
              privacyPageUrl: "/privacy",
              termsPageUrl: "/terms",
            },
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
