import { X } from "lucide-react";

import type { AssignedToken } from "@/components/organisms/PlayersSheet/types";
import { cn } from "@/lib/utils";

interface TokenAssignmentProps {
  assignedTokens: AssignedToken[];
  unassignedTokens: AssignedToken[];
  onAssign: (tokenInstanceId: string) => void;
  onUnassign: (tokenInstanceId: string) => void;
}

export function TokenAssignment({
  assignedTokens,
  unassignedTokens,
  onAssign,
  onUnassign,
}: TokenAssignmentProps) {
  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Tokens
      </p>
      {assignedTokens.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assignedTokens.map(({ instanceId, template }) => (
            <div
              key={instanceId}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2 py-1",
                "bg-linear-to-r from-muted/60 to-muted/30",
                "hover:from-muted/80 hover:to-muted/50 transition-colors",
              )}>
              <img
                src={template.imageUrl}
                alt={`${template.name} token`}
                width={18}
                height={18}
                className="size-[18px] rounded-full object-cover"
                style={{
                  boxShadow: `0 0 0 1.5px ${template.borderColor}, 0 0 0 3px hsl(var(--background))`,
                }}
              />
              <span className="text-[11px] font-medium">{template.name}</span>
              <button
                type="button"
                className="ml-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => onUnassign(instanceId)}
                aria-label={`Unassign ${template.name}`}>
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/70 italic">No tokens assigned</p>
      )}
      {unassignedTokens.length > 0 ? (
        <div className="mt-3 animate-in fade-in-0 duration-200">
          <p className="text-[10px] text-muted-foreground mb-1.5">Click to assign:</p>
          <div className="flex flex-wrap gap-1.5">
            {unassignedTokens.map(({ instanceId, template }) => (
              <button
                key={instanceId}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-dashed",
                  "px-2 py-1 text-[11px] font-medium",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "active:scale-95 transition-transform duration-150",
                )}
                onClick={() => onAssign(instanceId)}>
                <img
                  src={template.imageUrl}
                  alt={`${template.name} token`}
                  width={18}
                  height={18}
                  className="size-[18px] rounded-full object-cover opacity-70"
                  style={{ border: `1.5px solid ${template.borderColor}` }}
                />
                {template.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
