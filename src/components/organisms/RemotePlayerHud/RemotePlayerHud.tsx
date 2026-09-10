import { Crown, Sword, Wifi, WifiOff } from "lucide-react";

import { HudSurface } from "@/components/atoms/HudSurface";
import type { RemotePlayerInfo } from "@/components/organisms/RemotePlayerHud/types";
import { Badge } from "@/components/ui/badge";

interface RemotePlayerHudProps {
  sceneId: string;
  playerId: string;
  playerInfo: RemotePlayerInfo | null;
  dmOnline: boolean;
}

export function RemotePlayerHud({ playerInfo, dmOnline }: RemotePlayerHudProps) {
  if (!playerInfo) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex justify-center px-3">
        <HudSurface className="pointer-events-auto items-center text-sm text-muted-foreground">
          Connecting...
        </HudSurface>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex justify-center px-3">
      <HudSurface className="pointer-events-auto max-w-full flex-wrap justify-center gap-x-3 gap-y-2 sm:items-center">
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1.5 text-sm">
          <Crown className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{playerInfo.characterName}</span>
          <span className="min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">({playerInfo.playerName})</span>
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
        {playerInfo.isActive ? (
          <Badge className="gap-1 text-xs">
            <Sword className="size-3" />
            Your Turn
          </Badge>
        ) : null}
        {playerInfo.tokenInstanceIds.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {playerInfo.tokenInstanceIds.length} token
            {playerInfo.tokenInstanceIds.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </HudSurface>
    </div>
  );
}
