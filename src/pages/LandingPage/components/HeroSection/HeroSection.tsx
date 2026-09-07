import { ArrowDown, Monitor, Sparkles } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { LandingAction } from "../LandingAction";

export function HeroSection() {
  const posthog = usePostHog();
  return (
    <section
      className="landing-hero landing-container"
      aria-labelledby="hero-title"
    >
      <div className="landing-hero-copy">
        <p className="landing-eyebrow">
          <span className="landing-spark" />
          For DMs around a real table
        </p>
        <h1 id="hero-title">
          Bring your
          <br />
          battlemap <span>to life.</span>
        </h1>
        <p className="landing-intro">
          Turn your maps into atmospheric encounters with dynamic lighting,
          custom effects, and a dedicated player view for your TV table. All in
          your browser.
        </p>
        <div className="landing-hero-actions">
          <LandingAction placement="hero" />
          <a
            className="landing-text-link"
            href="#how-it-works"
            onClick={() =>
              posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, {
                placement: "hero",
                action: "how_it_works",
              })
            }
          >
            See how it works
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="landing-hero-note">
          Your map. Your table. A little more magic.
        </p>
      </div>
      <div className="landing-hero-aside" aria-hidden="true">
        <img src="/lightling.svg" alt="" width={68} height={68} />
        <p>
          Set the scene.
          <br />
          <span>Let the story happen.</span>
        </p>
        <div>
          <Monitor size={15} />
          Made for your TV table
        </div>
        <div>
          <Sparkles size={15} />
          Powered by your imagination
        </div>
      </div>
    </section>
  );
}
