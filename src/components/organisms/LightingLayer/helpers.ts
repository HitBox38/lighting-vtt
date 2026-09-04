import { Graphics as PixiGraphics } from "pixi.js";

import type { RaySegment } from "@/lib/reflection/types";
import {
  HIGHLIGHT_STROKE_WIDTH,
  LIGHT_COLOR,
  REFLECTION_THICKNESS,
} from "@/components/organisms/LightingLayer/constants";

export const drawThickSegment = (
  graphics: PixiGraphics,
  segment: RaySegment,
  thickness: number,
  alpha: number,
): void => {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 1) {
    graphics.circle(segment.start.x, segment.start.y, thickness).fill({ color: LIGHT_COLOR, alpha });
    return;
  }

  const normX = (-dy / distance) * thickness;
  const normY = (dx / distance) * thickness;

  graphics
    .moveTo(segment.start.x + normX, segment.start.y + normY)
    .lineTo(segment.end.x + normX, segment.end.y + normY)
    .lineTo(segment.end.x - normX, segment.end.y - normY)
    .lineTo(segment.start.x - normX, segment.start.y - normY)
    .lineTo(segment.start.x + normX, segment.start.y + normY)
    .fill({ color: LIGHT_COLOR, alpha });

  graphics.circle(segment.start.x, segment.start.y, thickness).fill({ color: LIGHT_COLOR, alpha });
  graphics.circle(segment.end.x, segment.end.y, thickness).fill({ color: LIGHT_COLOR, alpha });
};

export const drawReflectionSegment = (
  graphics: PixiGraphics,
  segment: RaySegment,
  alpha: number,
): void => {
  drawThickSegment(graphics, segment, REFLECTION_THICKNESS, alpha);
};

export const drawHighlightSegment = (
  graphics: PixiGraphics,
  segment: RaySegment,
  thickness: number,
): void => {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 1) {
    graphics.circle(segment.start.x, segment.start.y, thickness);
    graphics.stroke();
    return;
  }

  const normX = (-dy / distance) * thickness;
  const normY = (dx / distance) * thickness;

  graphics
    .moveTo(segment.start.x + normX, segment.start.y + normY)
    .lineTo(segment.end.x + normX, segment.end.y + normY)
    .lineTo(segment.end.x - normX, segment.end.y - normY)
    .lineTo(segment.start.x - normX, segment.start.y - normY)
    .lineTo(segment.start.x + normX, segment.start.y + normY)
    .stroke();

  graphics.circle(segment.start.x, segment.start.y, thickness);
  graphics.stroke();
  graphics.circle(segment.end.x, segment.end.y, thickness);
  graphics.stroke();
};

export { HIGHLIGHT_STROKE_WIDTH };
