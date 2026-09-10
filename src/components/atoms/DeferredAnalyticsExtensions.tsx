import { useEffect } from "react";
import { afterPageLoad } from "@/lib/afterPageLoad";
import { deferredAnalyticsScripts } from "@/lib/deferredAnalyticsScripts";

/** Keep optional replay and survey downloads out of the initial page load. */
export function DeferredAnalyticsExtensions() {
  useEffect(() => afterPageLoad(deferredAnalyticsScripts.resume), []);

  return null;
}
