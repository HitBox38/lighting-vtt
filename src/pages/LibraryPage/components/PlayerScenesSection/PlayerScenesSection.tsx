import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../../convex/_generated/api";
import { Separator } from "@/components/ui/separator";
import { PlayerBookmarkCard } from "@/pages/LibraryPage/components/PlayerBookmarkCard";

interface PlayerScenesSectionProps {
  clerkUserId: string;
}

export function PlayerScenesSection({ clerkUserId }: PlayerScenesSectionProps) {
  const bookmarks = useQuery(api.players.getPlayerBookmarks, { clerkUserId });
  const removeBookmark = useMutation(api.players.removeBookmark);

  if (!bookmarks || bookmarks.length === 0) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Player's View</h2>
          <span className="text-sm text-muted-foreground tabular-nums">{bookmarks.length}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Scenes you've joined as a player. The DM must be online for you to connect.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bookmarks.map((bookmark) => (
            <PlayerBookmarkCard
              key={bookmark._id}
              sceneId={bookmark.sceneId}
              playerId={bookmark.playerId}
              sceneName={bookmark.sceneName}
              characterName={bookmark.characterName}
              playerName={bookmark.playerName}
              dmOnline={bookmark.dmOnline}
              savedAt={bookmark.savedAt}
              onRemove={() => void removeBookmark({ bookmarkId: bookmark._id })}
            />
          ))}
        </div>
      </div>
    </>
  );
}
