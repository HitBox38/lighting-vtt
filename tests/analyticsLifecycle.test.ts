import { describe, expect, test } from "bun:test";
import { analyticsEnvironment, analyticsNavigationKey, analyticsPage, createViewTracker, errorCategory, syncAnalyticsIdentity } from "../src/lib/analyticsContext";
import { createAnalyticsPrivacyOptions, sanitizeAnalyticsUrl } from "../src/lib/analyticsPrivacy";

describe("analytics lifecycle", () => {
  test("late consent captures the current view once, without replaying previous views", () => {
    const visit = createViewTracker();
    expect(visit("landing", false)).toBe(false);
    expect(visit("library", false)).toBe(false);
    expect(visit("library", true)).toBe(true);
    expect(visit("library", true)).toBe(false); // Strict Mode effect replay
    expect(visit("library", false)).toBe(false);
    expect(visit("library", true)).toBe(false); // no fabricated second visit
    expect(visit("scene:a", true)).toBe(true);
    expect(visit("library", true)).toBe(true);
  });

  test("identity is consent gated and account changes reset before identifying", () => {
    const calls: string[] = [];
    let identity: string | undefined;
    const client = {
      get_property: () => identity,
      identify: (id: string) => { identity = id; calls.push(`identify:${id}`); },
      reset: () => { identity = undefined; calls.push("reset"); },
      register: () => { calls.push("register"); },
    };
    syncAnalyticsIdentity(client, "account-a", false, {});
    expect(calls).toEqual([]);
    syncAnalyticsIdentity(client, "account-a", true, {});
    syncAnalyticsIdentity(client, "account-a", true, {});
    syncAnalyticsIdentity(client, "account-b", true, {});
    syncAnalyticsIdentity(client, null, true, {});
    expect(calls).toEqual(["register", "identify:account-a", "register", "reset", "register", "identify:account-b", "reset", "register"]);
  });

  test("resource navigation ignores search and handoff cleanup but distinguishes scenes and views", () => {
    const key = (path: string) => analyticsNavigationKey(new URL(path, "https://lighting-vtt.xyz"));
    expect(key("/effects?q=secret&returnTo=%2Fscene%3Fid%3Da#top")).toBe(key("/effects?q=different"));
    expect(key("/scene?id=a&addEffect=fx%401")).toBe(key("/scene?id=a"));
    expect(key("/scene?id=a&isGM=false")).not.toBe(key("/scene?id=a"));
    expect(key("/scene?id=b")).not.toBe(key("/scene?id=a"));
    expect(analyticsPage(new URL("https://lighting-vtt.xyz/effects/new"))).toBe("effect_editor");
  });

  test("production is separated from localhost and previews", () => {
    expect(analyticsEnvironment("localhost:5173", "production")).toBe("development");
    expect(analyticsEnvironment("127.0.0.1:4173")).toBe("development");
    expect(analyticsEnvironment("branch.vercel.app", "preview")).toBe("preview");
    expect(analyticsEnvironment("lighting-vtt.xyz")).toBe("production");
  });

  test("diagnostics classify failures without forwarding messages", () => {
    expect(errorCategory(new Error("Not authenticated: private account"))).toBe("authentication");
    expect(errorCategory({ data: "PLAYER_AUTH_REQUIRED" })).toBe("authentication");
    expect(errorCategory(new Error("arbitrary private content"))).toBe("unknown");
  });
});

test("analytics URLs retain campaigns while removing search, redirects, guest ids and fragments", () => {
  expect(sanitizeAnalyticsUrl("/effects?q=private&returnTo=%2Fjoin%2FSECRET&utm_source=discord#private")).toBe("/effects?utm_source=discord");
  expect(sanitizeAnalyticsUrl("/scene?id=a&playerId=private&addEffect=fx@1")).toBe("/scene?id=a");
  expect(sanitizeAnalyticsUrl("https://app.ufs.sh/f/private-map")).toBe("[uploaded-file]");
  expect(sanitizeAnalyticsUrl("https://test.ingest.uploadthing.com/private-key?signature=secret")).toBe("[uploaded-file]");
  expect(sanitizeAnalyticsUrl("blob:https://lighting-vtt.xyz/private-map")).toBe("[uploaded-file]");
});

test("product properties are allowlisted while voluntary feedback retains its response", () => {
  const privacy = createAnalyticsPrivacyOptions();
  const event = { uuid: "id", event: "effect_save_failed", properties: { effect_kind: "shader", error_category: "validation", name: "private", source_code: "private", x: 42, $session_id: "session" } };
  expect(privacy.before_send(event)?.properties).toEqual({ effect_kind: "shader", error_category: "validation", $session_id: "session" });
  expect(privacy.before_send({ ...event, event: "survey sent", properties: { $survey_response: "User supplied feedback" } })?.properties.$survey_response).toBe("User supplied feedback");
  expect(privacy.session_recording.captureCanvas.recordCanvas).toBe(false);
  expect(privacy.session_recording.recordBody).toBe(false);
  expect(privacy.logs.captureConsoleLogs).toBe(false);
});


test("async outcomes cannot cross consent or account changes", async () => {
  const { useCookieConsentStore } = await import("../src/stores/cookieConsentStore");
  const { analyticsOperationGuard, invalidateAnalyticsOperations } = await import("../src/lib/analyticsOperation");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
  const oldConsent = useCookieConsentStore.getState().consent;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: new URL("https://lighting-vtt.xyz/") } });
  process.env.VITE_PUBLIC_POSTHOG_KEY = "phc_test_only";
  try {
    useCookieConsentStore.setState({ consent: null });
    const beforeConsent = analyticsOperationGuard();
    useCookieConsentStore.setState({ consent: "accepted" });
    expect(beforeConsent()).toBe(false);
    const accepted = analyticsOperationGuard();
    expect(accepted()).toBe(true);
    useCookieConsentStore.setState({ consent: "rejected" });
    useCookieConsentStore.setState({ consent: "accepted" });
    expect(accepted()).toBe(false);
    const beforeAccountSwitch = analyticsOperationGuard();
    invalidateAnalyticsOperations();
    expect(beforeAccountSwitch()).toBe(false);
    expect(analyticsOperationGuard()()).toBe(true);
  } finally {
    useCookieConsentStore.setState({ consent: oldConsent });
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldKey === undefined) delete process.env.VITE_PUBLIC_POSTHOG_KEY;
    else process.env.VITE_PUBLIC_POSTHOG_KEY = oldKey;
  }
});


test("exception tracking keeps symbolication locations but removes diagnostic content", () => {
  const output = createAnalyticsPrivacyOptions().before_send({ uuid: "error", event: "$exception", properties: {
    $exception_message: "private diagnostic", $exception_stack_trace_raw: "private source",
    $exception_list: [{ type: "Error", value: "Network request failed: private file", stacktrace: { frames: [{ filename: "https://lighting-vtt.xyz/assets/app.js", lineno: 17, colno: 9, context_line: "private source", vars: { name: "private" } }] } }],
  } });
  expect(JSON.stringify(output)).not.toContain("private");
  expect(output?.properties.$exception_list[0].value).toBe("network");
  expect(output?.properties.$exception_list[0].stacktrace.frames[0]).toMatchObject({ lineno: 17, colno: 9 });
});
