import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type { EffectDefinition, EffectInstance } from "@shared/effects";

/** `effectId@version`: the key a scene instance uses to pin a definition. */
export function effectRefKey(effectId: string, version: number): string {
  return `${effectId}@${version}`;
}

/** Strips Convex bookkeeping from an `effectVersions` row so the runtime sees a plain definition. */
export function versionDocToDefinition(doc: Doc<"effectVersions">): EffectDefinition {
  return {
    category: doc.category,
    thumbnailUrl: doc.thumbnailUrl,
    thumbnailKey: doc.thumbnailKey,
    source: doc.source,
    name: doc.name,
    description: doc.description,
    kind: doc.kind,
    wgsl: doc.wgsl,
    glsl: doc.glsl,
    script: doc.script,
    params: doc.params,
    coverage: doc.coverage,
    blend: doc.blend,
  };
}

export interface EffectDefinitionsResult {
  /** Resolved definitions keyed by `effectRefKey`. Missing keys are unreadable or deleted. */
  definitions: Map<string, EffectDefinition>;
  /** True until the first server response arrives. */
  isLoading: boolean;
}

/**
 * One reactive subscription resolving every `effectId@version` a set of
 * instances pins. Pass `sceneId` so players at the table can read the GM's
 * private effects (see `effects.getVersions`).
 */
export function useEffectDefinitions(
  instances: readonly EffectInstance[],
  sceneId: string | null,
): EffectDefinitionsResult {
  const refs = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ effectId: string; version: number }> = [];
    for (const instance of instances) {
      const key = effectRefKey(instance.effectId, instance.version);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ effectId: instance.effectId, version: instance.version });
    }
    // Stable order so the query args (and therefore the subscription) do not churn.
    out.sort((a, b) => (a.effectId === b.effectId ? a.version - b.version : a.effectId.localeCompare(b.effectId)));
    return out;
  }, [instances]);

  const rows = useQuery(
    api.effects.getVersions,
    refs.length === 0 ? "skip" : { refs, sceneId: sceneId ? (sceneId as Id<"scenes">) : undefined },
  );

  const definitions = useMemo(() => {
    const map = new Map<string, EffectDefinition>();
    for (const row of rows ?? []) {
      map.set(effectRefKey(row.effectId, row.version), versionDocToDefinition(row));
    }
    return map;
  }, [rows]);

  return { definitions, isLoading: refs.length > 0 && rows === undefined };
}
