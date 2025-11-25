import { useCallback, useEffect, useMemo, useRef } from "react";
import { BlurFilter, Graphics as PixiGraphics } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";

type Props = {
  width: number;
  height: number;
  isGM?: boolean;
};

const DARKNESS_ALPHA = 0.6;
const LIGHT_COLOR = 0xffffff;
const BLUR_STRENGTH = 10;

export function LightingLayer({ width, height, isGM = true }: Props) {
  const lights = useLightStore((state) => state.lights);
  const visibleLights = useMemo(
    () => (isGM ? lights : lights.filter((light) => !light.hidden)),
    [isGM, lights]
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

  const drawLights = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();

      if (!visibleLights.length) {
        return;
      }

      for (const light of visibleLights) {
        const alpha = light.intensity ?? 1;

        if (light.type === "radial") {
          graphics.circle(light.x, light.y, light.radius).fill({ color: LIGHT_COLOR, alpha });
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
        } else {
          const dx = light.targetX - light.x;
          const dy = light.targetY - light.y;
          const distance = Math.hypot(dx, dy);
          const thickness = Math.max(light.radius ?? 1, 1);

          if (!distance) {
            graphics.circle(light.x, light.y, thickness).fill({ color: LIGHT_COLOR, alpha });
            continue;
          }

          const normX = (-dy / distance) * thickness;
          const normY = (dx / distance) * thickness;

          const startLeftX = light.x + normX;
          const startLeftY = light.y + normY;
          const startRightX = light.x - normX;
          const startRightY = light.y - normY;
          const endLeftX = light.targetX + normX;
          const endLeftY = light.targetY + normY;
          const endRightX = light.targetX - normX;
          const endRightY = light.targetY - normY;

          graphics
            .moveTo(startLeftX, startLeftY)
            .lineTo(endLeftX, endLeftY)
            .lineTo(endRightX, endRightY)
            .lineTo(startRightX, startRightY)
            .lineTo(startLeftX, startLeftY)
            .fill({ color: LIGHT_COLOR, alpha });

          graphics.circle(light.x, light.y, thickness).fill({ color: LIGHT_COLOR, alpha });
          graphics
            .circle(light.targetX, light.targetY, thickness)
            .fill({ color: LIGHT_COLOR, alpha });
        }
      }
    },
    [visibleLights]
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
