## Learned User Preferences

- For PostHog, use the `usePostHog` hook in React components and hooks; keep a small `posthog-js`-based `capture` helper in `src/lib/analytics.ts` only for non-React code such as Zustand store subscribers.

## Learned Workspace Facts

- UploadThing uploads are handled through Convex (Node) actions; `UPLOADTHING_TOKEN` must be set in the Convex deployment environment (e.g. Convex dashboard for the deployment that matches prod), not only on the static frontend host, or uploads fail with a missing token error.
- The frontend should use `VITE_CONVEX_SITE_URL` (the `.convex.site` HTTP host) for UploadThing client configuration, not the `.convex.cloud` URL.
