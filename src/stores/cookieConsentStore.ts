import { create } from "zustand";

export const COOKIE_CONSENT_KEY = "lighting-vtt:cookie-consent:v1";
export type CookieConsent = "accepted" | "rejected" | null;

export function readCookieConsent(): CookieConsent {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export const useCookieConsentStore = create<{
  consent: CookieConsent;
  setConsent: (consent: Exclude<CookieConsent, null>) => void;
}>(() => ({
  consent: readCookieConsent(),
  setConsent: (consent) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, consent);
    } catch {
      // Keep the choice for this visit when browser storage is unavailable.
    }
    useCookieConsentStore.setState({ consent });
  },
}));
