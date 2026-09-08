import { useEffect, useMemo, useRef } from "react";
import { BlurFilter, Graphics as PixiGraphics } from "pixi.js";

import { drawEffects } from "@/components/organisms/LightingLayer/drawEffects";
import { drawHighlight } from "@/components/organisms/LightingLayer/drawHighlight";
import { drawLights } from "@/components/organisms/LightingLayer/drawLights";
import { BLUR_STRENGTH, DARKNESS_ALPHA } from "@/components/organisms/LightingLayer/constants";
import { useScriptEffects } from "@/components/organisms/LightingLayer/hooks/useScriptEffects";
import { useEffectDefinitions } from "@/lib/effects/hooks/useEffectDefinitions";
import { getReflectionData } from "@/lib/reflection/getReflectionData";
import { useLightStore } from "@/stores/lightStore/lightStore";

interface Props {
  width: number;
  height: number;
  isGM?: boolean;
  remotePlayerId?: string | null;
}

export function LightingLayer({ width, height, isGM = true, remotePlayerId }: Props) {
  const lights = useLightStore((state) => state.lights);
  const mirrors = useLightStore((state) => state.mirrors);
  const effects = useLightStore((state) => state.effects);
  const sceneId = useLightStore((state) => state.sceneId);
  const hoveredLightId = useLightStore((state) => state.hoveredLightId);
  const darknessRef = useRef<PixiGraphics | null>(null);
  const lightsRef = useRef<PixiGraphics | null>(null);
  const blurFilter = useMemo(() => {
    const filter = new BlurFilter({ strength: BLUR_STRENGTH, quality: 4 });
    filter.repeatEdgePixels = true;
    return filter;
  }, []);

  useEffect(() => {
    return () => {
      blurFilter.destroy();
    };
  }, [blurFilter]);

  const visibleLights = useMemo(
    () => (isGM ? lights : lights.filter((light) => !light.hidden)),
    [isGM, lights],
  );
  const visibleMirrors = useMemo(
    () => (isGM ? mirrors : mirrors.filter((mirror) => !mirror.hidden)),
    [isGM, mirrors],
  );
  const visibleEffects = useMemo(
    () => (isGM ? effects : effects.filter((effect) => !effect.hidden)),
    [isGM, effects],
  );
  const { definitions: effectDefinitions } = useEffectDefinitions(visibleEffects, sceneId, remotePlayerId);
  const scriptGeometry = useScriptEffects(
    visibleEffects,
    effectDefinitions,
    visibleLights,
    visibleMirrors,
  );
  const reflectionData =
    visibleMirrors.length === 0 ? new Map() : getReflectionData(visibleLights, visibleMirrors);
  const hoveredLight = hoveredLightId
    ? (visibleLights.find((light) => light.id === hoveredLightId) ?? null)
    : null;

  useEffect(() => {
    const darkness = darknessRef.current;
    const mask = lightsRef.current;
    if (!darkness || !mask) {
      return;
    }
    darkness.setMask({ mask, inverse: true });
    return () => {
      darkness.setMask({ mask: null, inverse: false });
    };
  }, []);

  const drawDarkness = (graphics: PixiGraphics) => {
    graphics.clear();
    if (width <= 0 || height <= 0) {
      return;
    }
    graphics.rect(0, 0, width, height).fill({ color: 0x000000, alpha: DARKNESS_ALPHA });
  };

  const drawMask = (graphics: PixiGraphics) => {
    graphics.clear();
    drawEffects(graphics, visibleEffects, effectDefinitions, scriptGeometry);
    drawLights(graphics, visibleLights, reflectionData);
  };

  return (
    <pixiContainer>
      <pixiGraphics ref={darknessRef} draw={drawDarkness} eventMode="none" />
      <pixiGraphics ref={lightsRef} draw={drawMask} filters={[blurFilter]} eventMode="none" />
      <pixiGraphics
        draw={(graphics: PixiGraphics) => drawHighlight(graphics, hoveredLight, isGM, reflectionData)}
        eventMode="none"
      />
    </pixiContainer>
  );
}
