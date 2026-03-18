import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/clerk-react";
import { Zap } from "lucide-react";

/** Shown when the user is not authenticated. */
export const SignedOutState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
      <Zap className="w-7 h-7 text-muted-foreground" />
    </div>
    <h2 className="text-2xl font-semibold tracking-tight">Sign in to see your scenes</h2>
    <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
      Create and manage dynamic lighting scenes for your virtual tabletop sessions.
    </p>
    <SignInButton mode="modal" forceRedirectUrl="/library">
      <Button>Sign in</Button>
    </SignInButton>
  </div>
);
