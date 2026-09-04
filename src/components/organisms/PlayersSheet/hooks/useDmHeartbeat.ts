import { useEffect } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function useDmHeartbeat(creatorId: string) {
  const dmHeartbeat = useMutation(api.players.dmHeartbeat);
  const storeSceneId = useLightStore((state) => state.sceneId);

  useEffect(() => {
    if (!storeSceneId || !creatorId) return;

    const sendHeartbeat = () => {
      void dmHeartbeat({
        sceneId: storeSceneId as Id<"scenes">,
        creatorId,
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20_000);
    return () => clearInterval(interval);
  }, [storeSceneId, creatorId, dmHeartbeat]);
}
