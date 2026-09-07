/**
 * The contract for `kind: "script"` effects: sandboxed JavaScript that turns
 * the scene's lights and mirrors into lit geometry for the darkness mask.
 *
 * Authors ship an ES module exporting one synchronous function:
 *
 *   export function compute(input: ScriptEffectInput): ScriptEffectOutput
 *
 * Everything crossing the boundary is plain data (structured-clone safe); the
 * host never hands the script a function, a DOM node or a store reference.
 * The sandbox in `scriptSandbox.ts` is the security boundary, not this file:
 * the types and lint here exist so authors get readable feedback early.
 */
import type { Light, Mirror } from "@shared/index";
import type { EffectInstance, EffectParamValues } from "@shared/effects";

import type { GeometryOutput, Point, RaySegment } from "@/lib/geometry";
import type { EffectDiagnostic } from "./diagnostics";

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const SCRIPT_LIMITS = {
  /** Wall-clock budget for one `compute` call, measured inside the worker. */
  computeBudgetMs: 50,
  /** Host-side deadline for a reply; past it the worker is presumed hung and terminated. */
  computeHangMs: 1000,
  /** Host-side deadline for a module to import and expose `compute`. */
  loadTimeoutMs: 3000,
  maxPolygons: 64,
  maxPointsPerPolygon: 1024,
  maxSegments: 4096,
  /** Absolute coordinate bound; anything outside is a bug, not a map position. */
  maxCoordinate: 1_000_000,
} as const;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface ScriptEffectRef {
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Radians. */
  rotation: number;
}

/** A light as the script sees it. Hidden lights are never included. */
export type ScriptLight =
  | { id: string; type: "radial"; x: number; y: number; radius: number; color: string; intensity: number }
  | {
      id: string;
      type: "conic";
      x: number;
      y: number;
      radius: number;
      color: string;
      intensity: number;
      coneAngle: number;
      targetX: number;
      targetY: number;
    }
  | {
      id: string;
      type: "line";
      x: number;
      y: number;
      radius: number;
      color: string;
      intensity: number;
      targetX: number;
      targetY: number;
    };

/** A mirror as the script sees it. Hidden mirrors are never included. */
export interface ScriptMirror {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ScriptEffectInput {
  effect: ScriptEffectRef;
  /** Declared params coerced to their types: numbers, `#rrggbb` strings, booleans. */
  params: EffectParamValues;
  lights: ScriptLight[];
  mirrors: ScriptMirror[];
}

/** What `compute` may return. Both keys are optional; missing means empty. */
export interface ScriptEffectOutput {
  polygons?: Point[][];
  segments?: RaySegment[];
}

function toScriptLight(light: Light): ScriptLight {
  const base = {
    id: light.id,
    x: light.x,
    y: light.y,
    radius: light.radius,
    color: light.color,
    intensity: light.intensity,
  };
  switch (light.type) {
    case "radial":
      return { ...base, type: "radial" };
    case "conic":
      return { ...base, type: "conic", coneAngle: light.coneAngle, targetX: light.targetX, targetY: light.targetY };
    case "line":
      return { ...base, type: "line", targetX: light.targetX, targetY: light.targetY };
    default: {
      const exhaustive: never = light;
      throw new Error(`Unhandled light type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Builds the exact object a script receives. Copies field by field so store
 * objects (and any future fields on them) never leak into the sandbox.
 */
export function buildScriptInput(
  instance: EffectInstance,
  params: EffectParamValues,
  lights: readonly Light[],
  mirrors: readonly Mirror[],
): ScriptEffectInput {
  const visibleLights: ScriptLight[] = [];
  for (const light of lights) {
    if (!light.hidden) visibleLights.push(toScriptLight(light));
  }
  const visibleMirrors: ScriptMirror[] = [];
  for (const mirror of mirrors) {
    if (!mirror.hidden) visibleMirrors.push({ id: mirror.id, x1: mirror.x1, y1: mirror.y1, x2: mirror.x2, y2: mirror.y2 });
  }
  return {
    effect: { id: instance.id, x: instance.x, y: instance.y, radius: instance.radius, rotation: instance.rotation },
    params: { ...params },
    lights: visibleLights,
    mirrors: visibleMirrors,
  };
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

export type SanitizedOutput = { ok: true; geometry: GeometryOutput } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readPoint(value: unknown, where: string): Point | string {
  if (!isRecord(value)) return `${where} is not a point object`;
  const { x, y } = value;
  if (typeof x !== "number" || typeof y !== "number") return `${where} must have numeric x and y`;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return `${where} has a non-finite coordinate`;
  if (Math.abs(x) > SCRIPT_LIMITS.maxCoordinate || Math.abs(y) > SCRIPT_LIMITS.maxCoordinate) {
    return `${where} is outside the ±${SCRIPT_LIMITS.maxCoordinate} coordinate range`;
  }
  return { x, y };
}

/**
 * Turns whatever the worker sent back into a `GeometryOutput` the renderer can
 * trust, or a message naming the first thing wrong with it. Rejecting instead
 * of repairing keeps authors honest about their output shape.
 */
export function sanitizeScriptOutput(raw: unknown): SanitizedOutput {
  if (raw === undefined || raw === null) return { ok: true, geometry: { polygons: [], segments: [] } };
  if (!isRecord(raw)) return { ok: false, message: "compute() must return an object with polygons and/or segments" };

  const polygons: Point[][] = [];
  if (raw.polygons !== undefined) {
    if (!Array.isArray(raw.polygons)) return { ok: false, message: "polygons must be an array of point arrays" };
    if (raw.polygons.length > SCRIPT_LIMITS.maxPolygons) {
      return { ok: false, message: `polygons has ${raw.polygons.length} entries; the limit is ${SCRIPT_LIMITS.maxPolygons}` };
    }
    for (let i = 0; i < raw.polygons.length; i++) {
      const polygon: unknown = raw.polygons[i];
      if (!Array.isArray(polygon)) return { ok: false, message: `polygons[${i}] is not an array of points` };
      if (polygon.length > SCRIPT_LIMITS.maxPointsPerPolygon) {
        return { ok: false, message: `polygons[${i}] has ${polygon.length} points; the limit is ${SCRIPT_LIMITS.maxPointsPerPolygon}` };
      }
      const points: Point[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const point = readPoint(polygon[j], `polygons[${i}][${j}]`);
        if (typeof point === "string") return { ok: false, message: point };
        points.push(point);
      }
      // Degenerate polygons are dropped rather than rejected: a script clipping
      // against mirrors legitimately produces empty results at times.
      if (points.length >= 3) polygons.push(points);
    }
  }

  const segments: RaySegment[] = [];
  if (raw.segments !== undefined) {
    if (!Array.isArray(raw.segments)) return { ok: false, message: "segments must be an array of { start, end }" };
    if (raw.segments.length > SCRIPT_LIMITS.maxSegments) {
      return { ok: false, message: `segments has ${raw.segments.length} entries; the limit is ${SCRIPT_LIMITS.maxSegments}` };
    }
    for (let i = 0; i < raw.segments.length; i++) {
      const segment: unknown = raw.segments[i];
      if (!isRecord(segment)) return { ok: false, message: `segments[${i}] is not a { start, end } object` };
      const start = readPoint(segment.start, `segments[${i}].start`);
      if (typeof start === "string") return { ok: false, message: start };
      const end = readPoint(segment.end, `segments[${i}].end`);
      if (typeof end === "string") return { ok: false, message: end };
      segments.push({ start, end });
    }
  }

  return { ok: true, geometry: { polygons, segments } };
}

// ---------------------------------------------------------------------------
// Lint
// ---------------------------------------------------------------------------

const EXPORTS_COMPUTE =
  /\bexport\s+(?:async\s+)?function\s+compute\s*\(|\bexport\s+(?:const|let|var)\s+compute\b|\bexport\s*\{[^}]*\bcompute\b[^}]*\}/;
const STATIC_IMPORT = /^\s*import\s+(?:[\w*{}\s,]+\s+from\s+)?["']/;
const DYNAMIC_IMPORT = /\bimport\s*\(/;
const ASYNC_COMPUTE = /\bexport\s+async\s+function\s+compute\b/;

/**
 * Cheap pre-check before a source is shipped to the sandbox. Imports are
 * blocked by the sandbox CSP anyway; flagging them here gives a line number
 * instead of an opaque "failed to fetch" from the worker.
 */
export function lintScriptSource(source: string): EffectDiagnostic[] {
  const diagnostics: EffectDiagnostic[] = [];
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    if (STATIC_IMPORT.test(line)) {
      diagnostics.push({
        severity: "error",
        line: index + 1,
        language: "js",
        message: "Imports are not available inside the sandbox; the script must be self-contained.",
      });
    } else if (DYNAMIC_IMPORT.test(line)) {
      diagnostics.push({
        severity: "error",
        line: index + 1,
        language: "js",
        message: "Dynamic import() is blocked inside the sandbox.",
      });
    }
  });
  if (ASYNC_COMPUTE.test(source)) {
    diagnostics.push({
      severity: "error",
      line: lines.findIndex((line) => ASYNC_COMPUTE.test(line)) + 1,
      language: "js",
      message: "compute() must be synchronous; it runs once per scene change with a fixed time budget.",
    });
  }
  if (!EXPORTS_COMPUTE.test(source)) {
    diagnostics.push({
      severity: "error",
      line: 1,
      language: "js",
      message: "Define `export function compute(input) { ... }` returning `{ polygons, segments }`.",
    });
  }
  return diagnostics;
}

// ---------------------------------------------------------------------------
// Starter code shown in the editor for a new script effect
// ---------------------------------------------------------------------------

export const STARTER_SCRIPT = `// A lit corridor between this effect and every visible light.
// input.effect: { id, x, y, radius, rotation }
// input.lights: [{ id, type, x, y, radius, color, intensity, ... }]
// input.mirrors: [{ id, x1, y1, x2, y2 }]
// input.params: values of the params declared below (param "width" here)
// Return { polygons: Point[][], segments: { start, end }[] }.
export function compute(input) {
  const { effect, lights, params } = input;
  const width = typeof params.width === "number" ? params.width : 24;
  const polygons = [];
  const segments = [];

  for (const light of lights) {
    const dx = light.x - effect.x;
    const dy = light.y - effect.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0 || distance > effect.radius + light.radius) continue;

    // A beam from the effect centre towards the light, as wide as the param.
    const nx = (-dy / distance) * width;
    const ny = (dx / distance) * width;
    polygons.push([
      { x: effect.x + nx, y: effect.y + ny },
      { x: light.x + nx, y: light.y + ny },
      { x: light.x - nx, y: light.y - ny },
      { x: effect.x - nx, y: effect.y - ny },
    ]);
    segments.push({ start: { x: effect.x, y: effect.y }, end: { x: light.x, y: light.y } });
  }

  return { polygons, segments };
}
`;
