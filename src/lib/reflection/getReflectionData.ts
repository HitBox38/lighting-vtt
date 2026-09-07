import type { Light, Mirror } from "@shared/index";

import {
  generateConicRays,
  generateLineRays,
  generateRadialRays,
  getLightMaxDistance,
  traceRay,
} from "./rayTrace";
import type { LightReflectionData, Ray, RaySegment } from "./types";

const emptyReflectionData = (): LightReflectionData => ({
  reflectionSegments: [],
  allSegments: [],
  hasReflections: false,
  primaryPolygon: [],
});

const raysForLight = (light: Light): Ray[] => {
  switch (light.type) {
    case "radial":
      return generateRadialRays(light, 128);
    case "conic":
      return generateConicRays(light, 64);
    case "line":
      return generateLineRays(light);
    default: {
      const _exhaustive: never = light;
      return _exhaustive;
    }
  }
};

export const getReflectionData = (
  lights: Light[],
  mirrors: Mirror[],
): Map<string, LightReflectionData> => {
  const result = new Map<string, LightReflectionData>();
  const visibleMirrors = mirrors.filter((m) => !m.hidden);

  for (const light of lights) {
    if (light.hidden) {
      result.set(light.id, emptyReflectionData());
      continue;
    }

    const intensity = light.intensity ?? 1;
    const rays = raysForLight(light);
    const maxDist = getLightMaxDistance(light);
    const reflectionSegments: RaySegment[] = [];
    const allSegments: RaySegment[] = [];
    const primaryPolygonPoints = [];

    for (const ray of rays) {
      const segments = traceRay(ray, visibleMirrors, maxDist, intensity);
      allSegments.push(...segments);

      const primaryEnd = segments[0]?.end;
      if (primaryEnd) {
        primaryPolygonPoints.push(primaryEnd);
      }

      if (segments.length > 1) {
        for (let i = 1; i < segments.length; i++) {
          const segment = segments[i];
          if (segment) {
            reflectionSegments.push(segment);
          }
        }
      }
    }

    result.set(light.id, {
      reflectionSegments,
      allSegments,
      hasReflections: reflectionSegments.length > 0,
      primaryPolygon: primaryPolygonPoints,
    });
  }

  return result;
};
