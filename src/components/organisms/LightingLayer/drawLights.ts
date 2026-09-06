import { Graphics as PixiGraphics } from "pixi.js";
import type { Light } from "@shared/index";

import {
  drawReflectionSegment,
  drawThickSegment,
} from "@/components/organisms/LightingLayer/helpers";
import { LIGHT_COLOR } from "@/components/organisms/LightingLayer/constants";
import type { LightReflectionData } from "@/lib/reflection/types";

const drawRadialLight = (
  graphics: PixiGraphics,
  light: Extract<Light, { type: "radial" }>,
  alpha: number,
  reflection: LightReflectionData | undefined,
): void => {
  const primaryPolygon = reflection?.primaryPolygon ?? [];
  if (primaryPolygon.length > 2 && primaryPolygon[0]) {
    graphics.moveTo(primaryPolygon[0].x, primaryPolygon[0].y);
    for (let i = 1; i < primaryPolygon.length; i++) {
      const point = primaryPolygon[i];
      if (point) {
        graphics.lineTo(point.x, point.y);
      }
    }
    graphics.lineTo(primaryPolygon[0].x, primaryPolygon[0].y);
    graphics.fill({ color: LIGHT_COLOR, alpha });
  } else {
    graphics.circle(light.x, light.y, light.radius).fill({ color: LIGHT_COLOR, alpha });
  }

  for (const segment of reflection?.reflectionSegments ?? []) {
    drawReflectionSegment(graphics, segment, alpha * 0.8);
  }
};

const drawConicLight = (
  graphics: PixiGraphics,
  light: Extract<Light, { type: "conic" }>,
  alpha: number,
  reflection: LightReflectionData | undefined,
): void => {
  const primaryPolygon = reflection?.primaryPolygon ?? [];
  if (primaryPolygon.length > 1) {
    graphics.moveTo(light.x, light.y);
    for (const point of primaryPolygon) {
      graphics.lineTo(point.x, point.y);
    }
    graphics.lineTo(light.x, light.y);
    graphics.fill({ color: LIGHT_COLOR, alpha });
  } else {
    const baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
    const halfCone = ((light.coneAngle ?? 0) * Math.PI) / 360;
    graphics
      .moveTo(light.x, light.y)
      .arc(light.x, light.y, light.radius, baseAngle - halfCone, baseAngle + halfCone)
      .lineTo(light.x, light.y)
      .fill({ color: LIGHT_COLOR, alpha });
  }

  for (const segment of reflection?.reflectionSegments ?? []) {
    drawReflectionSegment(graphics, segment, alpha * 0.8);
  }
};

const drawLineLight = (
  graphics: PixiGraphics,
  light: Extract<Light, { type: "line" }>,
  alpha: number,
  reflection: LightReflectionData | undefined,
): void => {
  const thickness = Math.max(light.radius ?? 1, 1);
  const allSegments = reflection?.allSegments ?? [];
  if (allSegments.length > 0) {
    for (const segment of allSegments) {
      drawThickSegment(graphics, segment, thickness, alpha);
    }
    return;
  }

  drawThickSegment(
    graphics,
    { start: { x: light.x, y: light.y }, end: { x: light.targetX, y: light.targetY } },
    thickness,
    alpha,
  );
};

export const drawLights = (
  graphics: PixiGraphics,
  lights: Light[],
  reflectionData: Map<string, LightReflectionData>,
): void => {
  for (const light of lights) {
    const alpha = light.intensity ?? 1;
    const reflection = reflectionData.get(light.id);
    switch (light.type) {
      case "radial":
        drawRadialLight(graphics, light, alpha, reflection);
        break;
      case "conic":
        drawConicLight(graphics, light, alpha, reflection);
        break;
      case "line":
        drawLineLight(graphics, light, alpha, reflection);
        break;
      default: {
        const _exhaustive: never = light;
        void _exhaustive;
      }
    }
  }
};
