import { Pencil, Sword, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlayerCardActionsProps {
  isActive: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function PlayerCardActions({
  isActive,
  onToggleActive,
  onEdit,
  onRemove,
}: PlayerCardActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "size-7 transition-colors duration-200",
              isActive && "bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-sm shadow-amber-500/30",
            )}
            onClick={onToggleActive}
            aria-label={isActive ? "Revoke turn" : "Grant turn"}>
            <Sword className="size-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isActive ? "Revoke Turn" : "Grant Turn"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 hover:bg-primary/10"
            onClick={onEdit}
            aria-label="Edit player">
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Edit Player
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            aria-label="Remove player">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Remove Player
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
