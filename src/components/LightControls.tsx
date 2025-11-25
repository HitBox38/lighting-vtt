import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";
import type { Light, LightUpdate } from "@/types/light";
import type { LightContextMenuState } from "@/components/LightContextMenu";

interface Props {
  isGM: boolean;
  onOpenContextMenu: (state: LightContextMenuState) => void;
  onCloseContextMenu: () => void;
}

type DragHandleType = "radial" | "radialRadius" | "source" | "target";

type DragState = {
  pointerId: number | null;
  lightId: string | null;
  lightType: Light["type"] | null;
  handle: DragHandleType | null;
  offsetX: number;
  offsetY: number;
  targetDeltaX: number;
  targetDeltaY: number;
  hasTarget: boolean;
  resizeRadiusWithTarget: boolean;
  sourceX: number;
  sourceY: number;
};

const HANDLE_RADIUS = 8;
const DASH_LENGTH = 14;
const DASH_GAP = 6;

const createInitialDragState = (): DragState => ({
  pointerId: null,
  lightId: null,
  lightType: null,
  handle: null,
  offsetX: 0,
  offsetY: 0,
  targetDeltaX: 0,
  targetDeltaY: 0,
  hasTarget: false,
  resizeRadiusWithTarget: false,
  sourceX: 0,
  sourceY: 0,
});

const drawHandle = (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS);
  graphics.fill({ color: 0xffffff, alpha: 0.95 });
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

  graphics.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.55 });

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

const useLightUpdateScheduler = (updateLight: (id: string, partial: LightUpdate) => void) => {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; partial: LightUpdate } | null>(null);

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
    updateLight(pending.id, pending.partial);
  }, [updateLight]);

  const schedule = useCallback(
    (id: string, partial: LightUpdate) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        updateLight(id, partial);
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
        updateLight(pending.id, pending.partial);
      });
    },
    [updateLight]
  );

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { schedule, flush };
};

export function LightControls({ isGM, onOpenContextMenu, onCloseContextMenu }: Props) {
  const lights = useLightStore((state) => state.lights);
  const updateLight = useLightStore((state) => state.updateLight);
  const setHoveredLightId = useLightStore((state) => state.setHoveredLightId);
  const { schedule: scheduleLightUpdate, flush: flushLightUpdate } =
    useLightUpdateScheduler(updateLight);
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
  const [radialHandleAngles, setRadialHandleAngles] = useState<Record<string, number>>({});
  const updateRadialHandleAngle = useCallback((lightId: string, angle: number) => {
    setRadialHandleAngles((prev) => {
      if (prev[lightId] === angle) {
        return prev;
      }
      return { ...prev, [lightId]: angle };
    });
  }, []);
  const getRadialHandleAngle = useCallback(
    (lightId: string) => radialHandleAngles[lightId] ?? 0,
    [radialHandleAngles]
  );

  const getRadialHandlePosition = useCallback(
    (light: Light) => {
      if (light.type !== "radial") {
        return { x: light.x, y: light.y };
      }
      const angle = getRadialHandleAngle(light.id);
      return {
        x: light.x + Math.cos(angle) * light.radius,
        y: light.y + Math.sin(angle) * light.radius,
      };
    },
    [getRadialHandleAngle]
  );

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
    (event: FederatedPointerEvent, light: Light, handle: DragHandleType) => {
      event.stopPropagation();
      onCloseContextMenu();
      flushLightUpdate();

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
        onOpenContextMenu({ lightId: light.id, position: { x, y } });
        return;
      }

      if (light.locked) {
        return;
      }

      const pointerPosition = getPointerPosition(event);

      let baseX = light.x;
      let baseY = light.y;

      if (handle === "target" && (light.type === "conic" || light.type === "line")) {
        baseX = light.targetX;
        baseY = light.targetY;
      } else if (handle === "radialRadius" && light.type === "radial") {
        const handlePosition = getRadialHandlePosition(light);
        baseX = handlePosition.x;
        baseY = handlePosition.y;
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
      };
    },
    [
      blockNextNativeContextMenu,
      flushLightUpdate,
      getPointerPosition,
      getRadialHandlePosition,
      onCloseContextMenu,
      onOpenContextMenu,
    ]
  );

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      const dragState = dragRef.current;
      if (!dragState.lightId || dragState.pointerId !== event.pointerId || !dragState.handle) {
        return;
      }

      const pointerPosition = getPointerPosition(event);
      const nextX = pointerPosition.x - dragState.offsetX;
      const nextY = pointerPosition.y - dragState.offsetY;

      if (dragState.handle === "radial") {
        scheduleLightUpdate(dragState.lightId, { x: nextX, y: nextY });
        return;
      }

      if (dragState.handle === "radialRadius") {
        const dx = nextX - dragState.sourceX;
        const dy = nextY - dragState.sourceY;
        const nextRadius = Math.max(Math.hypot(dx, dy), 1);
        const angle = Math.atan2(dy, dx);
        updateRadialHandleAngle(dragState.lightId, angle);
        scheduleLightUpdate(dragState.lightId, { radius: nextRadius });
        return;
      }

      if (dragState.handle === "source") {
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
          scheduleLightUpdate(dragState.lightId, partial);
          return;
        }

        scheduleLightUpdate(dragState.lightId, { x: nextX, y: nextY });
        return;
      }

      const partial: LightUpdate =
        dragState.lightType === "line"
          ? {
              type: "line",
              targetX: nextX,
              targetY: nextY,
            }
          : {
              type: "conic",
              targetX: nextX,
              targetY: nextY,
            };
      if (dragState.resizeRadiusWithTarget) {
        const dx = nextX - dragState.sourceX;
        const dy = nextY - dragState.sourceY;
        const nextRadius = Math.max(Math.hypot(dx, dy), 1);
        scheduleLightUpdate(dragState.lightId, {
          ...partial,
          radius: nextRadius,
        });
        return;
      }

      scheduleLightUpdate(dragState.lightId, partial);
    },
    [getPointerPosition, scheduleLightUpdate, updateRadialHandleAngle]
  );

  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      flushLightUpdate();
      resetDragState();
    },
    [flushLightUpdate, resetDragState]
  );

  const lineDrawers = useMemo(() => {
    return lights.map((light) => {
      if (light.type === "conic" || light.type === "line") {
        return {
          id: light.id,
          draw: (graphics: PixiGraphics) =>
            drawDashedLink(
              graphics,
              { x: light.x, y: light.y },
              { x: light.targetX, y: light.targetY }
            ),
        };
      }

      const handlePosition = getRadialHandlePosition(light);
      return {
        id: light.id,
        draw: (graphics: PixiGraphics) =>
          drawDashedLink(graphics, { x: light.x, y: light.y }, handlePosition),
      };
    });
  }, [getRadialHandlePosition, lights]);

  if (!isGM || lights.length === 0) {
    return null;
  }

  return (
    <>
      {lineDrawers.map(({ id, draw }) => (
        <pixiGraphics key={`${id}-link`} draw={draw} eventMode="none" />
      ))}
      {lights.map((light) => {
        if (light.type === "radial") {
          const radiusHandlePosition = getRadialHandlePosition(light);
          return (
            <Fragment key={`${light.id}-radial-handles`}>
              <pixiGraphics
                x={light.x}
                y={light.y}
                draw={drawHandle}
                eventMode="static"
                cursor="grab"
                onPointerDown={(event: FederatedPointerEvent) =>
                  handlePointerDown(event, light, "radial")
                }
                onGlobalPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerUpOutside={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerOver={() => setHoveredLightId(light.id)}
                onPointerOut={() => setHoveredLightId(null)}
              />
              <pixiGraphics
                x={radiusHandlePosition.x}
                y={radiusHandlePosition.y}
                draw={drawHandle}
                eventMode="static"
                cursor="grab"
                onPointerDown={(event: FederatedPointerEvent) =>
                  handlePointerDown(event, light, "radialRadius")
                }
                onGlobalPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerUpOutside={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerOver={() => setHoveredLightId(light.id)}
                onPointerOut={() => setHoveredLightId(null)}
              />
            </Fragment>
          );
        }

        return (
          <Fragment key={`${light.id}-handles`}>
            <pixiGraphics
              x={light.x}
              y={light.y}
              draw={drawHandle}
              eventMode="static"
              cursor="grab"
              onPointerDown={(event: FederatedPointerEvent) =>
                handlePointerDown(event, light, "source")
              }
              onGlobalPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerUpOutside={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerOver={() => setHoveredLightId(light.id)}
              onPointerOut={() => setHoveredLightId(null)}
            />
            <pixiGraphics
              x={light.targetX}
              y={light.targetY}
              draw={drawHandle}
              eventMode="static"
              cursor="grab"
              onPointerDown={(event: FederatedPointerEvent) =>
                handlePointerDown(event, light, "target")
              }
              onGlobalPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerUpOutside={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerOver={() => setHoveredLightId(light.id)}
              onPointerOut={() => setHoveredLightId(null)}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export default LightControls;
