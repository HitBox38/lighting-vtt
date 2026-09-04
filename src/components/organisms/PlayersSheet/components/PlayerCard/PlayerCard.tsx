import { Sparkles } from "lucide-react";
import type { ScenePlayer } from "@shared/index";

import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { PlayerCardActions } from "@/components/organisms/PlayersSheet/components/PlayerCard/components/PlayerCardActions";
import { PlayerEditForm } from "@/components/organisms/PlayersSheet/components/PlayerCard/components/PlayerEditForm";
import { PlayerIdentity } from "@/components/organisms/PlayersSheet/components/PlayerCard/components/PlayerIdentity";
import { TokenAssignment } from "@/components/organisms/PlayersSheet/components/PlayerCard/components/TokenAssignment";
import { usePlayerCardActions } from "@/components/organisms/PlayersSheet/components/PlayerCard/hooks/usePlayerCardActions";
import {
  resolveAssignedTokens,
  resolveUnassignedTokens,
} from "@/components/organisms/PlayersSheet/helpers";
import type {
  TokenInstanceDisplay,
  TokenTemplateDisplay,
} from "@/components/organisms/PlayersSheet/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: ScenePlayer;
  sceneId: Id<"scenes">;
  creatorId: string;
  isActive: boolean;
  assignedTokenIds: Set<string>;
  tokenTemplates: TokenTemplateDisplay[];
  tokenInstances: TokenInstanceDisplay[];
}

export function PlayerCard({
  player,
  sceneId,
  creatorId,
  isActive,
  assignedTokenIds,
  tokenTemplates,
  tokenInstances,
}: PlayerCardProps) {
  const actions = usePlayerCardActions({ player, sceneId, creatorId, isActive });

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4",
        "bg-linear-to-br from-card to-card/80",
        "hover:border-primary/20 hover:shadow-md",
        isActive &&
          "border-amber-500/50 bg-linear-to-br from-amber-950/20 via-card to-card shadow-lg ring-1 ring-amber-500/20",
      )}>
      {isActive ? (
        <div className="absolute -top-px right-4 left-4 h-px bg-linear-to-r from-transparent via-amber-500/60 to-transparent" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {actions.isEditing ? (
            <PlayerEditForm
              playerId={player.id}
              playerName={actions.editPlayerName}
              characterName={actions.editCharacterName}
              onPlayerNameChange={actions.setEditPlayerName}
              onCharacterNameChange={actions.setEditCharacterName}
              onSave={actions.saveProfile}
              onCancel={actions.cancelEditing}
            />
          ) : (
            <PlayerIdentity
              playerName={player.playerName}
              characterName={player.characterName}
              isVerified={Boolean(player.clerkUserId)}
            />
          )}
        </div>
        {actions.isEditing ? null : (
          <PlayerCardActions
            isActive={isActive}
            onToggleActive={actions.toggleActive}
            onEdit={actions.startEditing}
            onRemove={actions.remove}
          />
        )}
      </div>
      {isActive ? (
        <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <Badge className="gap-1.5 bg-amber-500/90 text-[10px] font-semibold text-amber-950 shadow-sm hover:bg-amber-500">
            <Sparkles className="size-3 animate-pulse" aria-hidden="true" />
            Active Turn
          </Badge>
        </div>
      ) : null}
      <TokenAssignment
        assignedTokens={resolveAssignedTokens(player.tokenInstanceIds, tokenInstances, tokenTemplates)}
        unassignedTokens={resolveUnassignedTokens(assignedTokenIds, tokenInstances, tokenTemplates)}
        onAssign={actions.assignToken}
        onUnassign={actions.unassignToken}
      />
    </div>
  );
}
