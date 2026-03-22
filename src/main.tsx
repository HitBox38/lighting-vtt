import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import "pixi.js/advanced-blend-modes";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "@posthog/react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;
if (!CONVEX_URL) {
  throw new Error("Missing VITE_CONVEX_URL");
}

const convex = new ConvexReactClient(CONVEX_URL);

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
} as const;

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <ThemeProvider>
        <ConvexProvider client={convex}>
          <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            appearance={{
              theme: shadcn,
            }}>
            <BrowserRouter>
              <QueryClientProvider client={queryClient}>
                <App />
              </QueryClientProvider>
            </BrowserRouter>
          </ClerkProvider>
        </ConvexProvider>
      </ThemeProvider>
    </PostHogProvider>
  </StrictMode>,
);
