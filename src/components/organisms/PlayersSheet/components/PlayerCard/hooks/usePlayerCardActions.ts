import { useState } from "react";
import { useMutation } from "convex/react";
import { usePostHog } from "@posthog/react";
import type { ScenePlayer } from "@shared/index";

import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function usePlayerCardActions({
  player,
  sceneId,
  creatorId,
  isActive,
}: {
  player: ScenePlayer;
  sceneId: Id<"scenes">;
  creatorId: string;
  isActive: boolean;
}) {
  const posthog = usePostHog();
  const updatePlayer = useMutation(api.players.updatePlayer);
  const removePlayer = useMutation(api.players.removePlayer);
  const setPlayerActive = useMutation(api.players.setPlayerActive);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlayerName, setEditPlayerName] = useState(player.playerName);
  const [editCharacterName, setEditCharacterName] = useState(player.characterName);

  return {
    isEditing,
    editPlayerName,
    editCharacterName,
    setEditPlayerName,
    setEditCharacterName,
    startEditing: () => setIsEditing(true),
    cancelEditing: () => {
      setEditPlayerName(player.playerName);
      setEditCharacterName(player.characterName);
      setIsEditing(false);
    },
    saveProfile: () => {
      if (!editPlayerName.trim() || !editCharacterName.trim()) {
        return;
      }
      void updatePlayer({
        sceneId,
        creatorId,
        playerId: player.id,
        playerName: editPlayerName.trim(),
        characterName: editCharacterName.trim(),
      });
      posthog.capture(ANALYTICS_EVENTS.PlayersPlayerUpdated);
      setIsEditing(false);
    },
    toggleActive: () => {
      void setPlayerActive({
        sceneId,
        creatorId,
        playerId: player.id,
        active: !isActive,
      });
      posthog.capture(ANALYTICS_EVENTS.PlayersPlayerActiveToggled, { active: !isActive });
    },
    remove: () => {
      void removePlayer({ sceneId, creatorId, playerId: player.id });
      posthog.capture(ANALYTICS_EVENTS.PlayersPlayerRemoved);
    },
    assignToken: (tokenInstanceId: string) => {
      void updatePlayer({
        sceneId,
        creatorId,
        playerId: player.id,
        tokenInstanceIds: [...player.tokenInstanceIds, tokenInstanceId],
      });
      posthog.capture(ANALYTICS_EVENTS.PlayersTokenAssigned);
    },
    unassignToken: (tokenInstanceId: string) => {
      void updatePlayer({
        sceneId,
        creatorId,
        playerId: player.id,
        tokenInstanceIds: player.tokenInstanceIds.filter((id) => id !== tokenInstanceId),
      });
      posthog.capture(ANALYTICS_EVENTS.PlayersTokenUnassigned);
    },
  };
}
