import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useThemeStore } from "@/stores/themeStore";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <div>
      <Button onClick={toggleTheme}>
        {theme === "light" ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
      </Button>
    </div>
  );
};
