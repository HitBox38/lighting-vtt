import { SignedIn, SignInButton, SignedOut, UserButton } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";

export const UserToolbar = () => {
  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur items-center">
      <ThemeToggle />
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl={"/library"}>
          <Button>Sign in</Button>
        </SignInButton>
      </SignedOut>
    </div>
  );
};
