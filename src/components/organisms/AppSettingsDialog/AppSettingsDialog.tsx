import { useEffect, useRef, useState } from "react";
import { Settings, Moon, Sun, PanelLeft, PanelRight } from "lucide-react";

import { CookiePreferences } from "@/components/organisms/CookieConsent/CookieConsent";
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

export function AppSettingsDialog({ mobileFriendly = false, triggerClassName }: { mobileFriendly?: boolean; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [cookieSettings, setCookieSettings] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [cookieSettings]);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const setSidebarSide = useUIPreferencesStore((state) => state.setSidebarSide);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setCookieSettings(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={triggerClassName} aria-label="Open settings">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={mobileFriendly ? "ph-no-capture mobile-page max-h-[90dvh] overflow-y-auto sm:max-w-md [&_[data-setting-row]]:max-sm:flex-col [&_[data-setting-row]]:max-sm:items-start" : "ph-no-capture max-h-[90dvh] overflow-y-auto sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>{cookieSettings ? "Cookie settings" : "Settings"}</DialogTitle>
          <DialogDescription>{cookieSettings ? "Choose whether to allow optional analytics." : "Customize your application preferences."}</DialogDescription>
        </DialogHeader>
        {cookieSettings ? (
          <div>
            <Button variant="ghost" size="sm" className="mb-3" onClick={() => setCookieSettings(false)}>Back to settings</Button>
            <CookiePreferences onComplete={() => { setOpen(false); setCookieSettings(false); }} />
          </div>
        ) : <div className="divide-border divide-y">
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
          <SettingRow label="Privacy" description="Review or change your analytics consent">
            <Button variant="outline" onClick={() => setCookieSettings(true)}>Cookie settings</Button>
          </SettingRow>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
