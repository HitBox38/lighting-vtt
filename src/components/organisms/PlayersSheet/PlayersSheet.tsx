import { useQuery } from "convex/react";
import { useUser } from "@clerk/react";
import { usePostHog } from "@posthog/react";
import type { ScenePlayer } from "@shared/index";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { InviteLinkSection } from "@/components/organisms/PlayersSheet/components/InviteLinkSection";
import { PartyMembersSection } from "@/components/organisms/PlayersSheet/components/PartyMembersSection";
import { PlayersSheetHeader } from "@/components/organisms/PlayersSheet/components/PlayersSheetHeader";
import { PlayersSheetTrigger } from "@/components/organisms/PlayersSheet/components/PlayersSheetTrigger";
import { useDmHeartbeat } from "@/components/organisms/PlayersSheet/hooks/useDmHeartbeat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

interface PlayersSheetProps {
  sceneId: string;
}

export function PlayersSheet({ sceneId }: PlayersSheetProps) {
  const posthog = usePostHog();
  const { user } = useUser();
  const creatorId = user?.id ?? "";
  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");
  const tokenTemplates = useTokenStore((state) => state.tokenTemplates);
  const tokens = useTokenStore((state) => state.tokens);
  useDmHeartbeat(creatorId);

  const players: ScenePlayer[] = (scene?.players as ScenePlayer[] | undefined) ?? [];
  const activePlayerIds = new Set((scene?.activePlayerIds as string[] | undefined) ?? []);
  const assignedTokenIds = new Set(players.flatMap((player) => player.tokenInstanceIds));
  const activeCount = players.filter((player) => activePlayerIds.has(player.id)).length;

  return (
    <TooltipProvider delayDuration={150}>
      <Sheet
        onOpenChange={(open) => {
          if (open) {
            posthog.capture(ANALYTICS_EVENTS.PlayersSheetOpened);
          }
        }}>
        <PlayersSheetTrigger playerCount={players.length} activeCount={activeCount} />
        <SheetContent
          side="right"
          className={cn(
            "flex w-[420px] flex-col px-4 sm:max-w-[420px]",
            "bg-linear-to-b from-background via-background to-muted/20",
          )}>
          <PlayersSheetHeader />
          <ScrollArea className="-mx-6 mt-2 flex-1 px-6">
            <div className="space-y-5 pb-6">
              <InviteLinkSection
                sceneId={sceneId as Id<"scenes">}
                creatorId={creatorId}
                existingInviteCode={scene?.inviteCode as string | undefined}
              />
              <Separator className="bg-border/50" />
              <PartyMembersSection
                players={players}
                activeCount={activeCount}
                activePlayerIds={activePlayerIds}
                sceneId={sceneId as Id<"scenes">}
                creatorId={creatorId}
                assignedTokenIds={assignedTokenIds}
                tokenTemplates={tokenTemplates.map((template) => ({
                  id: template.id,
                  name: template.name,
                  imageUrl: template.imageUrl,
                  borderColor: template.borderColor,
                }))}
                tokenInstances={tokens.map((token) => ({
                  id: token.id,
                  templateId: token.templateId,
                }))}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
