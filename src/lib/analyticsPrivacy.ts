import type { PostHogConfig } from "posthog-js";
import { ANALYTICS_PROPERTY_KEYS, errorCategory, getAnalyticsContext } from "./analyticsContext";

const customKeys = new Set<string>(ANALYTICS_PROPERTY_KEYS);

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

export function sanitizeAnalyticsUrl(value: string): string {
  if (/^(blob:|data:)/i.test(value)) return "[uploaded-file]";
  if (!/^(https?:\/\/|\/)/i.test(value)) return redactInviteUrl(value);
  try {
    const url = new URL(value, "https://analytics.invalid");
    if (/(\.ufs\.sh|(?:^|\.)utfs\.io|\.ingest\.uploadthing\.com)$/.test(url.hostname)) return "[uploaded-file]";
    for (const key of [...url.searchParams.keys()]) {
      if (!/^(utm_(source|medium|campaign|term|content)|id|isGM|effect|version|tab|category)$/.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    const prefix = value.startsWith("//") ? `//${url.host}` : value.startsWith("/") ? "" : url.origin;
    return redactInviteUrl(`${prefix}${url.pathname}${url.search}`);
  } catch { return redactInviteUrl(value); }
}

function redactProperties<T>(value: T): T {
  if (typeof value === "string") return sanitizeAnalyticsUrl(value) as T;
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
      const safe = redactProperties(event);
      if (safe) {
        if (safe.event === "$exception") {
          // Keep stack locations for symbolication, without raw diagnostic text,
          // locals, or source snippets from programmable effects.
          delete safe.properties.$exception_message;
          delete safe.properties.$exception_stack_trace_raw;
          if (Array.isArray(safe.properties.$exception_list)) {
            safe.properties.$exception_list = safe.properties.$exception_list.map((exception: Record<string, unknown>) => {
              const stacktrace = exception.stacktrace as { frames?: Record<string, unknown>[] } | undefined;
              return {
                ...exception,
                value: errorCategory(new Error(String(exception.value ?? ""))),
                ...(stacktrace ? { stacktrace: { ...stacktrace, frames: stacktrace.frames?.map(frame => {
                  const safeFrame = { ...frame };
                  for (const key of ["vars", "context_line", "pre_context", "post_context"]) delete safeFrame[key];
                  return safeFrame;
                }) } } : {}),
              };
            });
          }
        }
        // Survey responses are intentionally submitted free text; product events
        // have a closed property contract so accidental content cannot leak.
        if (!safe.event.startsWith("$") && !safe.event.startsWith("survey ")) {
          // The SDK requires its public project token and identity transport fields.
          safe.properties = Object.fromEntries(Object.entries(safe.properties).filter(([key]) => key.startsWith("$") || ["token", "distinct_id"].includes(key) || customKeys.has(key)));
        }
        safe.properties = { ...getAnalyticsContext(), ...safe.properties };
      }
      return safe;
    },
    capture_pageleave: false,
    mask_all_text: true,
    mask_all_element_attributes: true,
    autocapture: { capture_copied_text: false },
    enable_recording_console_log: false,
    logs: { captureConsoleLogs: false, beforeSend: () => null },
    capture_performance: { network_timing: true, web_vitals: true },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-analytics-private], [data-slot="dialog-content"], [data-slot="sheet-content"], [data-slot="sidebar"], [data-slot="popover-content"], [data-slot="dropdown-menu-content"], [data-slot="context-menu-content"], .effect-editor',
      blockSelector: ".cm-editor, [data-analytics-block]",
      captureCanvas: { recordCanvas: false },
      recordHeaders: false,
      recordBody: false,
      // Replay compresses DOM snapshots before before_send; mask at the source.
      maskAttributeFn: (name, value) => ["title", "alt", "placeholder", "aria-label"].includes(name) ? "[masked]" : sanitizeAnalyticsUrl(value),
      maskCapturedNetworkRequestFn: (request) => redactProperties(request),
    },
  } satisfies Partial<PostHogConfig>;
}
