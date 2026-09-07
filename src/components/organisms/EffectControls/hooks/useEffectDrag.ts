import { useWorkshopStore } from "@/stores/workshopStore";
import { useRef } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import type { EffectInstance } from "@shared/effects";

import {
  type EffectControlsProps,
  type EffectDragHandle,
  type EffectDragState,
} from "@/components/organisms/EffectControls/types";
import { rimPosition } from "@/components/organisms/EffectControls/helpers";
import { getPointerPosition, preventNativeContextMenu } from "@/lib/pixiControls/helpers";
import { useRafUpdateScheduler } from "@/lib/pixiControls/hooks/useRafUpdateScheduler";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { clampEffectRadius } from "@shared/effects";

export function useEffectDrag({ onOpenContextMenu, onCloseContextMenu }: EffectControlsProps) {
  const updateEffect = useLightStore((state) => state.updateEffect);
  const { schedule, flush } = useRafUpdateScheduler(updateEffect);
  const dragRef = useRef<EffectDragState | null>(null);

  const handlePointerDown = (
    event: FederatedPointerEvent,
    effect: EffectInstance,
    handle: EffectDragHandle,
  ) => {
    useWorkshopStore.getState().select({ kind: "effect", id: effect.id });
    event.stopPropagation();
    onCloseContextMenu();
    flush();

    if (event.button === 2) {
      preventNativeContextMenu(event);
      event.stopPropagation();
      onOpenContextMenu({
        effectId: effect.id,
        position: { x: event.clientX ?? event.globalX, y: event.clientY ?? event.globalY },
      });
      return;
    }

    if (effect.locked) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    const base = handle === "center" ? { x: effect.x, y: effect.y } : rimPosition(effect);
    dragRef.current = {
      pointerId: event.pointerId,
      effectId: effect.id,
      handle,
      offsetX: pointerPosition.x - base.x,
      offsetY: pointerPosition.y - base.y,
      centerX: effect.x,
      centerY: effect.y,
    };
  };

  const handlePointerMove = (event: FederatedPointerEvent) => {
    const dragState = dragRef.current;
    if (!dragState?.effectId || dragState.pointerId !== event.pointerId || !dragState.handle) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    const nextX = pointerPosition.x - dragState.offsetX;
    const nextY = pointerPosition.y - dragState.offsetY;

    switch (dragState.handle) {
      case "center":
        schedule(dragState.effectId, { x: nextX, y: nextY });
        return;
      case "rim": {
        const dx = nextX - dragState.centerX;
        const dy = nextY - dragState.centerY;
        schedule(dragState.effectId, {
          radius: clampEffectRadius(Math.hypot(dx, dy)),
          rotation: Math.atan2(dy, dx),
        });
        return;
      }
      default: {
        const exhaustive: never = dragState.handle;
        return exhaustive;
      }
    }
  };

  const handlePointerUp = (event: FederatedPointerEvent) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    flush();
    dragRef.current = null;
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
