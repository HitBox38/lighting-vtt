import { Graphics as PixiGraphics } from "pixi.js";
import type { Light } from "@shared/index";

import { drawHighlightSegment } from "@/components/organisms/LightingLayer/helpers";
import {
  HIGHLIGHT_COLOR,
  HIGHLIGHT_STROKE_WIDTH,
} from "@/components/organisms/LightingLayer/constants";
import type { LightReflectionData, RaySegment } from "@/lib/reflection/types";

export const drawHighlight = (
  graphics: PixiGraphics,
  hoveredLight: Light | null,
  isGM: boolean,
  reflectionData: Map<string, LightReflectionData>,
): void => {
  graphics.clear();
  if (!hoveredLight || !isGM) return;

  graphics.setStrokeStyle({
    width: HIGHLIGHT_STROKE_WIDTH,
    color: HIGHLIGHT_COLOR,
    alpha: 0.9,
  });

  switch (hoveredLight.type) {
    case "radial":
      graphics.circle(hoveredLight.x, hoveredLight.y, hoveredLight.radius + HIGHLIGHT_STROKE_WIDTH);
      graphics.stroke();
      return;
    case "conic": {
      const baseAngle = Math.atan2(
        hoveredLight.targetY - hoveredLight.y,
        hoveredLight.targetX - hoveredLight.x,
      );
      const halfCone = ((hoveredLight.coneAngle ?? 0) * Math.PI) / 360;
      const outerRadius = hoveredLight.radius + HIGHLIGHT_STROKE_WIDTH;
      graphics.moveTo(hoveredLight.x, hoveredLight.y);
      graphics.arc(
        hoveredLight.x,
        hoveredLight.y,
        outerRadius,
        baseAngle - halfCone,
        baseAngle + halfCone,
      );
      graphics.lineTo(hoveredLight.x, hoveredLight.y);
      graphics.stroke();
      return;
    }
    case "line": {
      const lightReflectionData = reflectionData.get(hoveredLight.id);
      const thickness = Math.max(hoveredLight.radius ?? 1, 1) + HIGHLIGHT_STROKE_WIDTH;
      const segments: RaySegment[] =
        lightReflectionData?.hasReflections && lightReflectionData
          ? lightReflectionData.allSegments
          : [
              {
                start: { x: hoveredLight.x, y: hoveredLight.y },
                end: { x: hoveredLight.targetX, y: hoveredLight.targetY },
              },
            ];
      for (const segment of segments) {
        drawHighlightSegment(graphics, segment, thickness);
      }
      return;
    }
    default: {
      const _exhaustive: never = hoveredLight;
      void _exhaustive;
    }
  }
};
