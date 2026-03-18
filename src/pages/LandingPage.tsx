import { useState } from "react";
import { AppSettingsDialog } from "@/components/AppSettingsDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import {
  FlipHorizontal2,
  Globe,
  Layers,
  type LucideIcon,
  Sun,
  Swords,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Feature {
  icon: LucideIcon;
  label: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sun,
    label: "Radial Lights",
    description:
      "Place point lights that cast circular illumination with adjustable radius. Drag them around the map to light up rooms, campfires, or any area of interest.",
  },
  {
    icon: Target,
    label: "Conic Lights",
    description:
      "Directional cones of light aimed from a source to a target point. Use them for wall torches, character vision cones, or spotlight effects.",
  },
  {
    icon: FlipHorizontal2,
    label: "Mirrors",
    description:
      "Place reflective surfaces that bounce light realistically. Build complex lighting setups where beams redirect off mirrors across the map.",
  },
  {
    icon: Layers,
    label: "Scene Presets",
    description:
      "Save your full lighting configuration as a named preset. Switch between setups instantly or cycle through them for dynamic encounters.",
  },
  {
    icon: Swords,
    label: "Tokens & Initiative",
    description:
      "Drop character and creature tokens with custom images and sizes. Track turn order with the built-in initiative sidebar.",
  },
  {
    icon: Globe,
    label: "Online Play",
    description:
      "Generate an invite link for your players. They join from their browser and see your map with live lighting updates in real time.",
  },
];

export const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold tracking-tight select-none">Lighting VTT</span>
          </div>
          <div className="flex items-center gap-3">
            <AppSettingsDialog />
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/library">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/library">
                <Button variant="outline" size="sm">
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate flex flex-col items-center text-center px-6 pt-28 sm:pt-36 pb-20 overflow-hidden">
          <div
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[640px] rounded-full opacity-[0.06] dark:opacity-20 blur-[100px]"
            style={{ background: "oklch(0.65 0.16 65)" }}
            aria-hidden="true"
          />

          <h1 className="relative text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance animate-fade-slide-up">
            Lighting VTT
          </h1>

          <p
            className="relative text-muted-foreground text-base sm:text-lg max-w-md mt-5 leading-relaxed text-pretty animate-fade-slide-up"
            style={{ animationDelay: "80ms" }}>
            A 2D dynamic lighting engine for virtual tabletops, built for TV-table setups. Place
            lights, set the mood, invite your players.
          </p>

          <div
            className="relative flex flex-wrap items-center justify-center gap-3 mt-8 animate-fade-slide-up"
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

        <section
          className="border-t border-border/40 px-6 py-14 animate-fade-slide-up"
          style={{ animationDelay: "240ms" }}>
          <div className="mx-auto flex max-w-xl flex-col items-center">
            <div
              role="tablist"
              aria-label="Features"
              className="flex flex-wrap items-center justify-center gap-1">
              {FEATURES.map((f, i) => (
                <button
                  key={f.label}
                  role="tab"
                  aria-selected={i === activeFeature}
                  aria-controls="feature-panel"
                  onClick={() => setActiveFeature(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                    i === activeFeature
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}>
                  <f.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {f.label}
                </button>
              ))}
            </div>

            <p
              key={activeFeature}
              id="feature-panel"
              role="tabpanel"
              className="mt-5 max-w-sm text-center text-sm leading-relaxed text-muted-foreground animate-fade-slide-up">
              {FEATURES[activeFeature].description}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
