import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Crown, Clock, Trash2, Wifi, WifiOff, LogIn } from "lucide-react";

import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "../helpers";

interface PlayerScenesSectionProps {
  clerkUserId: string;
}

export function PlayerScenesSection({ clerkUserId }: PlayerScenesSectionProps) {
  const navigate = useNavigate();
  const bookmarks = useQuery(api.players.getPlayerBookmarks, { clerkUserId });
  const removeBookmark = useMutation(api.players.removeBookmark);

  if (!bookmarks || bookmarks.length === 0) return null;

  const handleJoinScene = (bookmark: (typeof bookmarks)[number]) => {
    navigate(`/scene?id=${encodeURIComponent(bookmark.sceneId)}&playerId=${encodeURIComponent(bookmark.playerId)}`);
  };

  const handleRemoveBookmark = async (bookmarkId: (typeof bookmarks)[number]["_id"]) => {
    await removeBookmark({ bookmarkId });
  };

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
            <Card
              key={bookmark._id}
              className="group relative overflow-hidden border border-border/50 p-0 gap-0"
            >
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold truncate">{bookmark.sceneName}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Crown className="size-3" />
                      <span className="truncate">{bookmark.characterName}</span>
                      <span className="text-muted-foreground/60">({bookmark.playerName})</span>
                    </p>
                  </div>
                  {bookmark.dmOnline ? (
                    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                      <Wifi className="size-3 text-green-500" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                      <WifiOff className="size-3" />
                      Offline
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="size-3" />
                  Saved {formatRelativeTime(bookmark.savedAt)}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={bookmark.dmOnline ? "default" : "outline"}
                    disabled={!bookmark.dmOnline}
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleJoinScene(bookmark)}
                  >
                    <LogIn className="size-3 mr-1.5" />
                    {bookmark.dmOnline ? "Join" : "DM Offline"}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleRemoveBookmark(bookmark._id)}
                    aria-label="Remove from library"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
