import { useRef, useState } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import type { Light, LightUpdate } from "@shared/index";

import {
  type DragHandleType,
  type LightControlsProps,
  type LightDragState,
} from "@/components/organisms/LightControls/types";
import {
  getConicAngleHandlePosition,
  getRadialHandlePosition,
} from "@/components/organisms/LightControls/helpers";
import { getPointerPosition, preventNativeContextMenu } from "@/lib/pixiControls/helpers";
import { useRafUpdateScheduler } from "@/lib/pixiControls/hooks/useRafUpdateScheduler";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function useLightDrag({ onOpenContextMenu, onCloseContextMenu }: LightControlsProps) {
  const updateLight = useLightStore((state) => state.updateLight);
  const { schedule, flush } = useRafUpdateScheduler(updateLight);
  const dragRef = useRef<LightDragState | null>(null);
  const [radialHandleAngles, setRadialHandleAngles] = useState<Record<string, number>>({});

  const getRadialAngle = (lightId: string) => radialHandleAngles[lightId] ?? 0;

  const handlePointerDown = (
    event: FederatedPointerEvent,
    light: Light,
    handle: DragHandleType,
  ) => {
    event.stopPropagation();
    onCloseContextMenu();
    flush();

    if (event.button === 2) {
      preventNativeContextMenu(event);
      event.stopPropagation();
      onOpenContextMenu({
        lightId: light.id,
        position: { x: event.clientX ?? event.globalX, y: event.clientY ?? event.globalY },
      });
      return;
    }

    if (light.locked) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    let baseX = light.x;
    let baseY = light.y;
    let baseAngle = 0;

    if (handle === "target" && (light.type === "conic" || light.type === "line")) {
      baseX = light.targetX;
      baseY = light.targetY;
    } else if (handle === "radialRadius" && light.type === "radial") {
      const handlePosition = getRadialHandlePosition(light, getRadialAngle(light.id));
      baseX = handlePosition.x;
      baseY = handlePosition.y;
    } else if (handle === "conicAngle" && light.type === "conic") {
      const handlePosition = getConicAngleHandlePosition(light);
      baseX = handlePosition.x;
      baseY = handlePosition.y;
      baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
    }

    dragRef.current = {
      pointerId: event.pointerId,
      lightId: light.id,
      lightType: light.type,
      handle,
      offsetX: pointerPosition.x - baseX,
      offsetY: pointerPosition.y - baseY,
      targetDeltaX: light.type === "conic" || light.type === "line" ? light.targetX - light.x : 0,
      targetDeltaY: light.type === "conic" || light.type === "line" ? light.targetY - light.y : 0,
      hasTarget: light.type === "conic" || light.type === "line",
      resizeRadiusWithTarget: light.type === "conic",
      sourceX: light.x,
      sourceY: light.y,
      baseAngle,
    };
  };

  const handlePointerMove = (event: FederatedPointerEvent) => {
    const dragState = dragRef.current;
    if (!dragState?.lightId || dragState.pointerId !== event.pointerId || !dragState.handle) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    const nextX = pointerPosition.x - dragState.offsetX;
    const nextY = pointerPosition.y - dragState.offsetY;

    switch (dragState.handle) {
      case "radial":
        schedule(dragState.lightId, { x: nextX, y: nextY });
        return;
      case "radialRadius": {
        const dx = nextX - dragState.sourceX;
        const dy = nextY - dragState.sourceY;
        setRadialHandleAngles((prev) => ({ ...prev, [dragState.lightId!]: Math.atan2(dy, dx) }));
        schedule(dragState.lightId, { radius: Math.max(Math.hypot(dx, dy), 1) });
        return;
      }
      case "conicAngle": {
        const currentAngle = Math.atan2(nextY - dragState.sourceY, nextX - dragState.sourceX);
        let diff = currentAngle - dragState.baseAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        schedule(dragState.lightId, {
          coneAngle: Math.max(1, Math.min(360, Math.abs(diff) * 2 * (180 / Math.PI))),
        });
        return;
      }
      case "source": {
        if (dragState.hasTarget) {
          const partial: LightUpdate =
            dragState.lightType === "line"
              ? {
                  type: "line",
                  x: nextX,
                  y: nextY,
                  targetX: nextX + dragState.targetDeltaX,
                  targetY: nextY + dragState.targetDeltaY,
                }
              : {
                  type: "conic",
                  x: nextX,
                  y: nextY,
                  targetX: nextX + dragState.targetDeltaX,
                  targetY: nextY + dragState.targetDeltaY,
                };
          schedule(dragState.lightId, partial);
          return;
        }
        schedule(dragState.lightId, { x: nextX, y: nextY });
        return;
      }
      case "target": {
        const partial: LightUpdate =
          dragState.lightType === "line"
            ? { type: "line", targetX: nextX, targetY: nextY }
            : { type: "conic", targetX: nextX, targetY: nextY };
        if (dragState.resizeRadiusWithTarget) {
          schedule(dragState.lightId, {
            ...partial,
            radius: Math.max(Math.hypot(nextX - dragState.sourceX, nextY - dragState.sourceY), 1),
          });
          return;
        }
        schedule(dragState.lightId, partial);
        return;
      }
      default: {
        const _exhaustive: never = dragState.handle;
        return _exhaustive;
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

  return { handlePointerDown, handlePointerMove, handlePointerUp, getRadialAngle };
}
