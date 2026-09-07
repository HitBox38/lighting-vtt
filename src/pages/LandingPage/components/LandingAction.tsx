import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { usePostHog } from "@posthog/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function LandingAction({
  placement,
}: {
  placement: "header" | "hero" | "closing";
}) {
  const posthog = usePostHog();
  const track = (action: string) =>
    posthog.capture(ANALYTICS_EVENTS.LandingCtaClicked, { placement, action });
  return (
    <>
      <SignedOut>
        <SignUpButton mode="modal" forceRedirectUrl="/library">
          <Button
            className="landing-primary"
            size={placement === "header" ? "default" : "lg"}
            onClick={() => track("sign_up")}
          >
            {placement === "header" ? "Get started" : "Create your first scene"}
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Button
          className="landing-primary"
          size={placement === "header" ? "default" : "lg"}
          asChild
        >
          <Link to="/library" onClick={() => track("open_library")}>
            Open your library
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </SignedIn>
    </>
  );
}
