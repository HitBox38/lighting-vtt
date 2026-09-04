import { Dices } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InitiativeItemProps {
  tokenId: string;
  tokenName: string;
  initiative: number | undefined;
  isGM: boolean;
  isHovered: boolean;
  onHover: (tokenId: string | null) => void;
  onInitiativeChange: (tokenId: string, value: number | undefined) => void;
  onRoll: (tokenId: string) => void;
}

export function InitiativeItem({
  tokenId,
  tokenName,
  initiative,
  isGM,
  isHovered,
  onHover,
  onInitiativeChange,
  onRoll,
}: InitiativeItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        isHovered && "bg-accent",
      )}
      onMouseEnter={() => onHover(tokenId)}
      onMouseLeave={() => onHover(null)}>
      {isGM ? (
        <>
          <Input
            type="number"
            min={1}
            max={20}
            value={initiative ?? ""}
            onChange={(event) => {
              const rawValue = event.target.value;
              if (rawValue === "") {
                onInitiativeChange(tokenId, undefined);
                return;
              }
              const numValue = parseInt(rawValue, 10);
              if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 20) {
                onInitiativeChange(tokenId, numValue);
              }
            }}
            placeholder="--"
            className="h-7 w-12 px-1.5 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button variant="ghost" size="icon-xs" onClick={() => onRoll(tokenId)} title="Roll d20">
            <Dices className="size-3.5" />
          </Button>
        </>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-sm">{tokenName}</span>
    </div>
  );
}
