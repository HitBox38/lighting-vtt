import { UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";

export const EmptyPlayersState = () => (
  <div className="text-center py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
    <div
      className={cn(
        "mx-auto w-16 h-16 rounded-2xl mb-4",
        "bg-linear-to-br from-muted/80 to-muted/40",
        "flex items-center justify-center",
        "shadow-inner",
      )}>
      <UserPlus className="size-7 text-muted-foreground/60" aria-hidden="true" />
    </div>
    <p className="text-sm font-medium mb-1">No Adventurers Yet</p>
    <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
      Share your invite link to assemble your party
    </p>
  </div>
);
