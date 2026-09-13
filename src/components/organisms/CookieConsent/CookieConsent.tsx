import { useState } from "react";
import { Cookie } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCookieConsentStore } from "@/stores/cookieConsentStore";

/** Shared by the first-visit banner and the settings dialog. */
export function CookiePreferences({ onComplete }: { onComplete: () => void }) {
  const consent = useCookieConsentStore((state) => state.consent);
  const setConsent = useCookieConsentStore((state) => state.setConsent);
  return (
    <>
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
          <p>Rejecting analytics does not affect sign-in or your tabletop. Change your choice anytime in Settings → Cookie settings, or in the website footer. Withdrawing consent stops future collection; it does not delete data already sent.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a className="underline underline-offset-4" href="https://clerk.com/legal/privacy" target="_blank" rel="noreferrer">Clerk privacy policy</a>
            <a className="underline underline-offset-4" href="https://posthog.com/privacy" target="_blank" rel="noreferrer">PostHog privacy policy</a>
          </div>
        </div>
      </details>
      {consent !== null && <p className="mt-3 text-xs text-muted-foreground">Analytics are currently {consent === "accepted" ? "on" : "off"}.</p>}
      <div className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <Button variant="outline" onClick={() => { setConsent("rejected"); onComplete(); }}>Reject analytics</Button>
        <Button variant="outline" onClick={() => { setConsent("accepted"); onComplete(); }}>Accept analytics</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Your table, your choice. Essential cookies stay on.</p>
    </>
  );
}

export function CookieSettingsDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="min-h-11 cursor-pointer rounded-sm text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Cookie settings</button>
      </DialogTrigger>
      <DialogContent className="mobile-page ph-no-capture max-h-[calc(100dvh-2rem)] overflow-y-auto bg-background text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cookie settings</DialogTitle>
          <DialogDescription>Choose whether to allow optional analytics.</DialogDescription>
        </DialogHeader>
        <div><CookiePreferences onComplete={() => setOpen(false)} /></div>
      </DialogContent>
    </Dialog>
  );
}

export function CookieConsent() {
  const consent = useCookieConsentStore((state) => state.consent);
  const { pathname } = useLocation();
  if (consent !== null) return null;

  return (
    <section
      id="cookie-consent"
      aria-labelledby="cookie-consent-title"
      className={`mobile-page ph-no-capture fixed inset-x-3 z-40 overflow-y-auto rounded-xl border border-border bg-background p-5 text-foreground shadow-xl sm:left-5 sm:right-auto sm:w-[440px] sm:p-6 ${pathname === "/scene" ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))]" : "bottom-3 max-h-[calc(100dvh-1.5rem)] sm:bottom-5"}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <Cookie className="size-5" aria-hidden="true" />
        </div>
        <h2 id="cookie-consent-title" className="text-base font-semibold">A little about cookies</h2>
      </div>
      <CookiePreferences onComplete={() => {}} />
    </section>
  );
}
