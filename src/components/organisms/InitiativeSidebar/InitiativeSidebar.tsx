import { Sword } from "lucide-react";

import { InitiativeItem } from "@/components/organisms/InitiativeSidebar/components/InitiativeItem";
import { useInitiativeList } from "@/components/organisms/InitiativeSidebar/hooks/useInitiativeList";
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";

interface Props {
  isGM: boolean;
}

export function InitiativeSidebar({ isGM }: Props) {
  const {
    hoveredTokenId,
    setHoveredTokenId,
    sortedTokens,
    templateById,
    handleInitiativeChange,
    handleRoll,
  } = useInitiativeList(isGM);

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
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">No tokens on the map</p>
        ) : (
          sortedTokens.map((token) => (
            <InitiativeItem
              key={token.id}
              tokenId={token.id}
              tokenName={templateById.get(token.templateId)?.name ?? "Unknown"}
              initiative={token.initiative}
              isGM={isGM}
              isHovered={hoveredTokenId === token.id}
              onHover={setHoveredTokenId}
              onInitiativeChange={handleInitiativeChange}
              onRoll={handleRoll}
            />
          ))
        )}
      </SidebarContent>
    </Sidebar>
  );
}
