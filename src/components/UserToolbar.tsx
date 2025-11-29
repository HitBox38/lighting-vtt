import { SignedIn, SignInButton, SignedOut, UserButton } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Link } from "react-router-dom";
import { LibraryIcon } from "lucide-react";

export const UserToolbar = () => (
  <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur items-center">
    <Button asChild>
      <Link to="/library">
        <LibraryIcon className="size-4" />
        Library
      </Link>
    </Button>
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
