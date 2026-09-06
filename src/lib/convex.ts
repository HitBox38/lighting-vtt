import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!CONVEX_URL) {
  throw new Error("Missing VITE_CONVEX_URL");
}

/**
 * The single Convex client for the whole app.
 *
 * `ConvexProviderWithClerk` in `main.tsx` installs the Clerk token fetcher on
 * this instance, so mutations fired from outside React (Zustand store
 * subscribers, fire-and-forget persistence) are authenticated exactly like
 * calls made through `useMutation`. Do not create a second client; it would
 * have no auth and every server-side identity check would reject it.
 */
export const convexClient = new ConvexReactClient(CONVEX_URL);
