import { Sword, X } from "lucide-react";

import { InitiativeItem } from "@/components/organisms/InitiativeSidebar/components/InitiativeItem";
import { useInitiativeList } from "@/components/organisms/InitiativeSidebar/hooks/useInitiativeList";
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Props {
  isGM: boolean;
  mobilePlayer?: boolean;
}

export function InitiativeSidebar({ isGM, mobilePlayer = false }: Props) {
  const { isOpen, setIsOpen } = useSidebar();
  const {
    hoveredTokenId,
    setHoveredTokenId,
    sortedTokens,
    templateById,
    handleInitiativeChange,
    handleRoll,
  } = useInitiativeList(isGM);

  const list = (
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
  );

  if (mobilePlayer) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[70dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]" onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("player-initiative-trigger")?.focus();
        }}>
          <SheetHeader className="relative border-b pr-16">
            <SheetTitle>Initiative</SheetTitle>
            <SheetDescription>Turn order for this scene.</SheetDescription>
            <SheetClose asChild><Button variant="ghost" size="icon" className="absolute top-2 right-2 size-11" aria-label="Close initiative"><X className="size-4" /></Button></SheetClose>
          </SheetHeader>
          {list}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Sword className="size-4" />
          <span className="text-sm font-semibold">Initiative</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      {list}
    </Sidebar>
  );
}
