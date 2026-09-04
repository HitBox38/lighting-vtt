import { useNavigate } from "react-router-dom";
import { Clock, Crown, LogIn, Trash2, Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/pages/LibraryPage/helpers";

interface PlayerBookmarkCardProps {
  sceneId: string;
  playerId: string;
  sceneName: string;
  characterName: string;
  playerName: string;
  dmOnline: boolean;
  savedAt: number;
  onRemove: () => void;
}

export function PlayerBookmarkCard({
  sceneId,
  playerId,
  sceneName,
  characterName,
  playerName,
  dmOnline,
  savedAt,
  onRemove,
}: PlayerBookmarkCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group relative gap-0 overflow-hidden border border-border/50 p-0">
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{sceneName}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Crown className="size-3" />
              <span className="truncate">{characterName}</span>
              <span className="text-muted-foreground/60">({playerName})</span>
            </p>
          </div>
          {dmOnline ? (
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
          Saved {formatRelativeTime(savedAt)}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant={dmOnline ? "default" : "outline"}
            disabled={!dmOnline}
            className="h-7 flex-1 text-xs"
            onClick={() =>
              navigate(
                `/scene?id=${encodeURIComponent(sceneId)}&playerId=${encodeURIComponent(playerId)}`,
              )
            }>
            <LogIn className="mr-1.5 size-3" />
            {dmOnline ? "Join" : "DM Offline"}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove from library">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
