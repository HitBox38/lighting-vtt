import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/themeStore";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <Button onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "light" ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
    </Button>
  );
};
