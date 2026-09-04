export type Point = { x: number; y: number };
export type Ray = { origin: Point; direction: Point };
export type RaySegment = { start: Point; end: Point };

export interface LightReflectionData {
  reflectionSegments: RaySegment[];
  allSegments: RaySegment[];
  hasReflections: boolean;
  primaryPolygon: Point[];
}
