import type { EffectInstance } from "@shared/effects";

import { PixiControlHandle } from "@/components/atoms/PixiControlHandle";
import {
  drawCenterBroken,
  drawCenterOk,
  drawRimBroken,
  drawRimOk,
  isBrokenStatus,
  rimPosition,
} from "@/components/organisms/EffectControls/helpers";
import type { EffectHandlePointerHandlers } from "@/components/organisms/EffectControls/types";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";

interface EffectHandleSetProps extends EffectHandlePointerHandlers {
  effect: EffectInstance;
}

export function EffectHandleSet({
  effect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}: EffectHandleSetProps) {
  const status = useEffectRuntimeStore((state) => state.statuses[effect.id]);
  const broken = isBrokenStatus(status);
  const rim = rimPosition(effect);
  const shared = { onPointerMove, onPointerUp, onPointerOver, onPointerOut };

  return (
    <>
      <PixiControlHandle
        x={effect.x}
        y={effect.y}
        draw={broken ? drawCenterBroken : drawCenterOk}
        cursor="grab"
        onPointerDown={(event) => onPointerDown(event, effect, "center")}
        {...shared}
      />
      <PixiControlHandle
        x={rim.x}
        y={rim.y}
        draw={broken ? drawRimBroken : drawRimOk}
        cursor="grab"
        onPointerDown={(event) => onPointerDown(event, effect, "rim")}
        {...shared}
      />
    </>
  );
}
