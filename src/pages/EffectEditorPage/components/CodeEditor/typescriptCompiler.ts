import { transform } from "sucrase";
import { EFFECT_LIMITS } from "@shared/effects";
import type { EffectDiagnostic } from "@/lib/effects/diagnostics";

/** Editor-only compilation. The sandbox and player clients always receive plain JS. */
export function compileTypeScript(source: string): {
  code?: string;
  diagnostics: EffectDiagnostic[];
} {
  if (source.length > EFFECT_LIMITS.maxSourceLength)
    return {
      diagnostics: [
        {
          language: "ts",
          severity: "error",
          line: null,
          message: `TypeScript source exceeds ${EFFECT_LIMITS.maxSourceLength} characters.`,
        },
      ],
    };
  try {
    const { code } = transform(source, {
      transforms: ["typescript"],
      disableESTransforms: true,
      keepUnusedImports: true,
      filePath: "effect.ts",
    });
    return { code, diagnostics: [] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TypeScript compilation failed.";
    const location = /\((\d+):(\d+)\)/.exec(message);
    return {
      diagnostics: [
        {
          language: "ts",
          severity: "error",
          line: location ? Number(location[1]) : null,
          message,
        },
      ],
    };
  }
}

// Self-contained declarations can be edited with the effect; no runtime imports.
export const SCRIPT_TYPES = `type Point = { x: number; y: number };
type Segment = { start: Point; end: Point };
type EffectInput = {
  effect: { id: string; x: number; y: number; radius: number; rotation: number };
  params: Record<string, number | string | boolean>;
  lights: Array<{ id: string; type: "radial" | "conic" | "line"; x: number; y: number;
    radius: number; color: string; intensity: number;
    coneAngle?: number; targetX?: number; targetY?: number }>;
  mirrors: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
};
type EffectOutput = { polygons?: Point[][]; segments?: Segment[] };`;

export function typedScriptStarter(source: string): string {
  return `${SCRIPT_TYPES}\n\n${source.replace("function compute(input)", "function compute(input: EffectInput): EffectOutput")}`;
}
