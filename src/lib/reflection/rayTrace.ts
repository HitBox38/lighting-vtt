import type { Light, Mirror } from "@shared/index";

import { EPSILON, MAX_BOUNCES, MAX_DISTANCE, MIN_INTENSITY } from "./constants";
import { add, getMirrorNormal, normalize, rayMirrorIntersection, reflectDirection, scale } from "./helpers";
import type { Ray, RaySegment } from "./types";

export const traceRay = (
  ray: Ray,
  mirrors: Mirror[],
  maxDistance: number = MAX_DISTANCE,
  intensity: number = 1,
): RaySegment[] => {
  const segments: RaySegment[] = [];
  let currentRay = ray;
  let remainingDistance = maxDistance;
  let currentIntensity = intensity;

  for (
    let bounce = 0;
    bounce < MAX_BOUNCES && remainingDistance > 0 && currentIntensity > MIN_INTENSITY;
    bounce++
  ) {
    let closestIntersection: { point: Ray["origin"]; t: number; mirror: Mirror } | null = null;

    for (const mirror of mirrors) {
      if (mirror.hidden) continue;

      const intersection = rayMirrorIntersection(currentRay, mirror, remainingDistance);
      if (intersection && (!closestIntersection || intersection.t < closestIntersection.t)) {
        closestIntersection = { ...intersection, mirror };
      }
    }

    if (closestIntersection) {
      segments.push({
        start: currentRay.origin,
        end: closestIntersection.point,
      });

      const normal = getMirrorNormal(closestIntersection.mirror);
      const reflectedDir = reflectDirection(currentRay.direction, normal);

      remainingDistance -= closestIntersection.t;
      currentIntensity *= 0.9;

      currentRay = {
        origin: add(closestIntersection.point, scale(reflectedDir, EPSILON * 10)),
        direction: reflectedDir,
      };
    } else {
      segments.push({
        start: currentRay.origin,
        end: add(currentRay.origin, scale(currentRay.direction, remainingDistance)),
      });
      break;
    }
  }

  return segments;
};

export const generateRadialRays = (light: Light, numRays: number = 128): Ray[] => {
  const rays: Ray[] = [];
  const origin = { x: light.x, y: light.y };

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    rays.push({
      origin,
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
    });
  }

  return rays;
};

export const generateConicRays = (light: Light, numRays: number = 64): Ray[] => {
  if (light.type !== "conic") return [];

  const rays: Ray[] = [];
  const origin = { x: light.x, y: light.y };
  const baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
  const halfCone = ((light.coneAngle ?? 60) * Math.PI) / 360;

  for (let i = 0; i < numRays; i++) {
    const t = i / (numRays - 1);
    const angle = baseAngle - halfCone + t * 2 * halfCone;
    rays.push({
      origin,
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
    });
  }

  return rays;
};

export const generateLineRays = (light: Light): Ray[] => {
  if (light.type !== "line") return [];

  const origin = { x: light.x, y: light.y };
  const direction = normalize({
    x: light.targetX - light.x,
    y: light.targetY - light.y,
  });

  return [{ origin, direction }];
};

export const getLightMaxDistance = (light: Light): number => {
  if (light.type === "line") {
    return Math.hypot(light.targetX - light.x, light.targetY - light.y);
  }
  return light.radius;
};
