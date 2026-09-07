import type { Mirror } from "@shared/index";

import { EPSILON } from "./constants";
import type { Point, Ray } from "./types";

export const normalize = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  if (len < EPSILON) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

export const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

export const scale = (v: Point, s: number): Point => ({ x: v.x * s, y: v.y * s });

export const getMirrorNormal = (mirror: Mirror): Point => {
  const dx = mirror.x2 - mirror.x1;
  const dy = mirror.y2 - mirror.y1;
  return normalize({ x: -dy, y: dx });
};

export const rayMirrorIntersection = (
  ray: Ray,
  mirror: Mirror,
  maxDistance: number,
): { point: Point; t: number } | null => {
  const p1 = ray.origin;
  const d = ray.direction;
  const p2 = { x: mirror.x1, y: mirror.y1 };
  const p3 = { x: mirror.x2, y: mirror.y2 };

  const v1 = subtract(p1, p2);
  const v2 = subtract(p3, p2);
  const v3 = { x: -d.y, y: d.x };

  const dotV2V3 = dot(v2, v3);
  if (Math.abs(dotV2V3) < EPSILON) {
    return null;
  }

  const t = (v2.x * v1.y - v2.y * v1.x) / dotV2V3;
  const s = dot(v1, v3) / dotV2V3;

  if (t > EPSILON && s >= 0 && s <= 1 && t <= maxDistance) {
    const point = add(p1, scale(d, t));
    return { point, t };
  }

  return null;
};

export const reflectDirection = (direction: Point, normal: Point): Point => {
  const d = dot(direction, normal);
  return subtract(direction, scale(normal, 2 * d));
};
