import { useState } from "react";
import { Settings, Moon, Sun, PanelLeft, PanelRight } from "lucide-react";

import { useThemeStore } from "@/stores/themeStore";
import { useUIPreferencesStore, type SidebarSide } from "@/stores/uiPreferencesStore";
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

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function AppSettingsDialog() {
  const [open, setOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const setSidebarSide = useUIPreferencesStore((state) => state.setSidebarSide);

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark");
  };

  const handleSidebarSideChange = (value: string) => {
    setSidebarSide(value as SidebarSide);
  };

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
          <DialogDescription>
            Customize your application preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-border divide-y">
          <SettingRow label="Theme" description="Choose light or dark mode">
            <Select value={theme} onValueChange={handleThemeChange}>
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
          <SettingRow
            label="Initiative sidebar"
            description="Position of the sidebar panel"
          >
            <Select value={sidebarSide} onValueChange={handleSidebarSideChange}>
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

export default AppSettingsDialog;
