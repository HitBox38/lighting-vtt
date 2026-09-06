import { z } from "zod";

/**
 * User-authored effects: a third placeable object next to lights and mirrors.
 *
 * This module is the single source of truth for the effect data model. The
 * Convex validators in `convex/schema.ts` are derived from these schemas via
 * `convex-helpers/server/zod4`, so do not hand-mirror anything here.
 *
 * Two kinds of definitions exist:
 * - `shader`: WGSL (required) and optional GLSL fragment programs run by pixi.
 * - `script`: sandboxed JavaScript that emits geometry (Stage 3).
 */

// ---------------------------------------------------------------------------
// Limits (enforced client-side in the editor/runtime and server-side on save)
// ---------------------------------------------------------------------------

export const EFFECT_LIMITS = {
  /** Characters per program source (wgsl, glsl, script). */
  maxSourceLength: 24_000,
  /** Declared params per definition. Also the length of `uParams` (vec4 slots). */
  maxParams: 8,
  /** Effect instances per scene. */
  maxInstancesPerScene: 32,
  /** World-space radius bounds of an instance. */
  minRadius: 8,
  maxRadius: 4000,
  maxNameLength: 60,
  maxDescriptionLength: 500,
  maxParamKeyLength: 24,
  maxParamLabelLength: 40,
} as const;

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
/** Identifier-safe key so it can be surfaced as a uniform name in generated code. */
const PARAM_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const paramBase = {
  key: z
    .string()
    .min(1, "Param key is required")
    .max(EFFECT_LIMITS.maxParamKeyLength)
    .regex(PARAM_KEY, "Param key must be an identifier (letters, digits, underscore)"),
  label: z.string().min(1, "Param label is required").max(EFFECT_LIMITS.maxParamLabelLength),
};

export const numberParamSchema = z
  .object({
    ...paramBase,
    type: z.literal("number"),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
  })
  .strict()
  .refine((p) => p.min <= p.max, { message: "min must be <= max", path: ["min"] })
  .refine((p) => p.default >= p.min && p.default <= p.max, {
    message: "default must be within [min, max]",
    path: ["default"],
  });

export const colorParamSchema = z
  .object({
    ...paramBase,
    type: z.literal("color"),
    default: z.string().regex(HEX_COLOR, "Color must be a hex string like #RRGGBB"),
  })
  .strict();

export const booleanParamSchema = z
  .object({
    ...paramBase,
    type: z.literal("boolean"),
    default: z.boolean(),
  })
  .strict();

export const effectParamSchema = z.discriminatedUnion("type", [
  numberParamSchema,
  colorParamSchema,
  booleanParamSchema,
]);

export type EffectParam = z.infer<typeof effectParamSchema>;
export type NumberEffectParam = z.infer<typeof numberParamSchema>;
export type ColorEffectParam = z.infer<typeof colorParamSchema>;
export type BooleanEffectParam = z.infer<typeof booleanParamSchema>;
export type EffectParamType = EffectParam["type"];

/** Concrete values an instance stores, keyed by `EffectParam.key`. */
export const effectParamValueSchema = z.union([z.number(), z.string(), z.boolean()]);
export type EffectParamValue = z.infer<typeof effectParamValueSchema>;

export const effectParamValuesSchema = z.record(z.string().regex(PARAM_KEY), effectParamValueSchema);
export type EffectParamValues = z.infer<typeof effectParamValuesSchema>;

// ---------------------------------------------------------------------------
// Definition (what an author writes; stored immutably per version)
// ---------------------------------------------------------------------------

export const effectKindSchema = z.enum(["shader", "script"]);
export type EffectKind = z.infer<typeof effectKindSchema>;

export const effectCoverageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("circle") }).strict(),
  z.object({ kind: z.literal("none") }).strict(),
]);
export type EffectCoverage = z.infer<typeof effectCoverageSchema>;

export const effectBlendSchema = z.enum(["normal", "add"]);
export type EffectBlend = z.infer<typeof effectBlendSchema>;

export const EFFECT_CATEGORIES = ["Light", "Atmosphere", "Magic", "Geometry", "Other"] as const;
export const effectCategorySchema = z.enum(EFFECT_CATEGORIES);

const sourceSchema = z.string().max(EFFECT_LIMITS.maxSourceLength, "Source is too long");

export const effectDefinitionSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(EFFECT_LIMITS.maxNameLength),
    description: z.string().max(EFFECT_LIMITS.maxDescriptionLength),
    kind: effectKindSchema,
    /** WGSL fragment program. Required when `kind === "shader"`. */
    wgsl: sourceSchema,
    /** Optional GLSL fragment program for the WebGL fallback backend. */
    glsl: sourceSchema.optional(),
    /** JS module source. Required when `kind === "script"` (Stage 3). */
    script: sourceSchema.optional(),
    params: z.array(effectParamSchema).max(EFFECT_LIMITS.maxParams),
    coverage: effectCoverageSchema,
    blend: effectBlendSchema,
    category: effectCategorySchema.optional(),
    thumbnailUrl: z.string().url().optional(),
    thumbnailKey: z.string().optional(),
    source: z.object({ effectId: z.string(), version: z.number().int().positive() }).optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    const seen = new Set<string>();
    def.params.forEach((param, index) => {
      if (seen.has(param.key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate param key "${param.key}"`,
          path: ["params", index, "key"],
        });
      }
      seen.add(param.key);
    });

    switch (def.kind) {
      case "shader":
        if (def.wgsl.trim().length === 0) {
          ctx.addIssue({ code: "custom", message: "WGSL source is required", path: ["wgsl"] });
        }
        break;
      case "script":
        if (!def.script || def.script.trim().length === 0) {
          ctx.addIssue({ code: "custom", message: "Script source is required", path: ["script"] });
        }
        break;
      default: {
        const exhaustive: never = def.kind;
        throw new Error(`Unhandled effect kind: ${String(exhaustive)}`);
      }
    }
  });

export type EffectDefinition = z.infer<typeof effectDefinitionSchema>;

// ---------------------------------------------------------------------------
// Instance (what a scene stores)
// ---------------------------------------------------------------------------

export const effectInstanceSchema = z
  .object({
    id: z.string().min(1, "Effect instance id is required"),
    /** Convex `effects` document id, kept as a string so shared/ stays backend-agnostic. */
    effectId: z.string().min(1, "effectId is required"),
    /** Pinned `effectVersions.version`. An author's later edits never change this table. */
    version: z.number().int().positive(),
    x: z.number(),
    y: z.number(),
    radius: z.number().min(EFFECT_LIMITS.minRadius).max(EFFECT_LIMITS.maxRadius),
    /** Radians. */
    rotation: z.number(),
    params: effectParamValuesSchema,
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .strict();

export type EffectInstance = z.infer<typeof effectInstanceSchema>;

export interface EffectInstanceUpdate {
  x?: number;
  y?: number;
  radius?: number;
  rotation?: number;
  params?: EffectParamValues;
  locked?: boolean;
  hidden?: boolean;
  version?: number;
}

export const DEFAULT_EFFECT_RADIUS = 200;

export function clampEffectRadius(radius: number): number {
  if (!Number.isFinite(radius)) return DEFAULT_EFFECT_RADIUS;
  return Math.min(EFFECT_LIMITS.maxRadius, Math.max(EFFECT_LIMITS.minRadius, radius));
}

/**
 * Best-effort repair of instances loaded from storage or another window.
 *
 * Radius is clamped rather than rejected because it is the one field a drag
 * can legitimately push past the bounds; anything else that fails the schema
 * is dropped (and reported through `onDrop`) so one bad row cannot take the
 * whole scene down. The instance cap is applied last, keeping the earliest
 * entries so the order the GM placed things in survives.
 */
export function sanitizeEffectInstances(
  input: readonly unknown[],
  onDrop?: (index: number, reason: string) => void,
): EffectInstance[] {
  const kept: EffectInstance[] = [];
  const seen = new Set<string>();
  input.forEach((raw, index) => {
    const candidate =
      typeof raw === "object" && raw !== null && "radius" in raw && typeof raw.radius === "number"
        ? { ...raw, radius: clampEffectRadius(raw.radius) }
        : raw;
    const result = effectInstanceSchema.safeParse(candidate);
    if (!result.success) {
      onDrop?.(index, result.error.issues[0]?.message ?? "invalid effect instance");
      return;
    }
    if (seen.has(result.data.id)) {
      onDrop?.(index, `duplicate effect instance id "${result.data.id}"`);
      return;
    }
    if (kept.length >= EFFECT_LIMITS.maxInstancesPerScene) {
      onDrop?.(index, `scene exceeds ${EFFECT_LIMITS.maxInstancesPerScene} effects`);
      return;
    }
    seen.add(result.data.id);
    kept.push(result.data);
  });
  return kept;
}

// ---------------------------------------------------------------------------
// Param helpers shared by runtime, controls and editor
// ---------------------------------------------------------------------------

/** Default values for every declared param. */
export function defaultParamValues(params: readonly EffectParam[]): EffectParamValues {
  const values: EffectParamValues = {};
  for (const param of params) {
    values[param.key] = param.default;
  }
  return values;
}

/**
 * Returns values that are valid for `params`: unknown keys are dropped, missing
 * or ill-typed values fall back to the declared default, numbers are clamped.
 * Use this whenever instance params meet a (possibly different) definition
 * version, so the renderer never reads garbage.
 */
export function coerceParamValues(
  params: readonly EffectParam[],
  values: EffectParamValues | undefined,
): EffectParamValues {
  const out: EffectParamValues = {};
  for (const param of params) {
    const raw = values?.[param.key];
    switch (param.type) {
      case "number": {
        const n = typeof raw === "number" && Number.isFinite(raw) ? raw : param.default;
        out[param.key] = Math.min(param.max, Math.max(param.min, n));
        break;
      }
      case "color":
        out[param.key] = typeof raw === "string" && HEX_COLOR.test(raw) ? raw : param.default;
        break;
      case "boolean":
        out[param.key] = typeof raw === "boolean" ? raw : param.default;
        break;
      default: {
        const exhaustive: never = param;
        throw new Error(`Unhandled effect param type: ${String(exhaustive)}`);
      }
    }
  }
  return out;
}

/**
 * Packs param values into `maxParams` vec4 slots, one param per slot, in
 * declaration order. This is the layout the fixed shader uniform contract
 * (`uParams: array<vec4f, 8>`) expects:
 * - number  -> x
 * - boolean -> x (0 or 1)
 * - color   -> xyz = rgb in [0,1], w = alpha in [0,1] (1 when #RRGGBB)
 */
export function packParamValues(
  params: readonly EffectParam[],
  values: EffectParamValues,
  target: Float32Array = new Float32Array(EFFECT_LIMITS.maxParams * 4),
): Float32Array {
  target.fill(0);
  const coerced = coerceParamValues(params, values);
  params.forEach((param, index) => {
    if (index >= EFFECT_LIMITS.maxParams) return;
    const offset = index * 4;
    const value = coerced[param.key];
    switch (param.type) {
      case "number":
        target[offset] = value as number;
        break;
      case "boolean":
        target[offset] = value ? 1 : 0;
        break;
      case "color": {
        const [r, g, b, a] = hexToRgba(value as string);
        target[offset] = r;
        target[offset + 1] = g;
        target[offset + 2] = b;
        target[offset + 3] = a;
        break;
      }
      default: {
        const exhaustive: never = param;
        throw new Error(`Unhandled effect param type: ${String(exhaustive)}`);
      }
    }
  });
  return target;
}

/** `#RRGGBB` or `#RRGGBBAA` to normalized rgba. Invalid input yields opaque white. */
export function hexToRgba(hex: string): [number, number, number, number] {
  if (!HEX_COLOR.test(hex)) return [1, 1, 1, 1];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return [r, g, b, a];
}
