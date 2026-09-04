import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { FeatureTabs } from "@/pages/LandingPage/components/FeatureTabs";
import { HeroSection } from "@/pages/LandingPage/components/HeroSection";
import { LandingHeader } from "@/pages/LandingPage/components/LandingHeader";

export function LandingPage() {
  const posthog = usePostHog();
  const didTrackLandingViewRef = useRef(false);

  useEffect(() => {
    if (didTrackLandingViewRef.current) {
      return;
    }
    didTrackLandingViewRef.current = true;
    posthog.capture(ANALYTICS_EVENTS.ActivationLandingViewed);
  }, [posthog]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <FeatureTabs />
      </main>
    </div>
  );
}
