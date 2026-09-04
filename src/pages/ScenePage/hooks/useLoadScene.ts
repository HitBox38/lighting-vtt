import { useEffect, useRef } from "react";
import type { Light, LightPreset, Mirror, TokenInstance, TokenTemplate } from "@shared/index";

import type { Doc } from "../../../../convex/_generated/dataModel";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function useLoadScene(
  scene: Doc<"scenes"> | null | undefined,
  sceneId: string | null,
) {
  const loadScene = useLightStore((state) => state.loadScene);
  const loadSceneTokens = useTokenStore((state) => state.loadSceneTokens);
  const storeSceneId = useLightStore((state) => state.sceneId);
  const sceneLoaded = storeSceneId === sceneId;
  const lastAppliedUpdatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scene || !sceneId || sceneLoaded) {
      return;
    }
    loadScene(
      sceneId,
      scene.creatorId,
      (scene.lights ?? []) as Light[],
      (scene.mirrors ?? []) as Mirror[],
      (scene.tokenTemplates ?? []) as TokenTemplate[],
      (scene.tokens ?? []) as TokenInstance[],
      (scene.presets ?? []) as LightPreset[],
    );
    loadSceneTokens(
      (scene.tokenTemplates ?? []) as TokenTemplate[],
      (scene.tokens ?? []) as TokenInstance[],
    );
    lastAppliedUpdatedAtRef.current = scene.updatedAt ?? null;
  }, [scene, sceneId, loadScene, loadSceneTokens, sceneLoaded]);

  return { sceneLoaded, lastAppliedUpdatedAtRef };
}
