import { useRef } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import type { Mirror } from "@shared/index";

import {
  getMirrorMidpoint,
  type MirrorControlsProps,
  type MirrorDragHandleType,
  type MirrorDragState,
} from "@/components/organisms/MirrorControls/types";
import { getPointerPosition, preventNativeContextMenu } from "@/lib/pixiControls/helpers";
import { useRafUpdateScheduler } from "@/lib/pixiControls/hooks/useRafUpdateScheduler";
import { useLightStore } from "@/stores/lightStore/lightStore";

export function useMirrorDrag({ onOpenContextMenu, onCloseContextMenu }: MirrorControlsProps) {
  const updateMirror = useLightStore((state) => state.updateMirror);
  const { schedule, flush } = useRafUpdateScheduler(updateMirror);
  const dragRef = useRef<MirrorDragState | null>(null);

  const handlePointerDown = (
    event: FederatedPointerEvent,
    mirror: Mirror,
    handle: MirrorDragHandleType,
  ) => {
    event.stopPropagation();
    onCloseContextMenu();
    flush();

    if (event.button === 2) {
      preventNativeContextMenu(event);
      event.stopPropagation();
      onOpenContextMenu({
        mirrorId: mirror.id,
        position: { x: event.clientX ?? event.globalX, y: event.clientY ?? event.globalY },
      });
      return;
    }

    if (mirror.locked) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    const isFixedWidth = mirror.fixedWidth ?? false;
    const length = isFixedWidth ? Math.hypot(mirror.x2 - mirror.x1, mirror.y2 - mirror.y1) : 0;
    const otherX = handle === "endpoint1" ? mirror.x2 : handle === "endpoint2" ? mirror.x1 : 0;
    const otherY = handle === "endpoint1" ? mirror.y2 : handle === "endpoint2" ? mirror.y1 : 0;
    const midpoint = getMirrorMidpoint(mirror);
    const origin =
      handle === "endpoint1"
        ? { x: mirror.x1, y: mirror.y1 }
        : handle === "endpoint2"
          ? { x: mirror.x2, y: mirror.y2 }
          : midpoint;

    dragRef.current = {
      pointerId: event.pointerId,
      mirrorId: mirror.id,
      handle,
      offsetX: pointerPosition.x - origin.x,
      offsetY: pointerPosition.y - origin.y,
      endpoint1OffsetX: handle === "midpoint" ? mirror.x1 - midpoint.x : 0,
      endpoint1OffsetY: handle === "midpoint" ? mirror.y1 - midpoint.y : 0,
      endpoint2OffsetX: handle === "midpoint" ? mirror.x2 - midpoint.x : 0,
      endpoint2OffsetY: handle === "midpoint" ? mirror.y2 - midpoint.y : 0,
      fixedWidth: isFixedWidth && handle !== "midpoint",
      fixedLength: length,
      otherEndpointX: otherX,
      otherEndpointY: otherY,
    };
  };

  const handlePointerMove = (event: FederatedPointerEvent) => {
    const dragState = dragRef.current;
    if (!dragState?.mirrorId || dragState.pointerId !== event.pointerId || !dragState.handle) {
      return;
    }

    const pointerPosition = getPointerPosition(event);
    let nextX = pointerPosition.x - dragState.offsetX;
    let nextY = pointerPosition.y - dragState.offsetY;

    if (dragState.fixedWidth && (dragState.handle === "endpoint1" || dragState.handle === "endpoint2")) {
      const dx = nextX - dragState.otherEndpointX;
      const dy = nextY - dragState.otherEndpointY;
      const angle = Math.atan2(dy, dx);
      nextX = dragState.otherEndpointX + Math.cos(angle) * dragState.fixedLength;
      nextY = dragState.otherEndpointY + Math.sin(angle) * dragState.fixedLength;
    }

    switch (dragState.handle) {
      case "endpoint1":
        schedule(dragState.mirrorId, { x1: nextX, y1: nextY });
        return;
      case "endpoint2":
        schedule(dragState.mirrorId, { x2: nextX, y2: nextY });
        return;
      case "midpoint":
        schedule(dragState.mirrorId, {
          x1: nextX + dragState.endpoint1OffsetX,
          y1: nextY + dragState.endpoint1OffsetY,
          x2: nextX + dragState.endpoint2OffsetX,
          y2: nextY + dragState.endpoint2OffsetY,
        });
        return;
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

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
