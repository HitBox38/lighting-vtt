import { useCookieConsentStore } from "@/stores/cookieConsentStore";
import { analyticsEnabled } from "./analyticsContext";

let consentEpoch = 0;
export function analyticsOperationEpoch() { return consentEpoch; }
export function invalidateAnalyticsOperations() { consentEpoch++; }
useCookieConsentStore.subscribe((state, previous) => {
  if (state.consent !== previous.consent) consentEpoch++;
});

/** Snapshot at submission. Async work must never become measurable retroactively. */
export function analyticsOperationGuard() {
  const epoch = consentEpoch;
  const startedWithConsent = useCookieConsentStore.getState().consent === "accepted" && analyticsEnabled();
  return () => startedWithConsent && epoch === consentEpoch && useCookieConsentStore.getState().consent === "accepted";
}
