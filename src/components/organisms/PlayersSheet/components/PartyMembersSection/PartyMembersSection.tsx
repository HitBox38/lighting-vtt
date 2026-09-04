import type { ScenePlayer } from "@shared/index";
import type { Id } from "../../../../../../convex/_generated/dataModel";

import { EmptyPlayersState } from "@/components/organisms/PlayersSheet/components/EmptyPlayersState";
import { PlayerCard } from "@/components/organisms/PlayersSheet/components/PlayerCard";
import type {
  TokenInstanceDisplay,
  TokenTemplateDisplay,
} from "@/components/organisms/PlayersSheet/types";

interface PartyMembersSectionProps {
  players: ScenePlayer[];
  activeCount: number;
  activePlayerIds: Set<string>;
  sceneId: Id<"scenes">;
  creatorId: string;
  assignedTokenIds: Set<string>;
  tokenTemplates: TokenTemplateDisplay[];
  tokenInstances: TokenInstanceDisplay[];
}

export function PartyMembersSection({
  players,
  activeCount,
  activePlayerIds,
  sceneId,
  creatorId,
  assignedTokenIds,
  tokenTemplates,
  tokenInstances,
}: PartyMembersSectionProps) {
  return (
    <section>
      <header className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight">Party Members</h3>
        {players.length > 0 ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {players.length} player{players.length !== 1 ? "s" : ""}
            {activeCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}
                · {activeCount} active
              </span>
            ) : null}
          </p>
        ) : null}
      </header>
      {players.length === 0 ? (
        <EmptyPlayersState />
      ) : (
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="animate-in fade-in-0 slide-in-from-right-2"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}>
              <PlayerCard
                player={player}
                sceneId={sceneId}
                creatorId={creatorId}
                isActive={activePlayerIds.has(player.id)}
                assignedTokenIds={assignedTokenIds}
                tokenTemplates={tokenTemplates}
                tokenInstances={tokenInstances}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
