import { SignedIn, SignInButton, SignedOut, UserButton } from "@clerk/clerk-react";
import { HudSurface } from "@/components/hud/HudSurface";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Link } from "react-router-dom";
import { LibraryIcon } from "lucide-react";

export const UserToolbar = () => (
  <HudSurface className="items-center">
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
  </HudSurface>
);
