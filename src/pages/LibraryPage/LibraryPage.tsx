import { Show, useUser } from "@clerk/react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { Suspense, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { DEFAULT_FILTERS } from "@/pages/LibraryPage/constants";
import { filterAndSortScenes } from "@/pages/LibraryPage/helpers";
import { useCreateSceneForm } from "@/pages/LibraryPage/hooks/useCreateSceneForm";
import { useLibraryViewTracking } from "@/pages/LibraryPage/hooks/useLibraryViewTracking";
import type { Filters, SortOption, ViewMode } from "@/pages/LibraryPage/types";
import { CreateSceneDialog } from "@/pages/LibraryPage/components/CreateSceneDialog";
import { EmptyState } from "@/pages/LibraryPage/components/EmptyState";
import { LibraryHeader } from "@/pages/LibraryPage/components/LibraryHeader";
import { LibraryToolbar } from "@/pages/LibraryPage/components/LibraryToolbar";
import { NoResultsState } from "@/pages/LibraryPage/components/NoResultsState";
import { PlayerScenesSection } from "@/pages/LibraryPage/components/PlayerScenesSection";
import { SceneGrid } from "@/pages/LibraryPage/components/SceneGrid";
import { SceneList } from "@/pages/LibraryPage/components/SceneList";
import { SignedOutState } from "@/pages/LibraryPage/components/SignedOutState";

export function LibraryPage() {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated-newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const form = useCreateSceneForm(user?.id);
  const scenes = useQuery(api.scenes.getByCreatorId, user?.id ? { creatorId: user.id } : "skip");
  const filteredScenes = filterAndSortScenes(scenes, searchQuery, filters, sortBy);
  const isFiltered = searchQuery.trim() !== "" || filters.hasLights || filters.hasPresets;
  const totalSceneCount = scenes?.length ?? 0;

  useLibraryViewTracking(isLoaded, Boolean(user?.id));

  return (
    <div className="min-h-screen bg-background">
      <LibraryHeader />
      <main className="flex-1">
        <Show when="signed-in">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }>
            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">Your Scenes</h2>
                  {totalSceneCount > 0 ? (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {isFiltered ? `${filteredScenes.length} of ${totalSceneCount}` : totalSceneCount}
                    </span>
                  ) : null}
                </div>
                <CreateSceneDialog form={form} />
              </div>
              {totalSceneCount > 0 ? (
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
              ) : null}
              {totalSceneCount === 0 ? (
                <EmptyState onCreateScene={() => form.setIsDialogOpen(true)} />
              ) : filteredScenes.length === 0 ? (
                <NoResultsState onClearFilters={() => {
                  setSearchQuery("");
                  setFilters({ ...DEFAULT_FILTERS });
                }} />
              ) : viewMode === "grid" ? (
                <SceneGrid scenes={filteredScenes} />
              ) : (
                <SceneList scenes={filteredScenes} />
              )}
              {user?.id ? <PlayerScenesSection clerkUserId={user.id} /> : null}
            </div>
          </Suspense>
        </Show>
        <Show when="signed-out">
          <SignedOutState />
        </Show>
      </main>
    </div>
  );
}
