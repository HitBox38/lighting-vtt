import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_LABELS } from "@/pages/LibraryPage/constants";
import type { Filters, SortOption, ViewMode } from "@/pages/LibraryPage/types";
import { SceneFilterButtons } from "@/pages/LibraryPage/components/LibraryToolbar/components/SceneFilterButtons";
import { SceneSearchInput } from "@/pages/LibraryPage/components/LibraryToolbar/components/SceneSearchInput";
import { SceneViewToggle } from "@/pages/LibraryPage/components/LibraryToolbar/components/SceneViewToggle";

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

export function LibraryToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SceneSearchInput searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <div className="flex flex-wrap items-center gap-2">
        <SceneFilterButtons filters={filters} onFiltersChange={onFiltersChange} />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
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
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <SceneViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
