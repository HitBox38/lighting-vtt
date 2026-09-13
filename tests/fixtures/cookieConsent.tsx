import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Separate process: the store must read the browser's saved choice at module initialization.
const saved = process.argv[2];
let stored = saved === "pending" ? null : saved;
Object.defineProperty(globalThis, "window", { value: {
  localStorage: {
    getItem: () => {
      if (saved === "unavailable") throw new Error("Storage blocked");
      return stored;
    },
    setItem: (_key: string, value: string) => {
      if (saved === "unavailable") throw new Error("Storage blocked");
      stored = value;
    },
  },
} });
const { CookieConsent } = await import("../../src/components/organisms/CookieConsent/CookieConsent");
const { useCookieConsentStore, readCookieConsent } = await import("../../src/stores/cookieConsentStore");
const html = renderToStaticMarkup(<MemoryRouter initialEntries={["/scene"]}><CookieConsent /></MemoryRouter>);
if (saved === "accepted" || saved === "rejected") {
  assert.equal(html, "", "a persisted choice must not leave any floating cookie UI");
  assert.equal(useCookieConsentStore.getState().consent, saved);
} else {
  assert.match(html, /A little about cookies/);
  assert.match(html, /Reject analytics/);
  assert.match(html, /Accept analytics/);
  assert.equal(useCookieConsentStore.getState().consent, null);
}
useCookieConsentStore.getState().setConsent("accepted");
assert.equal(useCookieConsentStore.getState().consent, "accepted");
if (saved !== "unavailable") assert.equal(readCookieConsent(), "accepted");
useCookieConsentStore.getState().setConsent("rejected");
assert.equal(useCookieConsentStore.getState().consent, "rejected");
if (saved !== "unavailable") assert.equal(readCookieConsent(), "rejected");
