import { useAnalyticsView } from "@/lib/hooks/useAnalyticsView";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
export function useLibraryViewTracking(isLoaded: boolean, signedIn: boolean) {
  useAnalyticsView(ANALYTICS_EVENTS.ActivationLibraryViewed, `library:${signedIn}`, { signed_in: signedIn }, isLoaded);
}
