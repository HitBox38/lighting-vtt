import { Fragment } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";

import { EffectHandleSet } from "@/components/organisms/EffectControls/components/EffectHandleSet";
import {
  EFFECT_HIGHLIGHT_STROKE_WIDTH,
  EFFECT_LINK_COLOR,
  rimPosition,
} from "@/components/organisms/EffectControls/helpers";
import { useEffectDrag } from "@/components/organisms/EffectControls/hooks/useEffectDrag";
import type { EffectControlsProps } from "@/components/organisms/EffectControls/types";
import { drawDashedLink } from "@/lib/pixiControls/helpers";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function EffectControls({ isGM, onOpenContextMenu, onCloseContextMenu }: EffectControlsProps) {
  const effects = useLightStore((state) => state.effects);
  const hoveredEffectId = useLightStore((state) => state.hoveredEffectId);
  const setHoveredEffectId = useLightStore((state) => state.setHoveredEffectId);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useEffectDrag({
    isGM,
    onOpenContextMenu,
    onCloseContextMenu,
  });

  if (!isGM || effects.length === 0) {
    return null;
  }

  return (
    <>
      {effects.map((effect) => (
        <Fragment key={`${effect.id}-handles`}>
          <pixiGraphics
            draw={(graphics: PixiGraphics) => {
              graphics.clear();
              const rim = rimPosition(effect);
              drawDashedLink(graphics, { x: effect.x, y: effect.y }, rim, EFFECT_LINK_COLOR);
              if (effect.id === hoveredEffectId) {
                graphics.setStrokeStyle({
                  width: EFFECT_HIGHLIGHT_STROKE_WIDTH,
                  color: EFFECT_LINK_COLOR,
                  alpha: 0.9,
                });
                graphics.circle(effect.x, effect.y, effect.radius + EFFECT_HIGHLIGHT_STROKE_WIDTH);
                graphics.stroke();
              }
            }}
            eventMode="none"
          />
          <EffectHandleSet
            effect={effect}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={() => setHoveredEffectId(effect.id)}
            onPointerOut={() => setHoveredEffectId(null)}
          />
        </Fragment>
      ))}
    </>
  );
}
