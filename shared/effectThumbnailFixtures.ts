import { EFFECT_STARTERS } from "./effectStarters";
import type { EffectDefinition } from "./effects";

/** Shared with the browser comparison harness and deployed diagnostic. */
const parameters: EffectDefinition = {
  ...EFFECT_STARTERS[0], name: "Parameters and map", blend: "normal",
  params: [
    { key: "alpha", label: "Alpha", type: "number", min: 0, max: 1, step: 0.1, default: 0.5 },
    { key: "enabled", label: "Enabled", type: "boolean", default: true },
    { key: "color", label: "Color", type: "color", default: "#4080c0" },
  ],
  wgsl: `fn effectMain(fx: EffectInput) -> vec4<f32> {
    let color = effectParamVec(2) * sampleMap(fx.uv);
    return vec4<f32>(color.rgb, effectParam(0) * effectParam(1));
  }`,
};
export const THUMBNAIL_FIXTURES = [
  EFFECT_STARTERS[0], EFFECT_STARTERS[1], parameters,
  { ...parameters, name: "Additive parameters", blend: "add" as const },
  { ...parameters, name: "Transparent", wgsl: "fn effectMain(fx: EffectInput) -> vec4<f32> { return vec4<f32>(1.0,0.0,0.0,0.0); }" },
];
