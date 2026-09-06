import { useEffect, type MutableRefObject } from "react";
import type { Light, Mirror, TokenInstance, TokenTemplate } from "@shared/index";
import type { EffectInstance } from "@shared/effects";

import type { Doc } from "../../../../convex/_generated/dataModel";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function useSyncedSceneState({
  scene,
  sceneLoaded,
  isNonGMView,
  lastAppliedUpdatedAtRef,
}: {
  scene: Doc<"scenes"> | null | undefined;
  sceneLoaded: boolean;
  isNonGMView: boolean;
  lastAppliedUpdatedAtRef: MutableRefObject<number | null>;
}) {
  const applySyncedState = useLightStore((state) => state._applySyncedState);

  useEffect(() => {
    if (!isNonGMView || !sceneLoaded || !scene) {
      return;
    }
    const incomingUpdatedAt = scene.updatedAt ?? null;
    if (incomingUpdatedAt !== null && incomingUpdatedAt !== lastAppliedUpdatedAtRef.current) {
      lastAppliedUpdatedAtRef.current = incomingUpdatedAt;
      applySyncedState({
        lights: (scene.lights ?? []) as Light[],
        mirrors: (scene.mirrors ?? []) as Mirror[],
        effects: (scene.effects ?? []) as EffectInstance[],
        tokenTemplates: (scene.tokenTemplates ?? []) as TokenTemplate[],
        tokens: (scene.tokens ?? []) as TokenInstance[],
        activePresetId: null,
      });
    }
  }, [isNonGMView, sceneLoaded, scene, applySyncedState, lastAppliedUpdatedAtRef]);
}
