import { cn } from "@/lib/utils";
import { publicContainerStyles } from "@/lib/publicPageStyles";
import {
  Show,
  SignInButton,
  UserButton,
} from "@clerk/react";
import { usePostHog } from "@posthog/react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { LandingAction } from "../LandingAction";

export function LandingHeader() {
  const posthog = usePostHog();
  return (
    <header className="border-b border-(--lp-line)">
      <div className={cn(publicContainerStyles, "flex min-h-[86px] items-center justify-between gap-4 max-[760px]:min-h-[74px] max-[760px]:flex-wrap max-[760px]:gap-2 max-[760px]:py-3 max-[480px]:items-start")}>
        <Link to="/" className="inline-flex max-[480px]:min-h-11 shrink-0 items-center gap-2.5 text-[21px] font-semibold tracking-[-0.6px] max-[760px]:gap-[7px] max-[760px]:text-[17px]" aria-label="Lighting VTT home">
          <img src="/lightling.svg" alt="" width={32} height={32} className="max-[760px]:size-[27px]" />
          <span>
            Lighting <span className="font-normal text-(--lp-muted)">VTT</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm/[1.5] max-[1000px]:gap-2.5 max-[760px]:min-w-0 max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:gap-1 max-[760px]:[&>a]:min-h-11 max-[760px]:[&>button]:min-h-11 max-[480px]:flex-[1_1_100%] max-[480px]:justify-between [&>button[aria-label='Toggle_theme']]:bg-transparent [&>button[aria-label='Toggle_theme']]:p-2 [&>button[aria-label='Toggle_theme']]:text-(--lp-muted) [&>button[aria-label='Toggle_theme']]:shadow-none">
          <a className="hover:text-(--lp-accent) max-[760px]:hidden max-[480px]:inline-flex max-[480px]:items-center max-[480px]:text-xs" href="#how-it-works">
            How it works
          </a>
          <Link
            className="inline-flex items-center hover:text-(--lp-accent) max-[760px]:px-2 max-[760px]:text-xs"
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
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/library">
              <Button
                variant="ghost"
                className="max-[760px]:px-2 max-[760px]:text-xs"
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
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <LandingAction placement="header" />
        </nav>
      </div>
    </header>
  );
}
