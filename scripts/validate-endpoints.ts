/** Validate the endpoints baked into a deployable frontend bundle. */
export function validateProductionEndpoints(env: Record<string, string | undefined>): void {
  for (const name of ["VITE_CONVEX_URL", "VITE_CONVEX_SITE_URL", "VITE_PUBLIC_POSTHOG_HOST"]) {
    const value = env[name];
    // PostHog uses its default HTTPS host when this optional setting is absent.
    if (!value && name === "VITE_PUBLIC_POSTHOG_HOST") continue;
    if (!value) throw new Error(`Missing ${name}`);

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be an absolute HTTPS URL for builds`);
    }
    if (url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS for builds`);
    }
  }
}
