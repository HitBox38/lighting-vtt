import { expect, mock, test } from "bun:test";
import type { PostHog, PostHogConfig } from "posthog-js";
import { createPostHogConsentController } from "../src/lib/posthogConsent";
import { createAnalyticsPrivacyOptions } from "../src/lib/analyticsPrivacy";

function setup(apiKey: string | undefined = "test-key", options: Partial<PostHogConfig> = {}) {
  let config: Partial<PostHogConfig> = {};
  const client = {
    init: mock((_key: string, options: Partial<PostHogConfig>) => { config = options; }),
    opt_in_capturing: mock(() => {}),
    opt_out_capturing: mock(() => {}),
    stopSessionRecording: mock(() => {}),
    set_config: mock((options: Partial<PostHogConfig>) => { config = { ...config, ...options }; }),
  };
  return {
    client,
    config: () => config,
    apply: createPostHogConsentController(client as unknown as PostHog, apiKey, options),
  };
}

test("pending and rejected consent never initialize PostHog", () => {
  const { client, apply } = setup();
  apply(null);
  apply("rejected");
  apply(null);
  expect(client.init).not.toHaveBeenCalled();
  expect(client.opt_in_capturing).not.toHaveBeenCalled();
});

test("acceptance initializes once with tracking and storage denied until opt-in", () => {
  const { client, apply, config } = setup();
  apply("accepted");
  apply("accepted");
  expect(client.init).toHaveBeenCalledTimes(1);
  expect(client.opt_in_capturing).toHaveBeenCalledTimes(1);
  expect(config()).toMatchObject({
    capture_pageview: false,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
  });
});

test("withdrawal stops replay and capture; acceptance can be restored without reinitializing", () => {
  const { client, apply, config } = setup();
  apply("accepted");
  const beforeSend = config().before_send as (event: unknown) => unknown;
  const event = { event: "test" };
  expect(beforeSend(event)).toBe(event);
  apply("rejected");
  expect(client.opt_out_capturing).toHaveBeenCalledTimes(1);
  expect(client.stopSessionRecording).toHaveBeenCalledTimes(1);
  expect(beforeSend(event)).toBeNull();
  apply("accepted");
  expect(client.init).toHaveBeenCalledTimes(1);
  expect(client.opt_in_capturing).toHaveBeenCalledTimes(2);
  expect(beforeSend(event)).toBe(event);
  apply(null);
  expect(client.opt_out_capturing).toHaveBeenCalledTimes(2);
});

test("missing analytics configuration does not prevent saving a choice", () => {
  const { client, apply } = setup("");
  expect(() => apply("accepted")).not.toThrow();
  expect(client.init).not.toHaveBeenCalled();
});

test("consent preserves invite redaction through withdrawal and re-acceptance", () => {
  const privacy = createAnalyticsPrivacyOptions();
  const filter = mock(privacy.before_send);
  const { apply, config } = setup("test-key", { ...privacy, before_send: filter });
  const event = {
    uuid: "test-event", event: "$pageview", timestamp: new Date(0),
    properties: {
      $current_url: "https://table.example/join/Secret123",
      $referrer: "https://table.example/join/Secret123",
      $set: { $initial_current_url: "https://table.example/join/Secret123" },
    },
  };
  apply("accepted");
  expect(config().loaded).toBe(privacy.loaded);
  expect(config().session_recording).toBe(privacy.session_recording);
  expect(JSON.stringify(config().before_send!(event))).not.toContain("Secret123");
  expect(config().before_send!(event)?.properties.$current_url).toBe("https://table.example/join/[redacted]");
  filter.mockClear();
  apply("rejected");
  expect(config().before_send!(event)).toBeNull();
  expect(filter).not.toHaveBeenCalled();
  apply("accepted");
  expect(JSON.stringify(config().before_send!(event))).not.toContain("Secret123");
});

test("an existing privacy callback can still drop an event", () => {
  const { apply, config } = setup("test-key", { before_send: () => null });
  apply("accepted");
  expect(config().before_send!({ uuid: "test", event: "test", properties: {}, timestamp: new Date(0) })).toBeNull();
});

test("callback arrays run in order and stop when a filter drops the event", () => {
  const first = mock(createAnalyticsPrivacyOptions().before_send);
  const drop = mock(() => null);
  const last = mock((event) => event);
  const { apply, config } = setup("test-key", { before_send: [first, drop, last] });
  apply("accepted");
  const event = { uuid: "test", event: "test", properties: { $current_url: "/join/Secret123" }, timestamp: new Date(0) };
  expect(config().before_send!(event)).toBeNull();
  expect(drop).toHaveBeenCalledWith(expect.objectContaining({ properties: { $current_url: "/join/[redacted]" } }));
  expect(last).not.toHaveBeenCalled();
});
