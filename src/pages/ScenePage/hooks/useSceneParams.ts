import { useSearchParams } from "react-router-dom";

import { resolveSceneRole } from "@/pages/ScenePage/helpers";

export function useSceneParams() {
  const [searchParams] = useSearchParams();
  const isGM = searchParams.get("isGM") !== "false";
  const sceneId = searchParams.get("id");
  const remotePlayerId = searchParams.get("playerId");
  const isRemotePlayer = Boolean(remotePlayerId);
  const role = resolveSceneRole(isGM, isRemotePlayer);
  const effectiveIsGM = isGM && !isRemotePlayer;

  return { isGM, sceneId, remotePlayerId, isRemotePlayer, role, effectiveIsGM };
}
