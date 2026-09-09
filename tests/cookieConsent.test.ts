import { expect, mock, test } from "bun:test";
import type { PostHog, PostHogConfig } from "posthog-js";
import { createPostHogConsentController } from "../src/lib/posthogConsent";

function setup(apiKey: string | undefined = "test-key") {
  let config: Partial<PostHogConfig> = {};
  const client = {
    init: mock((_key: string, options: Partial<PostHogConfig>) => { config = options; }),
    opt_in_capturing: mock(() => {}),
    opt_out_capturing: mock(() => {}),
    stopSessionRecording: mock(() => {}),
    set_config: mock(() => {}),
  };
  return {
    client,
    config: () => config,
    apply: createPostHogConsentController(client as unknown as PostHog, apiKey, {}),
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
