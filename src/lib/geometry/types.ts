/**
 * Plain 2D geometry types shared by the built-in mirror tracer, the darkness
 * mask renderer and the user-authored script effect contract.
 *
 * Everything here is structured-clone safe on purpose: script effects run in a
 * sandboxed worker and hand these shapes back across `postMessage`.
 */

export type Point = { x: number; y: number };

export type Ray = { origin: Point; direction: Point };

export type RaySegment = { start: Point; end: Point };

/**
 * What a geometry producer contributes to the darkness mask.
 *
 * - `polygons`: closed shapes filled as lit area (like a light's primary shape).
 * - `segments`: thick lit lines (like a reflected ray bounce).
 */
export interface GeometryOutput {
  polygons: Point[][];
  segments: RaySegment[];
}

export const EMPTY_GEOMETRY: Readonly<GeometryOutput> = Object.freeze({
  polygons: [] as Point[][],
  segments: [] as RaySegment[],
});
