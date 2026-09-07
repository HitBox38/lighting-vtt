import { defaultParamValues, packParamValues, type EffectDefinition } from "./effects";
import { assembleWgsl, lintAuthorSource } from "./effectShaderContract";

export const THUMBNAIL_SPEC = {
  revision: 1, width: 640, height: 360, time: 1, radiusFraction: 0.38,
  background: [27, 25, 22], grid: [81, 72, 62], gridAlpha: 0.6, gridStep: 32,
} as const;
export type EffectSnapshotSpec = typeof THUMBNAIL_SPEC;

/** Exact uniform-buffer alignment of the shared Pixi/WebGPU shader contract. */
export function thumbnailShaderInput(definition: EffectDefinition, spec: EffectSnapshotSpec = THUMBNAIL_SPEC) {
  if (definition.kind !== "shader") throw new Error("Only WGSL effects have server thumbnails");
  if (lintAuthorSource("wgsl", definition.wgsl).length) throw new Error("Invalid WGSL effect contract");
  const { width, height, radiusFraction, time } = spec;
  const radius = height * radiusFraction;
  const global = new Float32Array(32);
  global.set([2 / width, 0, 0, 0, 0, -2 / height, 0, 0, -1, 1, 1, 0]);
  global.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0], 12);
  global.set([1, 1, 1, 1, width, height], 24);
  const local = new Float32Array(20);
  local.set([radius, 0, 0, 0, 0, radius, 0, 0, width / 2, height / 2, 1, 0, 1, 1, 1, 1]);
  const effect = new Float32Array(44);
  effect.set(packParamValues(definition.params, defaultParamValues(definition.params)));
  effect.set([width / 2, height / 2, width, height, width, height, time, radius, 0], 32);
  return {
    spec, source: assembleWgsl(definition.wgsl).source,
    global: Array.from(global), local: Array.from(local), effect: Array.from(effect), blend: definition.blend,
  };
}
