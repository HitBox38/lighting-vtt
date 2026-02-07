import { ConvexClient } from "convex/browser";

/**
 * Non-React Convex client for use outside of React component trees
 * (e.g. inside the Zustand store for fire-and-forget mutations).
 *
 * The reactive `ConvexReactClient` used by the provider lives in main.tsx.
 */
export const convexClient = new ConvexClient(
  import.meta.env.VITE_CONVEX_URL as string,
);
