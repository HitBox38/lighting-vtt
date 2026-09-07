import {
  Show,
  SignInButton,
  UserButton,
} from "@clerk/react";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";

import { HudSurface } from "@/components/atoms/HudSurface";
import { AppSettingsDialog } from "@/components/organisms/AppSettingsDialog";
import { Button } from "@/components/ui/button";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";
import { useWorkshopStore } from "@/stores/workshopStore";

export const UserToolbar = () => {
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const toggleSidebarOpen = useUIPreferencesStore(
    (state) => state.toggleSidebarOpen,
  );
  const ToggleIcon = sidebarSide === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <HudSurface className="items-center">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          sidebarOpen ? "Hide initiative sidebar" : "Show initiative sidebar"
        }
        title={
          sidebarOpen ? "Hide initiative sidebar" : "Show initiative sidebar"
        }
        onClick={() => {
          if (window.innerWidth < 1024 && useWorkshopStore.getState().open) {
            useWorkshopStore.getState().setOpen(false);
            if (!sidebarOpen) toggleSidebarOpen();
          } else toggleSidebarOpen();
        }}
      >
        <ToggleIcon className="size-4" />
      </Button>
      <AppSettingsDialog />
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl={"/library"}>
          <Button>Sign in</Button>
        </SignInButton>
      </Show>
    </HudSurface>
  );
};
