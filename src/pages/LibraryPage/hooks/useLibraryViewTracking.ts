import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function useLibraryViewTracking(isLoaded: boolean, signedIn: boolean) {
  const posthog = usePostHog();
  const trackedLibraryViewRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || trackedLibraryViewRef.current) {
      return;
    }
    trackedLibraryViewRef.current = true;
    posthog.capture(ANALYTICS_EVENTS.ActivationLibraryViewed, { signed_in: signedIn });
  }, [isLoaded, posthog, signedIn]);
}
