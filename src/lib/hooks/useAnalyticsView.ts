import { useEffect, useEffectEvent, useRef } from "react";
import { usePostHog } from "@posthog/react";
import { useCookieConsentStore } from "@/stores/cookieConsentStore";
import { analyticsEnabled, createViewTracker, type AnalyticsProperties } from "@/lib/analyticsContext";
import type { AnalyticsEventName } from "@/lib/analytics";

export function useAnalyticsReady() {
  const consent = useCookieConsentStore(state => state.consent);
  return consent === "accepted" && analyticsEnabled();
}

export function useAnalyticsView(event: AnalyticsEventName, key: string, properties: AnalyticsProperties | (() => AnalyticsProperties) = {}, available = true) {
  const posthog = usePostHog();
  const ready = useAnalyticsReady();
  const tracker = useRef(createViewTracker());
  const send = useEffectEvent(() => posthog.capture(event, typeof properties === "function" ? properties() : properties));
  useEffect(() => {
    if (tracker.current(key, ready && available)) send();
  }, [key, ready, available]);
}
