import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";
import type { Mirror, MirrorUpdate } from "@shared/index";
import type { MirrorContextMenuState } from "@/components/MirrorContextMenu";

interface Props {
  isGM: boolean;
  onOpenContextMenu: (state: MirrorContextMenuState) => void;
  onCloseContextMenu: () => void;
}

type DragHandleType = "endpoint1" | "endpoint2" | "midpoint";

interface DragState {
  pointerId: number | null;
  mirrorId: string | null;
  handle: DragHandleType | null;
  offsetX: number;
  offsetY: number;
  // For midpoint dragging, store the offset from both endpoints
  endpoint1OffsetX: number;
  endpoint1OffsetY: number;
  endpoint2OffsetX: number;
  endpoint2OffsetY: number;
  // For fixed width dragging
  fixedWidth: boolean;
  fixedLength: number;
  otherEndpointX: number;
  otherEndpointY: number;
}

const HANDLE_RADIUS = 8;
const DASH_LENGTH = 14;
const DASH_GAP = 6;

const createInitialDragState = (): DragState => ({
  pointerId: null,
  mirrorId: null,
  handle: null,
  offsetX: 0,
  offsetY: 0,
  endpoint1OffsetX: 0,
  endpoint1OffsetY: 0,
  endpoint2OffsetX: 0,
  endpoint2OffsetY: 0,
  fixedWidth: false,
  fixedLength: 0,
  otherEndpointX: 0,
  otherEndpointY: 0,
});

const drawHandle = (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS);
  graphics.fill({ color: 0x88ccff, alpha: 0.95 });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

const drawMidpointHandle = (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS * 0.8);
  graphics.fill({ color: 0xaaddff, alpha: 0.9 });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

const drawDashedLink = (
  graphics: PixiGraphics,
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  graphics.clear();

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);

  if (!distance) {
    return;
  }

  graphics.setStrokeStyle({ width: 1, color: 0x88ccff, alpha: 0.55 });

  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let d = 0; d < distance; d += DASH_LENGTH + DASH_GAP) {
    const startDistance = d;
    const endDistance = Math.min(d + DASH_LENGTH, distance);

    const sx = start.x + cos * startDistance;
    const sy = start.y + sin * startDistance;
    const ex = start.x + cos * endDistance;
    const ey = start.y + sin * endDistance;

    graphics.moveTo(sx, sy);
    graphics.lineTo(ex, ey);
  }
};

const useMirrorUpdateScheduler = (updateMirror: (id: string, partial: MirrorUpdate) => void) => {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; partial: MirrorUpdate } | null>(null);

  const flush = useCallback(() => {
    if (rafRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    pendingRef.current = null;
    updateMirror(pending.id, pending.partial);
  }, [updateMirror]);

  const schedule = useCallback(
    (id: string, partial: MirrorUpdate) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        updateMirror(id, partial);
        return;
      }

      pendingRef.current = { id, partial };

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingRef.current;
        if (!pending) {
          return;
        }
        pendingRef.current = null;
        updateMirror(pending.id, pending.partial);
      });
    },
    [updateMirror]
  );

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { schedule, flush };
};

export function MirrorControls({ isGM, onOpenContextMenu, onCloseContextMenu }: Props) {
  const mirrors = useLightStore((state) => state.mirrors);
  const updateMirror = useLightStore((state) => state.updateMirror);
  const { schedule: scheduleMirrorUpdate, flush: flushMirrorUpdate } =
    useMirrorUpdateScheduler(updateMirror);
  const dragRef = useRef<DragState>(createInitialDragState());
  const blockNextNativeContextMenu = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (nativeEvent: MouseEvent) => {
      nativeEvent.preventDefault();
    };
    window.addEventListener("contextmenu", handler, { once: true, capture: true });
  }, []);

  const getMidpoint = useCallback((mirror: Mirror) => {
    return {
      x: (mirror.x1 + mirror.x2) / 2,
      y: (mirror.y1 + mirror.y2) / 2,
    };
  }, []);

  const resetDragState = useCallback(() => {
    dragRef.current = createInitialDragState();
  }, []);

  const getPointerPosition = useCallback((event: FederatedPointerEvent) => {
    const currentTarget = event.currentTarget as PixiGraphics | null;
    const parent = currentTarget?.parent;
    if (parent) {
      return event.getLocalPosition(parent);
    }
    return { x: event.globalX, y: event.globalY };
  }, []);

  const handlePointerDown = useCallback(
    (event: FederatedPointerEvent, mirror: Mirror, handle: DragHandleType) => {
      event.stopPropagation();
      onCloseContextMenu();
      flushMirrorUpdate();

      if (event.button === 2) {
        event.preventDefault();
        const nativeEvent = event.nativeEvent as Event | undefined;
        if (nativeEvent && typeof (nativeEvent as MouseEvent).preventDefault === "function") {
          (nativeEvent as MouseEvent).preventDefault();
        }
        blockNextNativeContextMenu();
        event.stopPropagation();
        const x = event.clientX ?? event.globalX;
        const y = event.clientY ?? event.globalY;
        onOpenContextMenu({ mirrorId: mirror.id, position: { x, y } });
        return;
      }

      if (mirror.locked) {
        return;
      }

      const pointerPosition = getPointerPosition(event);
      const isFixedWidth = mirror.fixedWidth ?? false;
      let otherX = 0;
      let otherY = 0;
      let length = 0;

      if (isFixedWidth) {
        length = Math.hypot(mirror.x2 - mirror.x1, mirror.y2 - mirror.y1);
        if (handle === "endpoint1") {
          otherX = mirror.x2;
          otherY = mirror.y2;
        } else if (handle === "endpoint2") {
          otherX = mirror.x1;
          otherY = mirror.y1;
        }
      }

      if (handle === "endpoint1") {
        dragRef.current = {
          pointerId: event.pointerId,
          mirrorId: mirror.id,
          handle,
          offsetX: pointerPosition.x - mirror.x1,
          offsetY: pointerPosition.y - mirror.y1,
          endpoint1OffsetX: 0,
          endpoint1OffsetY: 0,
          endpoint2OffsetX: 0,
          endpoint2OffsetY: 0,
          fixedWidth: isFixedWidth,
          fixedLength: length,
          otherEndpointX: otherX,
          otherEndpointY: otherY,
        };
      } else if (handle === "endpoint2") {
        dragRef.current = {
          pointerId: event.pointerId,
          mirrorId: mirror.id,
          handle,
          offsetX: pointerPosition.x - mirror.x2,
          offsetY: pointerPosition.y - mirror.y2,
          endpoint1OffsetX: 0,
          endpoint1OffsetY: 0,
          endpoint2OffsetX: 0,
          endpoint2OffsetY: 0,
          fixedWidth: isFixedWidth,
          fixedLength: length,
          otherEndpointX: otherX,
          otherEndpointY: otherY,
        };
      } else {
        // Midpoint dragging
        const midpoint = getMidpoint(mirror);
        dragRef.current = {
          pointerId: event.pointerId,
          mirrorId: mirror.id,
          handle,
          offsetX: pointerPosition.x - midpoint.x,
          offsetY: pointerPosition.y - midpoint.y,
          endpoint1OffsetX: mirror.x1 - midpoint.x,
          endpoint1OffsetY: mirror.y1 - midpoint.y,
          endpoint2OffsetX: mirror.x2 - midpoint.x,
          endpoint2OffsetY: mirror.y2 - midpoint.y,
          fixedWidth: false,
          fixedLength: 0,
          otherEndpointX: 0,
          otherEndpointY: 0,
        };
      }
    },
    [
      blockNextNativeContextMenu,
      flushMirrorUpdate,
      getMidpoint,
      getPointerPosition,
      onCloseContextMenu,
      onOpenContextMenu,
    ]
  );

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      const dragState = dragRef.current;
      if (!dragState.mirrorId || dragState.pointerId !== event.pointerId || !dragState.handle) {
        return;
      }

      const pointerPosition = getPointerPosition(event);
      const nextX = pointerPosition.x - dragState.offsetX;
      const nextY = pointerPosition.y - dragState.offsetY;

      if (dragState.handle === "endpoint1") {
        let finalX = nextX;
        let finalY = nextY;

        if (dragState.fixedWidth) {
          const dx = nextX - dragState.otherEndpointX;
          const dy = nextY - dragState.otherEndpointY;
          const angle = Math.atan2(dy, dx);
          finalX = dragState.otherEndpointX + Math.cos(angle) * dragState.fixedLength;
          finalY = dragState.otherEndpointY + Math.sin(angle) * dragState.fixedLength;
        }
        scheduleMirrorUpdate(dragState.mirrorId, { x1: finalX, y1: finalY });
      } else if (dragState.handle === "endpoint2") {
        let finalX = nextX;
        let finalY = nextY;

        if (dragState.fixedWidth) {
          const dx = nextX - dragState.otherEndpointX;
          const dy = nextY - dragState.otherEndpointY;
          const angle = Math.atan2(dy, dx);
          finalX = dragState.otherEndpointX + Math.cos(angle) * dragState.fixedLength;
          finalY = dragState.otherEndpointY + Math.sin(angle) * dragState.fixedLength;
        }
        scheduleMirrorUpdate(dragState.mirrorId, { x2: finalX, y2: finalY });
      } else {
        // Midpoint - move entire mirror
        scheduleMirrorUpdate(dragState.mirrorId, {
          x1: nextX + dragState.endpoint1OffsetX,
          y1: nextY + dragState.endpoint1OffsetY,
          x2: nextX + dragState.endpoint2OffsetX,
          y2: nextY + dragState.endpoint2OffsetY,
        });
      }
    },
    [getPointerPosition, scheduleMirrorUpdate]
  );

  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      flushMirrorUpdate();
      resetDragState();
    },
    [flushMirrorUpdate, resetDragState]
  );

  const lineDrawers = useMemo(() => {
    return mirrors.map((mirror) => ({
      id: mirror.id,
      draw: (graphics: PixiGraphics) =>
        drawDashedLink(graphics, { x: mirror.x1, y: mirror.y1 }, { x: mirror.x2, y: mirror.y2 }),
    }));
  }, [mirrors]);

  if (!isGM || mirrors.length === 0) {
    return null;
  }

  return (
    <>
      {lineDrawers.map(({ id, draw }) => (
        <pixiGraphics key={`${id}-link`} draw={draw} eventMode="none" />
      ))}
      {mirrors.map((mirror) => {
        const midpoint = getMidpoint(mirror);
        return (
          <Fragment key={`${mirror.id}-handles`}>
            {/* Endpoint 1 handle */}
            <pixiGraphics
              x={mirror.x1}
              y={mirror.y1}
              draw={drawHandle}
              eventMode="static"
              cursor="grab"
              onPointerDown={(event: FederatedPointerEvent) =>
                handlePointerDown(event, mirror, "endpoint1")
              }
              onGlobalPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerUpOutside={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {/* Endpoint 2 handle */}
            <pixiGraphics
              x={mirror.x2}
              y={mirror.y2}
              draw={drawHandle}
              eventMode="static"
              cursor="grab"
              onPointerDown={(event: FederatedPointerEvent) =>
                handlePointerDown(event, mirror, "endpoint2")
              }
              onGlobalPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerUpOutside={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {/* Midpoint handle */}
            <pixiGraphics
              x={midpoint.x}
              y={midpoint.y}
              draw={drawMidpointHandle}
              eventMode="static"
              cursor="move"
              onPointerDown={(event: FederatedPointerEvent) =>
                handlePointerDown(event, mirror, "midpoint")
              }
              onGlobalPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerUpOutside={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export default MirrorControls;
