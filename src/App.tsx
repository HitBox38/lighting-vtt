import { lazy, Suspense, useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { LandingPage } from "@/pages/LandingPage";
import { ScenePage } from "@/pages/ScenePage";
import { LibraryPage } from "@/pages/LibraryPage";
import { JoinPage } from "@/pages/JoinPage";
import { EFFECT_EDITOR_NEW_PATH, EFFECT_EDITOR_ROUTE_PATTERN, EFFECT_LIBRARY_PATH } from "@/lib/effects/routes";
import { CookieConsent } from "@/components/organisms/CookieConsent/CookieConsent";
import { useCookieConsentStore } from "@/stores/cookieConsentStore";

let lastTrackedPath: string | null = null;
const EffectEditorPage = lazy(() => import("@/pages/EffectEditorPage").then((module) => ({ default: module.EffectEditorPage })));
const EffectLibraryPage = lazy(() => import("@/pages/EffectLibraryPage").then((module) => ({ default: module.EffectLibraryPage })));
const LegalPage = lazy(() => import("@/pages/LegalPage/LegalPage").then((module) => ({ default: module.LegalPage })));

function PostHogPageviews() {
  const posthog = usePostHog();
  const location = useLocation();
  const consent = useCookieConsentStore((state) => state.consent);

  useEffect(() => {
    if (consent !== "accepted") {
      lastTrackedPath = null;
      return;
    }
    const query = location.search ?? "";
    const hash = location.hash ?? "";
    const path = `${location.pathname}${query}${hash}`;
    if (path === lastTrackedPath) {
      return;
    }
    lastTrackedPath = path;
    posthog.capture("$pageview", { $current_url: path });
  }, [location.pathname, location.search, location.hash, posthog, consent]);

  return null;
}

function App() {
  return (
    <>
      <PostHogPageviews />
      <Suspense fallback={<div className="grid h-dvh place-content-center bg-background text-muted-foreground" role="status">Opening workshop…</div>}><Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<LegalPage document="privacy" />} />
        <Route path="/terms" element={<LegalPage document="terms" />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/scene" element={<ScenePage />} />
        <Route path="/join/:inviteCode" element={<JoinPage />} />
        <Route path={EFFECT_LIBRARY_PATH} element={<EffectLibraryPage />} />
        <Route path={EFFECT_EDITOR_NEW_PATH} element={<EffectEditorPage />} />
        <Route path={EFFECT_EDITOR_ROUTE_PATTERN} element={<EffectEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
      <Toaster position="bottom-center" richColors closeButton />
      <CookieConsent />
    </>
  );
}

export default App;
