import { Crown, Sword, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HudSurface } from "@/components/hud/HudSurface";

interface RemotePlayerInfo {
  id: string;
  playerName: string;
  characterName: string;
  tokenInstanceIds: string[];
  isActive: boolean;
}

interface RemotePlayerHudProps {
  sceneId: string;
  playerId: string;
  playerInfo: RemotePlayerInfo | null;
  dmOnline: boolean;
}

export function RemotePlayerHud({
  playerInfo,
  dmOnline,
}: RemotePlayerHudProps) {
  if (!playerInfo) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
        <HudSurface className="pointer-events-auto items-center text-sm text-muted-foreground">
          Connecting...
        </HudSurface>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <HudSurface className="pointer-events-auto items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Crown className="size-3.5 text-primary" />
          <span className="font-medium">{playerInfo.characterName}</span>
          <span className="text-muted-foreground">({playerInfo.playerName})</span>
        </div>

        {dmOnline ? (
          <Badge variant="outline" className="gap-1 text-xs">
            <Wifi className="size-3 text-green-500" />
            DM Online
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 text-xs">
            <WifiOff className="size-3" />
            DM Offline
          </Badge>
        )}

        {playerInfo.isActive && (
          <Badge className="gap-1 text-xs">
            <Sword className="size-3" />
            Your Turn
          </Badge>
        )}

        {playerInfo.tokenInstanceIds.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {playerInfo.tokenInstanceIds.length} token{playerInfo.tokenInstanceIds.length !== 1 ? "s" : ""}
          </span>
        )}
      </HudSurface>
    </div>
  );
}
