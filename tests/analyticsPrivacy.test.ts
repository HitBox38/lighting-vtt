import { afterEach, describe, expect, test } from "bun:test";
import type { CaptureResult, PostHogConfig } from "posthog-js";
// Use the SDK's unminified entrypoint to exercise its capture/flags transport
// boundary, including the persistence format our compatibility guard protects.
import { PostHog } from "posthog-js/lib/src/entrypoints/main.cjs.js";
import { createAnalyticsPrivacyOptions, redactInviteUrl } from "../src/lib/analyticsPrivacy";

const code = "AbCd2345";
const invite = `https://table.example/join/${code}`;
const safeInvite = "https://table.example/join/[redacted]";
const privacy = createAnalyticsPrivacyOptions();

function event(properties: CaptureResult["properties"]): CaptureResult {
  return { uuid: "event-id", event: "$pageview", properties, timestamp: new Date(0) };
}

describe("invite URL redaction", () => {
  test.each([
    invite,
    `https://table.example/JOIN/${code}`,
    `https://table.example/%6aoin/${code}`,
    `https://table.example/%6A%6F%69%6E/%41bCd2345`,
  ])("redacts a join route: %s", (url) => {
    expect(redactInviteUrl(url)).toBe(safeInvite);
  });

  test("redacts encoded redirects, malformed suffixes and multiple embedded links", () => {
    for (const url of [
      `/library?returnTo=${encodeURIComponent(invite)}`,
      `/library?returnTo=${encodeURIComponent(encodeURIComponent(invite))}`,
      `${invite}?malformed=%ZZ`,
      `${invite}?copy=${code}#${code}`,
      `${invite}?copy=%20${code}%22${code}`,
      `Open "${invite}" or "${invite}"`,
    ]) {
      expect(redactInviteUrl(url)).not.toContain(code);
      expect(redactInviteUrl(url)).toContain("/join/[redacted]");
    }
  });

  test("preserves ordinary URLs, attribution, Unicode and non-URL values", () => {
    for (const value of [
      "/scene?id=scene123&playerId=player456",
      "https://table.example/?utm_source=discord#features",
      "https://example.com/search?q=%D7%A9%D7%9C%D7%95%D7%9D",
      "https://example.com/?next=%2Flibrary",
      "scene_created",
      "https://table.example/join",
    ]) expect(redactInviteUrl(value)).toBe(value);
  });

  test("sanitizes retained session, initial, referrer and autocapture copies without changing event identity", () => {
    const input = {
      ...event({
        $current_url: "/scene?id=scene123",
        $session_entry_url: invite,
        $session_entry_pathname: `/join/${code}`,
        $referrer: invite,
        $set: { $initial_current_url: invite },
        $elements: [{ attr__href: invite }],
        $elements_chain: `a:attr__href="${invite}"`,
        count: 3,
        success: true,
      }),
      $set: { $initial_referrer: invite },
      $set_once: { $initial_current_url: invite, $initial_utm_source: "discord" },
    };
    const output = privacy.before_send(input)!;
    expect(JSON.stringify(output)).not.toContain(code);
    expect(output.properties.$current_url).toBe("/scene?id=scene123");
    expect(output.$set_once?.$initial_utm_source).toBe("discord");
    expect(output.properties.count).toBe(3);
    expect(output.properties.success).toBe(true);
    expect(output.event).toBe(input.event);
    expect(output.uuid).toBe(input.uuid);
    expect(output.timestamp).toBe(input.timestamp);
    expect(input.properties.$session_entry_url).toBe(invite);
    expect(privacy.before_send(null)).toBeNull();
  });

  test("masks replay metadata, network URLs and DOM attributes before compression", () => {
    const recording = privacy.session_recording;
    expect(recording.maskCapturedNetworkRequestFn({ name: invite })).toEqual({ name: safeInvite });
    expect(recording.maskCapturedNetworkRequestFn({ name: invite, method: "GET", status: 200 }))
      .toEqual({ name: safeInvite, method: "GET", status: 200 });
    expect(recording.maskAttributeFn("href", invite)).toBe(safeInvite);
    expect(recording.maskAttributeFn("class", "button-primary")).toBe("button-primary");
  });
});

const clients: PostHog[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) {
    client.featureFlags.destroy();
    client._requestQueue?.unload();
  }
});

function createClient(options: Partial<PostHogConfig> = {}) {
  const client = new PostHog();
  clients.push(client);
  const requests: Array<{ url: string; data?: unknown }> = [];
  // Intercept the network boundary before initialization; no requests leave tests.
  client._send_request = (request) => { requests.push(request); };
  client.init("phc_test_only", {
    persistence: "memory",
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: true,
    ...options,
  });
  return { client, requests };
}

function requestFlags(client: PostHog) {
  // Enable only the flags request under test, with transport still intercepted.
  client.featureFlags.updateConfig(client.config, false);
  client.featureFlags._callFlagsEndpoint();
}

test("installed SDK reproduces the leak without the guard and removes it across capture and flags with the guard", () => {
  for (const protectedClient of [false, true]) {
    const { client, requests } = createClient(protectedClient ? createAnalyticsPrivacyOptions() : {});
    // Simulate attribution saved on arrival before a later capture/navigation.
    client.register({
      $initial_person_info: {
        u: `${invite}?utm_source=discord&utm_campaign=game%26night&copy=${code}`,
        r: "https://discord.com/",
      },
      $initial_referrer_info: { $referrer: invite },
      $initial_campaign_params: { utm_source: "discord", returnTo: invite },
      $stored_person_properties: { $initial_current_url: invite },
    });
    const captured = client.capture("join_scene_succeeded", {
      $current_url: `/join/${code}`,
      $session_entry_url: invite,
      $session_entry_pathname: `/join/${code}`,
    });
    const afterNavigation = client.capture("scene_loaded", {
      $current_url: "/scene?id=scene123",
      $session_entry_url: invite,
    });
    requestFlags(client);
    const flags = requests.find((request) => request.url.includes("/flags/"));
    expect(flags).toBeDefined();
    const payload = JSON.stringify({ captured, afterNavigation, flags: flags?.data });
    if (protectedClient) {
      expect(payload).not.toContain(code);
      expect(captured?.event).toBe("join_scene_succeeded");
      expect(afterNavigation?.properties.$current_url).toBe("/scene?id=scene123");
      expect(payload).toContain("discord");
      expect(client.persistence?.get_initial_props().$initial_utm_source).toBe("discord");
      expect(client.persistence?.get_initial_props().$initial_utm_campaign).toBe("game&night");
    } else {
      expect(JSON.stringify(captured)).toContain(code);
      expect(JSON.stringify(flags?.data)).toContain(code);
    }
  }
});

test("loaded callback cleans old persisted attribution before the first flags request", () => {
  const options = createAnalyticsPrivacyOptions();
  const { client, requests } = createClient({
    ...options,
    loaded(instance) {
      // Memory persistence fixture for a returning browser with a stored invite.
      instance.register({ $initial_person_info: { u: invite, r: invite } });
      options.loaded(instance);
    },
  });
  requestFlags(client);
  const flags = requests.find((request) => request.url.includes("/flags/"));
  expect(flags).toBeDefined();
  expect(JSON.stringify(flags?.data)).not.toContain(code);
  expect(JSON.stringify(flags?.data)).toContain("/join/[redacted]");
});
