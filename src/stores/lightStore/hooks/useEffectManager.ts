import { useCallback } from "react";

import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { versionDocToDefinition } from "@/lib/effects/hooks/useEffectDefinitions";
import { useLightStore } from "@/stores/lightStore/lightStore";
import {
  coerceParamValues,
  defaultParamValues,
  type EffectDefinition,
  type EffectInstance,
  type EffectInstanceUpdate,
  type EffectParamValues,
} from "@shared/effects";

export type { EffectInstance, EffectInstanceUpdate };

export type PlaceEffectResult =
  | { ok: true; instanceId: string }
  | { ok: false; reason: "not-found" | "limit-reached" | "cancelled" };

export type ChangeVersionResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "instance-missing" };

/**
 * Resolves one version through the shared (authenticated) Convex client.
 * Null when the version does not exist or is not readable by the caller.
 */
async function fetchDefinition(effectId: string, version: number): Promise<EffectDefinition | null> {
  const row = await convexClient.query(api.effects.getVersion, { effectId, version });
  return row ? versionDocToDefinition(row) : null;
}

/**
 * Store access plus the two operations that need a definition before they can
 * touch the store: placing a new instance (params default from the definition)
 * and re-pinning an instance to another version (params are coerced so the
 * renderer never reads a value the new version does not declare).
 */
export function useEffectManager() {
  const effects = useLightStore((state) => state.effects);
  const addEffect = useLightStore((state) => state.addEffect);
  const updateEffect = useLightStore((state) => state.updateEffect);
  const removeEffect = useLightStore((state) => state.removeEffect);

  const placeEffect = useCallback(
    async (effectId: string, version: number, x: number, y: number, params?: EffectParamValues, stillValid: () => boolean = () => true): Promise<PlaceEffectResult> => {
      const definition = await fetchDefinition(effectId, version);
      if (!stillValid()) return { ok: false, reason: "cancelled" };
      if (!definition) {
        return { ok: false, reason: "not-found" };
      }
      const instanceId = addEffect({
        effectId,
        version,
        x,
        y,
        params: params ? coerceParamValues(definition.params, params) : defaultParamValues(definition.params),
      });
      if (instanceId === null) {
        return { ok: false, reason: "limit-reached" };
      }
      return { ok: true, instanceId };
    },
    [addEffect],
  );

  const changeVersion = useCallback(
    async (instanceId: string, version: number): Promise<ChangeVersionResult> => {
      const instance = useLightStore.getState().effects.find((effect) => effect.id === instanceId);
      if (!instance) {
        return { ok: false, reason: "instance-missing" };
      }
      if (instance.version === version) {
        return { ok: true };
      }
      const definition = await fetchDefinition(instance.effectId, version);
      if (!definition) {
        return { ok: false, reason: "not-found" };
      }
      // Re-read: the instance may have moved or been deleted while we awaited.
      const current = useLightStore.getState().effects.find((effect) => effect.id === instanceId);
      if (!current) {
        return { ok: false, reason: "instance-missing" };
      }
      updateEffect(instanceId, {
        version,
        params: coerceParamValues(definition.params, current.params),
      });
      return { ok: true };
    },
    [updateEffect],
  );

  return {
    effects,
    addEffect,
    updateEffect,
    removeEffect,
    placeEffect,
    changeVersion,
  };
}
