import { useLayoutEffect } from "react";
import { useUser } from "@clerk/react";
import { usePostHog } from "@posthog/react";
import { getAnalyticsContext, syncAnalyticsIdentity } from "@/lib/analyticsContext";
import { useAnalyticsReady } from "@/lib/hooks/useAnalyticsView";
import { invalidateAnalyticsOperations } from "@/lib/analyticsOperation";

export function AnalyticsIdentity() {
  const { user, isLoaded } = useUser();
  const posthog = usePostHog();
  const ready = useAnalyticsReady();
  const userId = user?.id ?? null;
  useLayoutEffect(() => {
    if (ready && isLoaded && (posthog.get_property("$user_id") ?? null) !== userId) invalidateAnalyticsOperations();
    const { analytics_schema_version, environment, release } = getAnalyticsContext();
    // Route and scene context are computed per event, never persisted globally.
    syncAnalyticsIdentity(posthog, userId, ready && isLoaded, { analytics_schema_version, environment, release });
  }, [posthog, userId, ready, isLoaded]);
  return null;
}
