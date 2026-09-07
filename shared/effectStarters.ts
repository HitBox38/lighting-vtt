import type { EffectDefinition } from "./effects";

const colorSpeed: EffectDefinition["params"] = [
  { key: "color", label: "Color", type: "color", default: "#ffb347" },
  {
    key: "speed",
    label: "Speed",
    type: "number",
    min: 0,
    max: 10,
    step: 0.1,
    default: 2,
  },
];
function shader(
  name: string,
  description: string,
  category: EffectDefinition["category"],
  expression: string,
  color: string,
): EffectDefinition {
  const wgsl = `fn effectMain(fx: EffectInput) -> vec4<f32> {\n  let color = effectParamVec(0);\n  let t = fx.time * effectParam(1);\n  let alpha = ${expression};\n  return vec4<f32>(color.rgb, color.a * alpha);\n}`;
  // These curated expressions use syntax common to both languages. Each program
  // has its own template; authored WGSL is never translated into GLSL.
  const glsl = `vec4 effectMain(EffectInput fx) {\n  vec4 color = effectParamVec(0);\n  float t = fx.time * effectParam(1);\n  float alpha = ${expression};\n  return vec4(color.rgb, color.a * alpha);\n}`;
  return {
    name,
    description,
    category,
    kind: "shader",
    wgsl,
    glsl,
    params: [
      {
        ...colorSpeed[0],
        default: color,
      } as EffectDefinition["params"][number],
      colorSpeed[1],
    ],
    coverage: { kind: category === "Light" ? "circle" : "none" },
    blend: "add",
  };
}
export const EFFECT_STARTERS: readonly EffectDefinition[] = [
  shader(
    "Ember Glow",
    "A warm, breathing glow for braziers and campfires.",
    "Light",
    "(1.0 - smoothstep(0.0, 1.0, fx.dist)) * (0.7 + 0.2 * sin(t) + 0.1 * sin(t * 3.7))",
    "#ffac55",
  ),
  shader(
    "Arcane Portal",
    "A rippling ring that marks a gateway or summoning circle.",
    "Magic",
    "(1.0 - smoothstep(0.02, 0.13, abs(fx.dist - 0.7 - 0.03 * sin(t)))) * (0.75 + 0.25 * sin(t + fx.dist * 24.0))",
    "#75ded7",
  ),
  shader(
    "Mist Veil",
    "Slow layers of haze for a haunted room or moonlit clearing.",
    "Atmosphere",
    "(1.0 - smoothstep(0.0, 1.0, fx.dist)) * (0.2 + 0.16 * sin(fx.dist * 18.0 - t))",
    "#b4c7dd",
  ),
  {
    name: "Light Corridors",
    description:
      "Living paths reach toward nearby lights. Move a light to reshape the geometry.",
    category: "Geometry",
    kind: "script",
    wgsl: "",
    params: [
      {
        key: "width",
        label: "Beam width",
        type: "number",
        min: 2,
        max: 200,
        step: 1,
        default: 24,
      },
    ],
    coverage: { kind: "none" },
    blend: "normal",
    script: `export function compute(input) {
  const { effect, lights, params } = input;
  const width = params.width ?? 24;
  const polygons = [];
  for (const light of lights) {
    const dx = light.x - effect.x, dy = light.y - effect.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance > effect.radius + light.radius) continue;
    const nx = -dy / distance * width, ny = dx / distance * width;
    polygons.push([{x: effect.x + nx, y: effect.y + ny}, {x: light.x + nx, y: light.y + ny}, {x: light.x - nx, y: light.y - ny}, {x: effect.x - nx, y: effect.y - ny}]);
  }
  return { polygons, segments: [] };
}`,
  },
];
