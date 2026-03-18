import { useMemo, useCallback } from "react";
import { Dices, Sword } from "lucide-react";

import { useTokenStore } from "@/stores/tokenStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface Props {
  isGM: boolean;
}

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

function InitiativeItem({
  tokenId,
  tokenName,
  initiative,
  isGM,
  isHovered,
  onHover,
  onInitiativeChange,
  onRoll,
}: InitiativeItemProps) {
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      if (rawValue === "") {
        onInitiativeChange(tokenId, undefined);
        return;
      }
      const numValue = parseInt(rawValue, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
        onInitiativeChange(tokenId, numValue);
      }
    },
    [tokenId, onInitiativeChange]
  );

  const handleRollClick = useCallback(() => {
    onRoll(tokenId);
  }, [tokenId, onRoll]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        isHovered && "bg-accent"
      )}
      onMouseEnter={() => onHover(tokenId)}
      onMouseLeave={() => onHover(null)}
    >
      {isGM && (
        <>
          <Input
            type="number"
            min={1}
            max={20}
            value={initiative ?? ""}
            onChange={handleInputChange}
            placeholder="--"
            className="h-7 w-12 px-1.5 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRollClick}
            title="Roll d20"
          >
            <Dices className="size-3.5" />
          </Button>
        </>
      )}
      <span className="min-w-0 flex-1 truncate text-sm">{tokenName}</span>
    </div>
  );
}

export function InitiativeSidebar({ isGM }: Props) {
  const tokens = useTokenStore((state) => state.tokens);
  const templates = useTokenStore((state) => state.tokenTemplates);
  const hoveredTokenId = useTokenStore((state) => state.hoveredTokenId);
  const setHoveredTokenId = useTokenStore((state) => state.setHoveredTokenId);
  const setInitiative = useTokenStore((state) => state.setInitiative);
  const rollInitiative = useTokenStore((state) => state.rollInitiative);

  const templateById = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    for (const template of templates) {
      map.set(template.id, template);
    }
    return map;
  }, [templates]);

  const visibleTokens = useMemo(
    () => (isGM ? tokens : tokens.filter((token) => !token.hidden)),
    [isGM, tokens]
  );

  const sortedTokens = useMemo(() => {
    return [...visibleTokens].sort((a, b) => {
      const initA = a.initiative ?? -1;
      const initB = b.initiative ?? -1;
      return initB - initA;
    });
  }, [visibleTokens]);

  const handleInitiativeChange = useCallback(
    (tokenId: string, value: number | undefined) => {
      setInitiative(tokenId, value);
    },
    [setInitiative]
  );

  const handleRoll = useCallback(
    (tokenId: string) => {
      rollInitiative(tokenId);
    },
    [rollInitiative]
  );

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Sword className="size-4" />
          <span className="text-sm font-semibold">Initiative</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="gap-0.5">
        {sortedTokens.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No tokens on the map
          </p>
        ) : (
          sortedTokens.map((token) => {
            const template = templateById.get(token.templateId);
            const name = template?.name ?? "Unknown";
            return (
              <InitiativeItem
                key={token.id}
                tokenId={token.id}
                tokenName={name}
                initiative={token.initiative}
                isGM={isGM}
                isHovered={hoveredTokenId === token.id}
                onHover={setHoveredTokenId}
                onInitiativeChange={handleInitiativeChange}
                onRoll={handleRoll}
              />
            );
          })
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default InitiativeSidebar;
