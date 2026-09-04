import { Users } from "lucide-react";

import { HudSurface } from "@/components/atoms/HudSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlayersSheetTriggerProps {
  playerCount: number;
  activeCount: number;
}

export function PlayersSheetTrigger({ playerCount, activeCount }: PlayersSheetTriggerProps) {
  return (
    <SheetTrigger asChild>
      <HudSurface className="items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "gap-2 transition-colors duration-200",
                activeCount > 0 && "border-amber-500/30 shadow-sm shadow-amber-500/10",
              )}>
              <Users className="size-4" aria-hidden="true" />
              <span>Players</span>
              {playerCount > 0 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-4 px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                    activeCount > 0 && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                  )}>
                  {playerCount}
                </Badge>
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Manage Players &amp; Invites
          </TooltipContent>
        </Tooltip>
      </HudSurface>
    </SheetTrigger>
  );
}
