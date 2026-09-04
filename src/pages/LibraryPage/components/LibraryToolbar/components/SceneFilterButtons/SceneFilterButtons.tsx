import { Lightbulb, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Filters } from "@/pages/LibraryPage/types";

interface SceneFilterButtonsProps {
  filters: Filters;
  onFiltersChange: (updater: (prev: Filters) => Filters) => void;
}

export function SceneFilterButtons({ filters, onFiltersChange }: SceneFilterButtonsProps) {
  return (
    <>
      <Button
        variant={filters.hasLights ? "default" : "outline"}
        size="sm"
        onClick={() => onFiltersChange((prev) => ({ ...prev, hasLights: !prev.hasLights }))}
        className="h-8 gap-1.5 text-xs">
        <Lightbulb className="h-3.5 w-3.5" />
        Has Lights
      </Button>
      <Button
        variant={filters.hasPresets ? "default" : "outline"}
        size="sm"
        onClick={() => onFiltersChange((prev) => ({ ...prev, hasPresets: !prev.hasPresets }))}
        className="h-8 gap-1.5 text-xs">
        <Layers className="h-3.5 w-3.5" />
        Has Presets
      </Button>
    </>
  );
}
