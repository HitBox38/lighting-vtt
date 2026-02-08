import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Zap } from "lucide-react";

export const LibraryHeader = () => (
  <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
    <div className="flex h-14 items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <Zap className="w-5 h-5 text-primary" />
        <span className="text-base font-semibold tracking-tight select-none">Lighting VTT</span>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal" forceRedirectUrl="/library">
            <Button variant="default" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/library">
            <Button variant="outline" size="sm">
              Sign up
            </Button>
          </SignUpButton>
        </SignedOut>
      </div>
    </div>
  </header>
);
