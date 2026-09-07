import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { usePostHog } from "@posthog/react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { LandingAction } from "../LandingAction";

export function LandingHeader() {
  const posthog = usePostHog();
  return (
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Link to="/" className="landing-brand" aria-label="Lighting VTT home">
          <img src="/lightling.svg" alt="" width={32} height={32} />
          <span>
            Lighting <span className="landing-brand-suffix">VTT</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="landing-nav">
          <a className="landing-desktop-link" href="#how-it-works">
            How it works
          </a>
          <Link
            className="landing-desktop-link"
            to="/effects"
            onClick={() =>
              posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, {
                placement: "header",
                action: "explore_effects",
              })
            }
          >
            Effects
          </Link>
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/library">
              <Button
                variant="ghost"
                className="landing-sign-in"
                onClick={() =>
                  posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, {
                    placement: "header",
                    action: "sign_in",
                  })
                }
              >
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <LandingAction placement="header" />
        </nav>
      </div>
    </header>
  );
}
