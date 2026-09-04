import { useState } from "react";
import { Settings, Moon, Sun, PanelLeft, PanelRight } from "lucide-react";

import { SettingRow } from "@/components/molecules/SettingRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemeStore } from "@/stores/themeStore";
import { useUIPreferencesStore, type SidebarSide } from "@/stores/uiPreferencesStore";

export function AppSettingsDialog() {
  const [open, setOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const setSidebarSide = useUIPreferencesStore((state) => state.setSidebarSide);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open settings">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your application preferences.</DialogDescription>
        </DialogHeader>
        <div className="divide-border divide-y">
          <SettingRow label="Theme" description="Choose light or dark mode">
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <Sun className="size-4" />
                  Light
                </SelectItem>
                <SelectItem value="dark">
                  <Moon className="size-4" />
                  Dark
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Initiative sidebar" description="Position of the sidebar panel">
            <Select
              value={sidebarSide}
              onValueChange={(value) => setSidebarSide(value as SidebarSide)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">
                  <PanelLeft className="size-4" />
                  Left
                </SelectItem>
                <SelectItem value="right">
                  <PanelRight className="size-4" />
                  Right
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </DialogContent>
    </Dialog>
  );
}
