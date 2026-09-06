import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Zap } from "lucide-react";

import { AppSettingsDialog } from "@/components/organisms/AppSettingsDialog";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight select-none">Lighting VTT</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost"><Link to="/effects">Effects</Link></Button>
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
  );
}
