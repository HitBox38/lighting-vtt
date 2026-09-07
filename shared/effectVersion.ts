import type { EffectDefinition } from "./effects";

/** Preserve authored fields only; database bookkeeping never becomes runtime input. */
export function versionDocToDefinition(doc: EffectDefinition): EffectDefinition {
  return {
    category: doc.category, thumbnailUrl: doc.thumbnailUrl, thumbnailKey: doc.thumbnailKey,
    source: doc.source, name: doc.name, description: doc.description, kind: doc.kind,
    wgsl: doc.wgsl, glsl: doc.glsl, script: doc.script, typescript: doc.typescript,
    params: doc.params, coverage: doc.coverage, blend: doc.blend,
  };
}
