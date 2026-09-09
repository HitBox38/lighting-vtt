import type { PostHogConfig } from "posthog-js";

type AnalyticsClient = Parameters<PostHogConfig["loaded"]>[0];

/** Keep route-level analytics without sending the bearer capability in an invite. */
export function redactInviteUrl(value: string): string {
  if (/^(https?:\/\/|\/)/i.test(value)) {
    try {
      const url = new URL(value, "https://analytics.invalid");
      const route = decodeURIComponent(url.pathname).match(/^\/join\/([^/]+)\/?$/i);
      if (route) {
        const code = route[1];
        url.pathname = "/join/[redacted]";
        // Keep campaign attribution derived from the stored arrival URL. Also
        // remove copies of the capability from decoded query values/fragments.
        url.search = new URLSearchParams(Array.from(url.searchParams, ([key, item]) => [
          key.replaceAll(code, "[redacted]"), item.replaceAll(code, "[redacted]"),
        ])).toString();
        url.hash = decodeURIComponent(url.hash).replaceAll(code, "[redacted]");
        const prefix = value.startsWith("//") ? `//${url.host}` : value.startsWith("/") ? "" : url.origin;
        return `${prefix}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Malformed escapes still pass through the conservative fallback below.
    }
  }
  let decoded = value;
  // Also cover encoded route names and invite URLs nested in redirect parameters.
  // Leave Unicode and encoded text delimiters intact so a query's %20 or %22
  // cannot terminate URL redaction early and expose another copy of the code.
  for (;;) {
    const next = decoded.replace(/%([0-7][0-9a-f])/gi, (escape, hex: string) => {
      const character = String.fromCharCode(Number.parseInt(hex, 16));
      return /[\s"'<>]/.test(character) ? escape : character;
    });
    if (next === decoded) break;
    decoded = next;
  }
  const redacted = decoded.replace(/\/join\/[^\s"'<>]*/gi, "/join/[redacted]");
  return redacted === decoded ? value : redacted;
}

function redactProperties<T>(value: T): T {
  if (typeof value === "string") return redactInviteUrl(value) as T;
  if (Array.isArray(value)) {
    const redacted = value.map(redactProperties);
    return redacted.some((item, index) => item !== value[index]) ? redacted as T : value;
  }
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    let changed = false;
    const entries = Object.entries(value).map(([key, item]) => {
      const redacted = redactProperties(item);
      changed ||= redacted !== item;
      return [key, redacted];
    });
    return changed ? Object.fromEntries(entries) as T : value;
  }
  return value;
}

// /flags reads these persisted copies directly, bypassing before_send. Retain
// attribution and identity while removing invite URLs, including older SDK data.
// Keep this list covered by the installed-SDK regression test when upgrading it.
const ATTRIBUTION_KEYS = [
  "$initial_person_info",
  "$initial_referrer_info",
  "$initial_campaign_params",
  "$stored_person_properties",
] as const;

function redactPersistedAttribution(posthog: AnalyticsClient) {
  for (const key of ATTRIBUTION_KEYS) {
    const value: unknown = posthog.get_property(key);
    const redacted = redactProperties(value);
    if (redacted !== value) posthog.register({ [key]: redacted });
  }
}

export function createAnalyticsPrivacyOptions() {
  let client: AnalyticsClient | undefined;
  return {
    loaded(posthog: AnalyticsClient) {
      client = posthog;
      redactPersistedAttribution(posthog);
    },
    before_send(event) {
      // Capture updates initial attribution before invoking this callback.
      if (client) redactPersistedAttribution(client);
      return redactProperties(event);
    },
    session_recording: {
      // Replay compresses DOM snapshots before before_send; mask at the source.
      maskAttributeFn: (_name, value) => redactInviteUrl(value),
      maskCapturedNetworkRequestFn: (request) => redactProperties(request),
    },
  } satisfies Partial<PostHogConfig>;
}
