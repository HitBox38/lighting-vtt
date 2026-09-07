import { Trash2 } from "lucide-react";
import type { TokenTemplate } from "@shared/index";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TokenTemplateOptionProps {
  option: TokenTemplate;
  optionId: string;
  isHighlighted: boolean;
  isSelected: boolean;
  tokenCount: number;
  selectOption: () => void;
  onDelete: (templateId: string, imageKey: string) => void;
}

export function TokenTemplateOption({
  option,
  optionId,
  isHighlighted,
  isSelected,
  tokenCount,
  selectOption,
  onDelete,
}: TokenTemplateOptionProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        id={optionId}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
          isHighlighted && "bg-accent/80",
          isSelected && "ring-1 ring-primary/40",
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={selectOption}>
        <img
          src={option.imageUrl}
          alt={option.name}
          className="size-8 rounded-full object-cover"
          style={{ border: `2px solid ${option.borderColor ?? "#ffffff"}` }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{option.name}</p>
          <p className="text-[11px] text-muted-foreground">{tokenCount} placed</p>
        </div>
        {isSelected ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Active
          </span>
        ) : null}
      </button>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onDelete(option.id, option.imageKey)}
        aria-label={`Delete token template ${option.name}`}>
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
