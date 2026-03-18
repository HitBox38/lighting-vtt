import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Suspense, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { DEFAULT_FILTERS } from "./constants";
import { getSortComparator } from "./helpers";
import type { Filters, SortOption, ViewMode } from "./types";

import { useCreateSceneForm } from "./hooks/useCreateSceneForm";

import { LibraryHeader } from "./components/LibraryHeader";
import { LibraryToolbar } from "./components/LibraryToolbar";
import { CreateSceneDialog } from "./components/CreateSceneDialog";
import { SceneGrid } from "./components/SceneGrid";
import { SceneList } from "./components/SceneList";
import { EmptyState } from "./components/EmptyState";
import { NoResultsState } from "./components/NoResultsState";
import { SignedOutState } from "./components/SignedOutState";

export const LibraryPage = () => {
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated-newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });

  const form = useCreateSceneForm(user?.id);

  const scenes = useQuery(api.scenes.getByCreatorId, user?.id ? { creatorId: user.id } : "skip");

  const filteredScenes = useMemo(() => {
    if (!scenes) return [];

    let result = [...scenes];

    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      result = result.filter((s) => s.name.toLowerCase().includes(trimmed));
    }

    if (filters.hasLights) {
      result = result.filter((s) => s.lights.length > 0);
    }
    if (filters.hasPresets) {
      result = result.filter((s) => s.presets.length > 0);
    }

    result.sort(getSortComparator(sortBy));

    return result;
  }, [scenes, searchQuery, filters, sortBy]);

  const isFiltered = searchQuery.trim() !== "" || filters.hasLights || filters.hasPresets;
  const totalSceneCount = scenes?.length ?? 0;
  const filteredCount = filteredScenes.length;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilters({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader />
      <main className="flex-1">
        <SignedIn>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            }>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">Your Scenes</h2>
                  {totalSceneCount > 0 && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {isFiltered ? `${filteredCount} of ${totalSceneCount}` : totalSceneCount}
                    </span>
                  )}
                </div>
                <CreateSceneDialog form={form} />
              </div>
              {totalSceneCount > 0 && (
                <LibraryToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filters={filters}
                  onFiltersChange={setFilters}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              )}
              {totalSceneCount === 0 ? (
                <EmptyState onCreateScene={() => form.setIsDialogOpen(true)} />
              ) : filteredCount === 0 ? (
                <NoResultsState onClearFilters={clearAllFilters} />
              ) : viewMode === "grid" ? (
                <SceneGrid scenes={filteredScenes} />
              ) : (
                <SceneList scenes={filteredScenes} />
              )}
            </div>
          </Suspense>
        </SignedIn>
        <SignedOut>
          <SignedOutState />
        </SignedOut>
      </main>
    </div>
  );
};
