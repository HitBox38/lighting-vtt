import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RemotePlayerHud } from "@/components/organisms/RemotePlayerHud";
import { GameCanvas } from "@/components/templates/GameCanvas";
import { getRemotePlayerInfo } from "@/pages/ScenePage/helpers";
import { useDmOnline } from "@/pages/ScenePage/hooks/useDmOnline";
import { useLoadScene } from "@/pages/ScenePage/hooks/useLoadScene";
import { usePlayerTokenPositions } from "@/pages/ScenePage/hooks/usePlayerTokenPositions";
import { useSceneAnalytics } from "@/pages/ScenePage/hooks/useSceneAnalytics";
import { useSceneParams } from "@/pages/ScenePage/hooks/useSceneParams";
import { useSyncedSceneState } from "@/pages/ScenePage/hooks/useSyncedSceneState";

export function ScenePage() {
  const { isGM, sceneId, remotePlayerId, isRemotePlayer, role, effectiveIsGM } = useSceneParams();
  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");
  const { sceneLoaded, lastAppliedUpdatedAtRef } = useLoadScene(scene, sceneId);

  useSceneAnalytics({ sceneId, scene, isRemotePlayer, role });
  useSyncedSceneState({
    scene,
    sceneLoaded,
    isNonGMView: !isGM || isRemotePlayer,
    lastAppliedUpdatedAtRef,
  });
  usePlayerTokenPositions({ scene, sceneLoaded, isGM, isRemotePlayer });
  const dmOnline = useDmOnline(scene);

  if (scene === undefined) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white">
        <p>Loading scene...</p>
      </div>
    );
  }

  if (scene === null) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white">
        <p className="text-red-500">Scene not found</p>
      </div>
    );
  }

  return (
    <>
      <GameCanvas
        mapUrl={scene.mapUrl}
        isGM={effectiveIsGM}
        sceneId={sceneId}
        remotePlayerId={remotePlayerId}
      />
      {isRemotePlayer && sceneId && remotePlayerId ? (
        <RemotePlayerHud
          sceneId={sceneId}
          playerId={remotePlayerId}
          playerInfo={getRemotePlayerInfo(scene, remotePlayerId, isRemotePlayer)}
          dmOnline={dmOnline}
        />
      ) : null}
    </>
  );
}
