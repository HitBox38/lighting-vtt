import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { HeroSection } from "./components/HeroSection";
import { LandingHeader } from "./components/LandingHeader";
import { ProductShowcase } from "./components/ProductShowcase";
import { LandingStory, LandingFooter } from "./components/LandingStory";
import "./landing.css";

export function LandingPage() {
  const posthog = usePostHog();
  const didTrackLandingViewRef = useRef(false);
  useEffect(() => {
    if (didTrackLandingViewRef.current) return;
    didTrackLandingViewRef.current = true;
    posthog.capture(ANALYTICS_EVENTS.ActivationLandingViewed);
  }, [posthog]);
  return (
    <div className="landing-page">
      <a href="#landing-main" className="landing-skip">
        Skip to content
      </a>
      <LandingHeader />
      <main id="landing-main" tabIndex={-1}>
        <HeroSection />
        <ProductShowcase />
        <LandingStory />
      </main>
      <LandingFooter />
    </div>
  );
}
