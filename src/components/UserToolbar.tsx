import { SignedIn, SignInButton, SignedOut, UserButton } from "@clerk/clerk-react";
import { HudSurface } from "@/components/hud/HudSurface";
import { Button } from "./ui/button";
import { AppSettingsDialog } from "./AppSettingsDialog";
import { Link } from "react-router-dom";
import { LibraryIcon, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";

export const UserToolbar = () => {
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const toggleSidebarOpen = useUIPreferencesStore((state) => state.toggleSidebarOpen);
  const ToggleIcon = sidebarSide === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <HudSurface className="items-center">
      <Button asChild>
        <Link to="/library">
          <LibraryIcon className="size-4" />
          Library
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={sidebarOpen ? "Hide initiative sidebar" : "Show initiative sidebar"}
        title={sidebarOpen ? "Hide initiative sidebar" : "Show initiative sidebar"}
        onClick={toggleSidebarOpen}>
        <ToggleIcon className="size-4" />
      </Button>
      <AppSettingsDialog />
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
};
