import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative isolate flex flex-col items-center overflow-hidden px-6 pt-28 pb-20 text-center sm:pt-36">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[640px] -translate-x-1/2 rounded-full opacity-[0.06] blur-[100px] dark:opacity-20"
        style={{ background: "oklch(0.65 0.16 65)" }}
        aria-hidden="true"
      />
      <h1 className="relative animate-fade-slide-up text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
        Lighting VTT
      </h1>
      <p
        className="relative mt-5 max-w-md animate-fade-slide-up text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
        style={{ animationDelay: "80ms" }}>
        A 2D dynamic lighting engine for virtual tabletops, built for TV-table setups. Place lights,
        set the mood, invite your players.
      </p>
      <div
        className="relative mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-slide-up"
        style={{ animationDelay: "160ms" }}>
        <SignedOut>
          <SignUpButton mode="modal" forceRedirectUrl="/library">
            <Button size="lg">Get Started</Button>
          </SignUpButton>
          <SignInButton mode="modal" forceRedirectUrl="/library">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Button size="lg" asChild>
            <Link to="/library">Your Library</Link>
          </Button>
        </SignedIn>
      </div>
    </section>
  );
}
