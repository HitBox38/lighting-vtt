import { useCallback, useEffect, useMemo, useRef } from "react";
import { BlurFilter, Graphics as PixiGraphics } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";
import { getReflectionData, type LightReflectionData, type RaySegment } from "@/lib/reflection";

interface Props {
  width: number;
  height: number;
  isGM?: boolean;
}

const DARKNESS_ALPHA = 0.6;
const LIGHT_COLOR = 0xffffff;
const BLUR_STRENGTH = 10;
const REFLECTION_THICKNESS = 8;

export function LightingLayer({ width, height, isGM = true }: Props) {
  const lights = useLightStore((state) => state.lights);
  const mirrors = useLightStore((state) => state.mirrors);
  const visibleLights = useMemo(
    () => (isGM ? lights : lights.filter((light) => !light.hidden)),
    [isGM, lights]
  );
  const visibleMirrors = useMemo(
    () => (isGM ? mirrors : mirrors.filter((mirror) => !mirror.hidden)),
    [isGM, mirrors]
  );
  const darknessRef = useRef<PixiGraphics | null>(null);
  const lightsRef = useRef<PixiGraphics | null>(null);

  const blurFilter = useMemo(() => {
    const filter = new BlurFilter({
      strength: BLUR_STRENGTH,
      quality: 4,
    });
    filter.repeatEdgePixels = true;
    return filter;
  }, []);

  useEffect(() => {
    return () => {
      blurFilter.destroy();
    };
  }, [blurFilter]);

  const drawDarkness = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      if (width <= 0 || height <= 0) {
        return;
      }

      graphics.rect(0, 0, width, height).fill({ color: 0x000000, alpha: DARKNESS_ALPHA });
    },
    [height, width]
  );

  // Calculate reflection data for all lights
  const reflectionData = useMemo(() => {
    if (visibleMirrors.length === 0) {
      return new Map<string, LightReflectionData>();
    }
    return getReflectionData(visibleLights, visibleMirrors);
  }, [visibleLights, visibleMirrors]);

  const drawReflectionSegment = useCallback(
    (graphics: PixiGraphics, segment: RaySegment, alpha: number) => {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) return;

      const thickness = REFLECTION_THICKNESS;
      const normX = (-dy / distance) * thickness;
      const normY = (dx / distance) * thickness;

      // Draw as a thick line (rectangle)
      graphics
        .moveTo(segment.start.x + normX, segment.start.y + normY)
        .lineTo(segment.end.x + normX, segment.end.y + normY)
        .lineTo(segment.end.x - normX, segment.end.y - normY)
        .lineTo(segment.start.x - normX, segment.start.y - normY)
        .lineTo(segment.start.x + normX, segment.start.y + normY)
        .fill({ color: LIGHT_COLOR, alpha });

      // Add circles at endpoints for smooth joints
      graphics
        .circle(segment.start.x, segment.start.y, thickness)
        .fill({ color: LIGHT_COLOR, alpha });
      graphics.circle(segment.end.x, segment.end.y, thickness).fill({ color: LIGHT_COLOR, alpha });
    },
    []
  );

  const drawLineSegment = useCallback(
    (graphics: PixiGraphics, segment: RaySegment, thickness: number, alpha: number) => {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) {
        graphics
          .circle(segment.start.x, segment.start.y, thickness)
          .fill({ color: LIGHT_COLOR, alpha });
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

      graphics
        .circle(segment.start.x, segment.start.y, thickness)
        .fill({ color: LIGHT_COLOR, alpha });
      graphics.circle(segment.end.x, segment.end.y, thickness).fill({ color: LIGHT_COLOR, alpha });
    },
    []
  );

  const drawLights = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      if (!visibleLights.length) {
        return;
      }

      for (const light of visibleLights) {
        const alpha = light.intensity ?? 1;
        const lightReflectionData = reflectionData.get(light.id);
        const hasReflections = lightReflectionData?.hasReflections ?? false;

        if (light.type === "radial") {
          graphics.circle(light.x, light.y, light.radius).fill({ color: LIGHT_COLOR, alpha });
          // Draw all reflected path segments (the direct circle already covers the source area)
          if (hasReflections && lightReflectionData) {
            for (const segment of lightReflectionData.allSegments) {
              drawReflectionSegment(graphics, segment, alpha * 0.8);
            }
          }
        } else if (light.type === "conic") {
          const baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
          const halfCone = ((light.coneAngle ?? 0) * Math.PI) / 360;
          const startAngle = baseAngle - halfCone;
          const endAngle = baseAngle + halfCone;

          graphics
            .moveTo(light.x, light.y)
            .arc(light.x, light.y, light.radius, startAngle, endAngle)
            .lineTo(light.x, light.y)
            .fill({ color: LIGHT_COLOR, alpha });

          // Draw reflected segments for conic lights
          if (hasReflections && lightReflectionData) {
            for (const segment of lightReflectionData.allSegments) {
              drawReflectionSegment(graphics, segment, alpha * 0.8);
            }
          }
        } else {
          // Line light
          const thickness = Math.max(light.radius ?? 1, 1);

          if (hasReflections && lightReflectionData) {
            // For line lights with reflections, draw the entire traced path
            for (const segment of lightReflectionData.allSegments) {
              drawLineSegment(graphics, segment, thickness, alpha);
            }
          } else {
            // No reflections - draw direct line from source to target
            const dx = light.targetX - light.x;
            const dy = light.targetY - light.y;
            const distance = Math.hypot(dx, dy);

            if (!distance) {
              graphics.circle(light.x, light.y, thickness).fill({ color: LIGHT_COLOR, alpha });
              continue;
            }

            const normX = (-dy / distance) * thickness;
            const normY = (dx / distance) * thickness;

            graphics
              .moveTo(light.x + normX, light.y + normY)
              .lineTo(light.targetX + normX, light.targetY + normY)
              .lineTo(light.targetX - normX, light.targetY - normY)
              .lineTo(light.x - normX, light.y - normY)
              .lineTo(light.x + normX, light.y + normY)
              .fill({ color: LIGHT_COLOR, alpha });

            graphics.circle(light.x, light.y, thickness).fill({ color: LIGHT_COLOR, alpha });
            graphics
              .circle(light.targetX, light.targetY, thickness)
              .fill({ color: LIGHT_COLOR, alpha });
          }
        }
      }
    },
    [visibleLights, reflectionData, drawReflectionSegment, drawLineSegment]
  );

  useEffect(() => {
    const darkness = darknessRef.current;
    const mask = lightsRef.current;

    if (!darkness || !mask) {
      return;
    }

    darkness.setMask({
      mask,
      inverse: true,
    });

    return () => {
      darkness.setMask({ mask: null, inverse: false });
    };
  }, []);

  return (
    <pixiContainer>
      <pixiGraphics ref={darknessRef} draw={drawDarkness} eventMode="none" />
      <pixiGraphics ref={lightsRef} draw={drawLights} filters={[blurFilter]} eventMode="none" />
    </pixiContainer>
  );
}

export default LightingLayer;
