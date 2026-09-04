import { useEffect } from "react";
import type { TokenInstance } from "@shared/index";

import type { Doc } from "../../../../convex/_generated/dataModel";
import { getScenePlayers } from "@/pages/ScenePage/helpers";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function usePlayerTokenPositions({
  scene,
  sceneLoaded,
  isGM,
  isRemotePlayer,
}: {
  scene: Doc<"scenes"> | null | undefined;
  sceneLoaded: boolean;
  isGM: boolean;
  isRemotePlayer: boolean;
}) {
  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);

  useEffect(() => {
    if (!isGM || isRemotePlayer || !sceneLoaded || !scene) {
      return;
    }
    const players = getScenePlayers(scene);
    if (players.length === 0) {
      return;
    }
    const playerTokenIds = new Set(players.flatMap((player) => player.tokenInstanceIds));
    if (playerTokenIds.size === 0) {
      return;
    }
    const incomingTokens = (scene.tokens ?? []) as TokenInstance[];
    const localTokens = useTokenStore.getState().tokens;
    const localTokensById = new Map(localTokens.map((token) => [token.id, token]));
    for (const incomingToken of incomingTokens) {
      if (!playerTokenIds.has(incomingToken.id)) {
        continue;
      }
      const localToken = localTokensById.get(incomingToken.id);
      if (!localToken) {
        continue;
      }
      if (localToken.x !== incomingToken.x || localToken.y !== incomingToken.y) {
        updateTokenInstance(incomingToken.id, { x: incomingToken.x, y: incomingToken.y });
      }
    }
  }, [isGM, isRemotePlayer, sceneLoaded, scene, updateTokenInstance]);
}
