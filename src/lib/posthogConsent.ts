import type { PostHog, PostHogConfig } from "posthog-js";
import type { CookieConsent } from "@/stores/cookieConsentStore";

/** No SDK initialization, requests, or analytics storage before consent. */
export function createPostHogConsentController(
  client: PostHog,
  apiKey: string | undefined,
  options: Partial<PostHogConfig>,
) {
  let initialized = client.__loaded;
  let currentConsent: CookieConsent | undefined;
  const filters = options.before_send
    ? Array.isArray(options.before_send) ? options.before_send : [options.before_send]
    : [];
  const beforeSend: NonNullable<PostHogConfig["before_send"]> = (event) => {
    if (currentConsent !== "accepted") return null;
    // Preserve privacy filtering (including events it drops) after the consent gate.
    for (const filter of filters) {
      if (event === null) return null;
      event = filter(event);
    }
    return event;
  };

  return (consent: CookieConsent) => {
    if (consent === currentConsent) return;
    currentConsent = consent;

    if (consent !== "accepted") {
      if (initialized) {
        client.opt_out_capturing();
        client.stopSessionRecording();
      }
      return;
    }

    if (!apiKey) return;
    if (!initialized) {
      client.init(apiKey, {
        ...options,
        capture_pageview: false, // React Router owns pageviews.
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        before_send: beforeSend,
      });
      initialized = true;
    }
    client.set_config({
      // Refresh the consent guard when Vite reuses an initialized SDK during HMR.
      before_send: beforeSend,
      disable_session_recording: options.disable_session_recording ?? false,
    });
    client.opt_in_capturing({ captureEventName: false });
  };
}
