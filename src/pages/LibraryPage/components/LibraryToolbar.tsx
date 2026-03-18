import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, List, Lightbulb, Layers } from "lucide-react";
import { SORT_LABELS } from "../constants";
import type { Filters, SortOption, ViewMode } from "../types";

interface LibraryToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: Filters;
  onFiltersChange: (updater: (prev: Filters) => Filters) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const LibraryToolbar = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: LibraryToolbarProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="Search scenes..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-9 pr-8 h-9"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={filters.hasLights ? "default" : "outline"}
        size="sm"
        onClick={() =>
          onFiltersChange((prev) => ({
            ...prev,
            hasLights: !prev.hasLights,
          }))
        }
        className="h-8 text-xs gap-1.5">
        <Lightbulb className="w-3.5 h-3.5" />
        Has Lights
      </Button>
      <Button
        variant={filters.hasPresets ? "default" : "outline"}
        size="sm"
        onClick={() =>
          onFiltersChange((prev) => ({
            ...prev,
            hasPresets: !prev.hasPresets,
          }))
        }
        className="h-8 text-xs gap-1.5">
        <Layers className="w-3.5 h-3.5" />
        Has Presets
      </Button>

      <div className="w-px h-5 bg-border mx-1 hidden sm:block" aria-hidden />

      <Select value={sortBy} onValueChange={(val) => onSortChange(val as SortOption)}>
        <SelectTrigger size="sm" className="h-8 text-xs w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-5 bg-border mx-1 hidden sm:block" aria-hidden />

      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
          className={`p-1.5 transition-colors ${
            viewMode === "grid"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}>
          <LayoutGrid className="w-4 h-4" />
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
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}>
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);
