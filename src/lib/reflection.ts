import type { Light, Mirror } from "@shared/index";

export type Point = { x: number; y: number };
export type Ray = { origin: Point; direction: Point };
export type RaySegment = { start: Point; end: Point };

const EPSILON = 0.0001;
const MAX_BOUNCES = 20;
const MAX_DISTANCE = 5000;
const MIN_INTENSITY = 0.05;

/**
 * Normalize a vector
 */
const normalize = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

/**
 * Dot product of two vectors
 */
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

/**
 * Subtract two vectors
 */
const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

/**
 * Add two vectors
 */
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

/**
 * Scale a vector
 */
const scale = (v: Point, s: number): Point => ({ x: v.x * s, y: v.y * s });

/**
 * Get the normal vector of a mirror (perpendicular to the mirror line)
 */
const getMirrorNormal = (mirror: Mirror): Point => {
  const dx = mirror.x2 - mirror.x1;
  const dy = mirror.y2 - mirror.y1;
  // Perpendicular vector (rotate 90 degrees)
  return normalize({ x: -dy, y: dx });
};

/**
 * Calculate intersection point of a ray with a mirror segment
 * Returns null if no intersection, otherwise returns the intersection point and parameter t
 */
export const rayMirrorIntersection = (
  ray: Ray,
  mirror: Mirror,
  maxDistance: number = MAX_DISTANCE
): { point: Point; t: number } | null => {
  // Ray: P = origin + t * direction (t >= 0)
  // Line segment: Q = (x1, y1) + s * ((x2, y2) - (x1, y1)) (0 <= s <= 1)

  const p1 = ray.origin;
  const d = ray.direction;
  const p2 = { x: mirror.x1, y: mirror.y1 };
  const p3 = { x: mirror.x2, y: mirror.y2 };

  const v1 = subtract(p1, p2);
  const v2 = subtract(p3, p2);
  const v3 = { x: -d.y, y: d.x }; // Perpendicular to ray direction

  const dotV2V3 = dot(v2, v3);
  if (Math.abs(dotV2V3) < EPSILON) {
    // Ray and mirror are parallel
    return null;
  }

  const t = (v2.x * v1.y - v2.y * v1.x) / dotV2V3;
  const s = dot(v1, v3) / dotV2V3;

  // t must be positive (ray goes forward) and s must be in [0, 1] (on segment)
  if (t > EPSILON && s >= 0 && s <= 1 && t <= maxDistance) {
    const point = add(p1, scale(d, t));
    return { point, t };
  }

  return null;
};

/**
 * Reflect a direction vector off a surface with given normal
 */
export const reflectDirection = (direction: Point, normal: Point): Point => {
  // reflection = direction - 2 * (direction · normal) * normal
  const d = dot(direction, normal);
  return subtract(direction, scale(normal, 2 * d));
};

/**
 * Trace a single ray through mirrors, returning all path segments
 */
export const traceRay = (
  ray: Ray,
  mirrors: Mirror[],
  maxDistance: number = MAX_DISTANCE,
  intensity: number = 1
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
    let closestIntersection: { point: Point; t: number; mirror: Mirror } | null = null;

    // Find the closest mirror intersection
    for (const mirror of mirrors) {
      if (mirror.hidden) continue;

      const intersection = rayMirrorIntersection(currentRay, mirror, remainingDistance);
      if (intersection && (!closestIntersection || intersection.t < closestIntersection.t)) {
        closestIntersection = { ...intersection, mirror };
      }
    }

    if (closestIntersection) {
      // Add segment from current position to mirror
      segments.push({
        start: currentRay.origin,
        end: closestIntersection.point,
      });

      // Calculate reflected direction
      const normal = getMirrorNormal(closestIntersection.mirror);
      const reflectedDir = reflectDirection(currentRay.direction, normal);

      // Update for next iteration
      remainingDistance -= closestIntersection.t;
      currentIntensity *= 0.9; // Slight intensity decay per reflection

      // Move origin slightly away from the mirror to avoid self-intersection
      currentRay = {
        origin: add(closestIntersection.point, scale(reflectedDir, EPSILON * 10)),
        direction: reflectedDir,
      };
    } else {
      // No intersection found, extend ray to max distance
      segments.push({
        start: currentRay.origin,
        end: add(currentRay.origin, scale(currentRay.direction, remainingDistance)),
      });
      break;
    }
  }

  return segments;
};

/**
 * Generate rays for a radial light
 */
const generateRadialRays = (light: Light, numRays: number = 64): Ray[] => {
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

/**
 * Generate rays for a conic light
 */
const generateConicRays = (light: Light, numRays: number = 32): Ray[] => {
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

/**
 * Generate a single ray for a line light
 */
const generateLineRays = (light: Light): Ray[] => {
  if (light.type !== "line") return [];

  const origin = { x: light.x, y: light.y };
  const direction = normalize({
    x: light.targetX - light.x,
    y: light.targetY - light.y,
  });

  return [{ origin, direction }];
};

export type ReflectedPath = {
  segments: RaySegment[];
  lightId: string;
  intensity: number;
};

/**
 * Calculate the max distance for a light's rays
 */
const getLightMaxDistance = (light: Light): number => {
  if (light.type === "line") {
    // For line lights, the distance is from source to target, plus extra for reflections
    const lineLength = Math.hypot(light.targetX - light.x, light.targetY - light.y);
    return lineLength;
  }
  return light.radius;
};

/**
 * Trace all light paths with reflections for a given set of lights and mirrors
 */
export const traceLightPaths = (lights: Light[], mirrors: Mirror[]): ReflectedPath[] => {
  const paths: ReflectedPath[] = [];
  const visibleMirrors = mirrors.filter((m) => !m.hidden);

  if (visibleMirrors.length === 0) {
    return paths;
  }

  for (const light of lights) {
    if (light.hidden) continue;

    const intensity = light.intensity ?? 1;
    let rays: Ray[] = [];

    if (light.type === "radial") {
      rays = generateRadialRays(light, 64);
    } else if (light.type === "conic") {
      rays = generateConicRays(light, 32);
    } else if (light.type === "line") {
      rays = generateLineRays(light);
    }

    const maxDist = getLightMaxDistance(light);

    for (const ray of rays) {
      const segments = traceRay(ray, visibleMirrors, maxDist, intensity);

      // Only include paths that have reflections (more than one segment)
      if (segments.length > 1) {
        paths.push({
          segments,
          lightId: light.id,
          intensity,
        });
      }
    }
  }

  return paths;
};

export interface LightReflectionData {
  /** All segments including the first (for line lights that need full path rendering) */
  allSegments: RaySegment[];
  /** Whether this light has any reflections */
  hasReflections: boolean;
}

/**
 * Get reflection data for all lights
 * Returns data needed to render both direct and reflected light paths
 */
export const getReflectionData = (
  lights: Light[],
  mirrors: Mirror[]
): Map<string, LightReflectionData> => {
  const result = new Map<string, LightReflectionData>();
  const paths = traceLightPaths(lights, mirrors);

  // Initialize all lights with no reflections
  for (const light of lights) {
    result.set(light.id, { allSegments: [], hasReflections: false });
  }

  for (const path of paths) {
    const existing = result.get(path.lightId);
    if (existing) {
      result.set(path.lightId, {
        allSegments: [...existing.allSegments, ...path.segments],
        hasReflections: true,
      });
    }
  }

  return result;
};
