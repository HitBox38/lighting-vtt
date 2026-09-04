import { LayoutGrid, List } from "lucide-react";

import type { ViewMode } from "@/pages/LibraryPage/types";

interface SceneViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function SceneViewToggle({ viewMode, onViewModeChange }: SceneViewToggleProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border">
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
        className={`p-1.5 transition-colors ${
          viewMode === "grid"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}>
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        title="List view"
        aria-label="List view"
        aria-pressed={viewMode === "list"}
        className={`p-1.5 transition-colors ${
          viewMode === "list"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}>
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
