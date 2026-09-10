import { useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsentStore } from "@/stores/cookieConsentStore";

export function CookieConsent() {
  const consent = useCookieConsentStore((state) => state.consent);
  const setConsent = useCookieConsentStore((state) => state.setConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const open = consent === null || preferencesOpen;

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-3 left-3 z-40 gap-2 rounded-full bg-background text-xs shadow-sm"
        onClick={() => setPreferencesOpen(true)}
        aria-expanded={false}
        aria-controls="cookie-consent"
      >
        <Cookie aria-hidden="true" />
        Cookie settings
      </Button>
    );
  }

  return (
    <section
      id="cookie-consent"
      aria-labelledby="cookie-consent-title"
      className="ph-no-capture fixed inset-x-3 bottom-3 z-40 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-xl sm:left-5 sm:right-auto sm:bottom-5 sm:w-[440px] sm:p-6"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <Cookie className="size-5" aria-hidden="true" />
        </div>
        <h2 id="cookie-consent-title" className="text-base font-semibold">A little about cookies</h2>
        {consent !== null && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close cookie settings" onClick={() => setPreferencesOpen(false)}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        We use essential cookies for sign-in and security through Clerk. With your permission,
        PostHog also uses cookies and browser storage to help us understand how you use Lighting VTT
        and improve the experience.
      </p>
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer rounded-sm text-foreground underline decoration-border underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">What we collect</summary>
        <div className="mt-3 space-y-3 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Essential · always on.</strong> Clerk keeps you signed in and protects your session. We also save your cookie choice on this browser.</p>
          <p><strong className="text-foreground">Analytics · optional.</strong> PostHog collects page visits, device information and interactions, and may record sessions when enabled. This helps us understand feature usage and troubleshoot problems.</p>
          <p>Rejecting analytics does not affect sign-in or your tabletop. Change your choice anytime in Cookie settings. Withdrawing consent stops future collection; it does not delete data already sent.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="underline underline-offset-4" href="https://clerk.com/legal/privacy" target="_blank" rel="noreferrer">Clerk privacy policy</a>
            <a className="underline underline-offset-4" href="https://posthog.com/privacy" target="_blank" rel="noreferrer">PostHog privacy policy</a>
          </div>
        </div>
      </details>
      {consent !== null && <p className="mt-3 text-xs text-muted-foreground">Analytics are currently {consent === "accepted" ? "on" : "off"}.</p>}
      <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <Button variant="outline" onClick={() => { setConsent("rejected"); setPreferencesOpen(false); }}>Reject analytics</Button>
        <Button variant="outline" onClick={() => { setConsent("accepted"); setPreferencesOpen(false); }}>Accept analytics</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Your table, your choice. Essential cookies stay on.</p>
    </section>
  );
}
