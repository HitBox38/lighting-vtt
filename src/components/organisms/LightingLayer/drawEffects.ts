import { Graphics as PixiGraphics } from "pixi.js";
import type { EffectCoverage, EffectDefinition, EffectInstance } from "@shared/effects";

import { drawReflectionSegment } from "@/components/organisms/LightingLayer/helpers";
import {
  LIGHT_COLOR,
  SCRIPT_POLYGON_ALPHA,
  SCRIPT_SEGMENT_ALPHA,
} from "@/components/organisms/LightingLayer/constants";
import { effectRefKey } from "@/lib/effects/hooks/useEffectDefinitions";
import type { GeometryOutput, Point } from "@/lib/geometry";

const fillPolygon = (graphics: PixiGraphics, polygon: readonly Point[], alpha: number): void => {
  const first = polygon[0];
  if (!first || polygon.length < 3) {
    return;
  }
  graphics.moveTo(first.x, first.y);
  for (let i = 1; i < polygon.length; i++) {
    const point = polygon[i];
    if (point) {
      graphics.lineTo(point.x, point.y);
    }
  }
  graphics.lineTo(first.x, first.y);
  graphics.fill({ color: LIGHT_COLOR, alpha });
};

/**
 * Appends an effect's declared coverage shape to the darkness mask. Effects
 * without a resolved definition still cut a circle: a loading or broken effect
 * should not plunge that part of the table into darkness.
 */
const drawEffectCoverage = (
  graphics: PixiGraphics,
  instance: EffectInstance,
  definition: EffectDefinition | undefined,
): void => {
  const coverage: EffectCoverage = definition?.coverage ?? { kind: "circle" };
  switch (coverage.kind) {
    case "circle":
      graphics.circle(instance.x, instance.y, instance.radius).fill({ color: LIGHT_COLOR, alpha: 1 });
      return;
    case "none":
      return;
    default: {
      const exhaustive: never = coverage;
      throw new Error(`Unhandled effect coverage: ${JSON.stringify(exhaustive)}`);
    }
  }
};

export const drawEffects = (
  graphics: PixiGraphics,
  effects: readonly EffectInstance[],
  definitions: ReadonlyMap<string, EffectDefinition>,
  scriptGeometry: ReadonlyMap<string, GeometryOutput>,
): void => {
  for (const effect of effects) {
    drawEffectCoverage(
      graphics,
      effect,
      definitions.get(effectRefKey(effect.effectId, effect.version)),
    );
  }

  for (const output of scriptGeometry.values()) {
    for (const polygon of output.polygons) {
      fillPolygon(graphics, polygon, SCRIPT_POLYGON_ALPHA);
    }
    for (const segment of output.segments) {
      drawReflectionSegment(graphics, segment, SCRIPT_SEGMENT_ALPHA);
    }
  }
};
