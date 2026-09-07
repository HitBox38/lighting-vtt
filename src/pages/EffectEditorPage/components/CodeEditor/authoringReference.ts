import { SCRIPT_LIMITS } from "@/lib/effects/scriptContract";
import type { EffectParam } from "@shared/effects";
import type {
  EffectSourceLanguage,
  ShaderLanguage,
} from "@/lib/effects/shaderContract";

export interface Entry {
  signature: string;
  description: string;
}

interface Section {
  title: string;
  entries: readonly Entry[];
}

const SHADER_INPUT_FIELDS: readonly Entry[] = [
  {
    signature: "fx.local",
    description:
      "Position in the quad, -1..1 on both axes. length() == 1 at the radius edge.",
  },
  {
    signature: "fx.quad",
    description:
      "Position in the quad, 0..1 on both axes; rotates with the effect.",
  },
  { signature: "fx.world", description: "Map-space position in pixels." },
  { signature: "fx.uv", description: "Map texture coordinate, 0..1." },
  {
    signature: "fx.dist",
    description: "length(local): 0 at the centre, 1 at the radius.",
  },
  {
    signature: "fx.time",
    description: "Seconds since the scene started rendering.",
  },
  { signature: "fx.radius", description: "Radius in map pixels." },
  { signature: "fx.rotation", description: "Rotation in radians." },
];

const SHADER_RULES: readonly string[] = [
  "Write only functions and constants. Uniforms, bindings, textures and entry points are provided.",
  "WGSL is required; it runs on WebGPU. GLSL is optional and runs on WebGL. Without GLSL, WebGL users see a plain circle.",
  'Coverage "circle" cuts a hole in the darkness like a light; "none" only paints on top.',
];

function shaderHelpers(language: ShaderLanguage): readonly Entry[] {
  switch (language) {
    case "wgsl":
      return [
        {
          signature: "fn effectMain(fx: EffectInput) -> vec4<f32>",
          description:
            "Your entry point. Return rgba; alpha is the effect's opacity.",
        },
        {
          signature: "effectParam(i: i32) -> f32",
          description:
            "First component of param slot i (numbers, toggles as 0 or 1).",
        },
        {
          signature: "effectParamVec(i: i32) -> vec4<f32>",
          description: "Whole slot i (colours as rgba in 0..1).",
        },
        {
          signature: "sampleMap(uv: vec2<f32>) -> vec4<f32>",
          description: "Sample the scene's map texture.",
        },
      ];
    case "glsl":
      return [
        {
          signature: "vec4 effectMain(EffectInput fx)",
          description:
            "Your entry point. Return rgba; alpha is the effect's opacity.",
        },
        {
          signature: "float effectParam(int i)",
          description:
            "First component of param slot i (numbers, toggles as 0 or 1).",
        },
        {
          signature: "vec4 effectParamVec(int i)",
          description: "Whole slot i (colours as rgba in 0..1).",
        },
        {
          signature: "vec4 sampleMap(vec2 uv)",
          description: "Sample the scene's map texture.",
        },
      ];
    default: {
      const exhaustive: never = language;
      throw new Error(`Unhandled shader language: ${String(exhaustive)}`);
    }
  }
}

const SCRIPT_SECTIONS: readonly Section[] = [
  {
    title: "Entry point",
    entries: [
      {
        signature: "export function compute(input) → { polygons?, segments? }",
        description:
          "Called once per scene change, synchronously. Return lit shapes in map pixels; both keys are optional.",
      },
      {
        signature: "polygons: {x, y}[][]",
        description:
          "Closed shapes filled as lit area. Fewer than 3 points are dropped.",
      },
      {
        signature: "segments: { start: {x, y}, end: {x, y} }[]",
        description: "Thick lit lines, drawn like reflected rays.",
      },
    ],
  },
  {
    title: "input",
    entries: [
      {
        signature: "input.effect",
        description:
          "{ id, x, y, radius, rotation } of this instance. rotation is in radians.",
      },
      {
        signature: "input.params",
        description:
          "Declared params by key: numbers, '#rrggbb' strings, booleans.",
      },
      {
        signature: "input.lights",
        description:
          "Visible lights: { id, type, x, y, radius, color, intensity }. Conic adds coneAngle, targetX, targetY; line adds targetX, targetY.",
      },
      {
        signature: "input.mirrors",
        description: "Visible mirrors: { id, x1, y1, x2, y2 }.",
      },
    ],
  },
];

const SCRIPT_RULES: readonly string[] = [
  "The script is a self-contained ES module. No imports, no network, no storage, no DOM; only plain data crosses the boundary.",
  `compute() has ${SCRIPT_LIMITS.computeBudgetMs}ms per call. Slower scripts are stopped; scripts that never return are terminated after ${SCRIPT_LIMITS.computeHangMs}ms.`,
  `Output limits: ${SCRIPT_LIMITS.maxPolygons} polygons of ${SCRIPT_LIMITS.maxPointsPerPolygon} points, ${SCRIPT_LIMITS.maxSegments} segments. Anything over is rejected, not trimmed.`,
  'Coverage still applies: with "circle" the effect\'s own radius cuts darkness too; with "none" only the returned geometry does.',
];

export function sectionsFor(
  language: EffectSourceLanguage,
  params: readonly EffectParam[] = [],
): {
  sections: readonly Section[];
  rules: readonly string[];
} {
  switch (language) {
    case "wgsl":
    case "glsl":
      return {
        sections: [
          { title: "Functions", entries: shaderHelpers(language) },
          { title: "EffectInput", entries: SHADER_INPUT_FIELDS },
          {
            title: "Your controls",
            entries: parameterEntries(language, params),
          },
        ],
        rules: SHADER_RULES,
      };
    case "js":
    case "ts":
      return {
        sections: [
          ...SCRIPT_SECTIONS,
          {
            title: "input.effect",
            entries: [
              { signature: "input.effect.id", description: "The instance ID." },
              {
                signature: "input.effect.x",
                description: "Map-space horizontal position in pixels.",
              },
              {
                signature: "input.effect.y",
                description: "Map-space vertical position in pixels.",
              },
              {
                signature: "input.effect.radius",
                description: "Effect radius in pixels.",
              },
              {
                signature: "input.effect.rotation",
                description: "Effect rotation in radians.",
              },
            ],
          },
          {
            title: "Your controls",
            entries: parameterEntries(language, params),
          },
        ],
        rules:
          language === "ts"
            ? [
                "TypeScript is compiled to JavaScript for preview and saving. Syntax is checked; semantic type checking is not enabled. Use self-contained types (effectTypes inserts the API declarations).",
                ...SCRIPT_RULES,
              ]
            : SCRIPT_RULES,
      };
    default: {
      const exhaustive: never = language;
      throw new Error(`Unhandled source language: ${String(exhaustive)}`);
    }
  }
}

export function parameterEntries(
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): Entry[] {
  return params.map((param, index) => ({
    signature:
      language === "js" || language === "ts"
        ? `input.params.${param.key}`
        : `${param.type === "color" ? "effectParamVec" : "effectParam"}(${index})`,
    description: `${param.label} (${param.key}) · ${param.type}. Default: ${param.default}.${param.type === "number" ? ` Range: ${param.min}–${param.max}.` : ""}${language !== "js" && language !== "ts" && param.type === "boolean" ? " Returns 0 or 1." : ""}`,
  }));
}

/** Names used by both inline documentation and completion; shader slots stay numeric. */
export function apiEntries(
  language: EffectSourceLanguage,
  params: readonly EffectParam[],
): (Entry & { name: string })[] {
  return sectionsFor(language, params)
    .sections.flatMap((section) => section.entries)
    .map((entry) => ({
      ...entry,
      name:
        entry.signature
          .replace(/^(?:export function |fn |float |vec4 )/, "")
          .match(/^[\w.]+/)?.[0] ?? "",
    }))
    .filter((entry) => entry.name && !/\(\d+\)/.test(entry.signature));
}
