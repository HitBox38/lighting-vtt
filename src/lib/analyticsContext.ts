export type AnalyticsRole = "gm" | "player" | "remote_player";
export const ANALYTICS_PROPERTY_KEYS = [
  "analytics_schema_version", "environment", "release", "page_type", "scene_id", "role", "attempt_id",
  "from_scene", "scene_visit_id", "entry_source", "is_remote_player", "signed_in", "auth_type", "already_joined", "reason", "error_category",
  "source", "kind", "effect_kind", "effect_id", "instance_id", "version", "from_version", "to_version",
  "light_type", "duration_ms", "first_in_scene", "time_since_scene_open_ms", "mode", "status", "backend",
  "view", "blocker", "template", "purpose", "original_bytes", "uploaded_bytes", "compression_outcome",
  "has_map_upload", "has_image", "operation", "preset_count_bucket", "via", "active", "placement", "action", "surface",
] as const;
export type AnalyticsProperties = Partial<Record<typeof ANALYTICS_PROPERTY_KEYS[number], string | number | boolean | null | undefined>>;

export function analyticsEnvironment(host: string, configured?: string): "production" | "preview" | "development" {
  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(host)) return "development";
  return configured === "production" || host === "lighting-vtt.xyz" ? "production" : "preview";
}

export function analyticsPage(url: URL): string {
  if (url.pathname === "/") return "landing";
  if (url.pathname === "/library") return "scene_library";
  if (url.pathname === "/scene") return "scene";
  if (url.pathname.startsWith("/join/")) return "join";
  if (url.pathname === "/effects") return "effect_library";
  if (url.pathname.startsWith("/effects/")) return "effect_editor";
  return ["/privacy", "/terms"].includes(url.pathname) ? "legal" : "not_found";
}

/** Identity of a viewed resource, excluding search, handoff and incidental hash changes. */
export function analyticsNavigationKey(url: URL): string {
  return [url.pathname, ...["id", "playerId", "isGM", "effect", "version"].map(key => url.searchParams.get(key) ?? "")].join("|");
}

let sceneContext: AnalyticsProperties = {};
export function setAnalyticsScene(context: AnalyticsProperties) { sceneContext = context; }
export function getAnalyticsContext(): AnalyticsProperties {
  if (typeof window === "undefined" || !window.location?.href) return {};
  const url = new URL(window.location.href);
  return {
    analytics_schema_version: 2,
    environment: analyticsEnvironment(url.host, import.meta.env?.VITE_APP_ENV),
    release: import.meta.env?.VITE_APP_RELEASE ?? "local",
    page_type: analyticsPage(url),
    ...(url.pathname === "/scene" && sceneContext.scene_id === url.searchParams.get("id") ? sceneContext : {}),
  };
}

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined" || !window.location) return false;
  return Boolean(import.meta.env?.VITE_PUBLIC_POSTHOG_KEY) &&
    (analyticsEnvironment(window.location.host) !== "development" || import.meta.env?.VITE_ANALYTICS_DEBUG === "true");
}

export function errorCategory(error: unknown): string {
  const value = error && typeof error === "object" && "data" in error ? String(error.data) : error instanceof Error ? error.message : "";
  if (/auth|sign.?in|unauthorized/i.test(value)) return "authentication";
  if (/rate|too many|limit/i.test(value)) return "rate_or_capacity_limit";
  if (/permission|forbidden|access/i.test(value)) return "access_denied";
  if (/not.found|unavailable/i.test(value)) return "unavailable";
  if (/network|fetch|offline|timeout/i.test(value)) return "network";
  if (/invalid|validat|file.type|file.size/i.test(value)) return "validation";
  return "unknown";
}

/** A view may become measurable after consent; denied observations never consume its key. */
export function createViewTracker() {
  let last: string | null = null;
  return (key: string, ready: boolean): boolean => {
    if (!ready || key === last) return false;
    last = key;
    return true;
  };
}

export function syncAnalyticsIdentity(client: {
  get_property(key: string): unknown;
  identify(id: string): void;
  reset(resetDeviceId?: boolean): void;
  register(properties: AnalyticsProperties): void;
}, userId: string | null, ready: boolean, properties: AnalyticsProperties) {
  if (!ready) return;
  const previous = client.get_property("$user_id");
  if (previous && previous !== userId) client.reset(true);
  client.register(properties);
  if (userId && previous !== userId) client.identify(userId);
}
