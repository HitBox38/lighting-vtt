import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/atoms/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "@posthog/react";
import posthog from "posthog-js";
import { convexClient } from "./lib/convex";
import { createPostHogConsentController } from "./lib/posthogConsent";
import { COOKIE_CONSENT_KEY, readCookieConsent, useCookieConsentStore } from "./stores/cookieConsentStore";
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

// Apply consent before any React effects can capture analytics.
const applyAnalyticsConsent = createPostHogConsentController(posthog, import.meta.env.VITE_PUBLIC_POSTHOG_KEY, options);
applyAnalyticsConsent(useCookieConsentStore.getState().consent);
const unsubscribeConsent = useCookieConsentStore.subscribe((state) => applyAnalyticsConsent(state.consent));
const syncCookieConsent = (event: StorageEvent) => {
  if (event.key === COOKIE_CONSENT_KEY || event.key === null) {
    useCookieConsentStore.setState({ consent: readCookieConsent() });
  }
};
window.addEventListener("storage", syncCookieConsent);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeConsent();
    window.removeEventListener("storage", syncCookieConsent);
  });
}

const queryClient = new QueryClient();
const router = createBrowserRouter([{ path: "*", element: <App /> }]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
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
