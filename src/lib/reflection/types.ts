export type { Point, Ray, RaySegment } from "@/lib/geometry";

import type { Point, RaySegment } from "@/lib/geometry";

export interface LightReflectionData {
  reflectionSegments: RaySegment[];
  allSegments: RaySegment[];
  hasReflections: boolean;
  primaryPolygon: Point[];
}
