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
        } else {
          const baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
          const halfCone = ((light.coneAngle ?? 0) * Math.PI) / 360;
          const startAngle = baseAngle - halfCone;
          const endAngle = baseAngle + halfCone;

          graphics
            .moveTo(light.x, light.y)
            .arc(light.x, light.y, light.radius, startAngle, endAngle)
            .lineTo(light.x, light.y)
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
