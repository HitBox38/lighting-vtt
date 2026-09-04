import { Crown, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface PlayerIdentityProps {
  playerName: string;
  characterName: string;
  isVerified: boolean;
}

export function PlayerIdentity({ playerName, characterName, isVerified }: PlayerIdentityProps) {
  return (
    <div className="animate-in fade-in-0 duration-150">
      <div className="mb-0.5 flex items-center gap-2">
        <h4 className="truncate text-sm font-semibold tracking-tight">{playerName}</h4>
        {isVerified ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Shield className="mr-0.5 size-2.5" aria-hidden="true" />
            Verified
          </Badge>
        ) : null}
      </div>
      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
        <Crown className="size-3 shrink-0 text-amber-500/80" aria-hidden="true" />
        <span className="font-medium">{characterName}</span>
      </p>
    </div>
  );
}
