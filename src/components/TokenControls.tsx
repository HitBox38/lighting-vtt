import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

import { useTokenStore } from "@/stores/tokenStore";
import type { TokenInstanceUpdate } from "@shared/index";
import type { TokenContextMenuState } from "@/components/TokenContextMenu";

interface Props {
  isGM: boolean;
  sizeEditTokenId: string | null;
  onCloseSizeEdit: () => void;
  onOpenContextMenu: (state: TokenContextMenuState) => void;
  onCloseContextMenu: () => void;
}

type DragState = {
  pointerId: number | null;
  tokenId: string | null;
  offsetX: number;
  offsetY: number;
};

type SizeDragState = {
  pointerId: number | null;
  tokenId: string | null;
  offsetX: number;
  offsetY: number;
  sourceX: number;
  sourceY: number;
};

const DEFAULT_TOKEN_RADIUS = 22;
const TOKEN_HIT_PADDING = 2;
const TOKEN_MIN_SIZE = 12;
const TOKEN_MAX_SIZE = 96;
const HANDLE_RADIUS = 8;
const DASH_LENGTH = 14;
const DASH_GAP = 6;

const createInitialDragState = (): DragState => ({
  pointerId: null,
  tokenId: null,
  offsetX: 0,
  offsetY: 0,
});

const createInitialSizeDragState = (): SizeDragState => ({
  pointerId: null,
  tokenId: null,
  offsetX: 0,
  offsetY: 0,
  sourceX: 0,
  sourceY: 0,
});

const drawHitTarget = (graphics: PixiGraphics, radius: number) => {
  graphics.clear();
  graphics.circle(0, 0, radius);
  graphics.fill({ color: 0xffffff, alpha: 0.001 });
};

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

const useTokenUpdateScheduler = (updateTokenInstance: (id: string, partial: TokenInstanceUpdate) => void) => {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; partial: TokenInstanceUpdate } | null>(null);

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
    updateTokenInstance(pending.id, pending.partial);
  }, [updateTokenInstance]);

  const schedule = useCallback(
    (id: string, partial: TokenInstanceUpdate) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        updateTokenInstance(id, partial);
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
        updateTokenInstance(pending.id, pending.partial);
      });
    },
    [updateTokenInstance]
  );

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { schedule, flush };
};

export function TokenControls({
  isGM,
  sizeEditTokenId,
  onCloseSizeEdit,
  onOpenContextMenu,
  onCloseContextMenu,
}: Props) {
  const tokens = useTokenStore((state) => state.tokens);
  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);
  const { schedule, flush } = useTokenUpdateScheduler(updateTokenInstance);
  const dragRef = useRef<DragState>(createInitialDragState());
  const sizeDragRef = useRef<SizeDragState>(createInitialSizeDragState());
  const [sizeHandleAngles, setSizeHandleAngles] = useState<Record<string, number>>({});

  const blockNextNativeContextMenu = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (nativeEvent: MouseEvent) => {
      nativeEvent.preventDefault();
    };
    window.addEventListener("contextmenu", handler, { once: true, capture: true });
  }, []);

  const resetDragState = useCallback(() => {
    dragRef.current = createInitialDragState();
  }, []);

  const resetSizeDragState = useCallback(() => {
    sizeDragRef.current = createInitialSizeDragState();
  }, []);

  const updateSizeHandleAngle = useCallback((tokenId: string, angle: number) => {
    setSizeHandleAngles((prev) => {
      if (prev[tokenId] === angle) {
        return prev;
      }
      return { ...prev, [tokenId]: angle };
    });
  }, []);

  const getSizeHandleAngle = useCallback(
    (tokenId: string) => sizeHandleAngles[tokenId] ?? 0,
    [sizeHandleAngles]
  );

  const getSizeHandlePosition = useCallback(
    (token: (typeof tokens)[number]) => {
      const angle = getSizeHandleAngle(token.id);
      const radius = token.size ?? DEFAULT_TOKEN_RADIUS;
      return {
        x: token.x + Math.cos(angle) * radius,
        y: token.y + Math.sin(angle) * radius,
      };
    },
    [getSizeHandleAngle]
  );

  const getPointerPosition = useCallback((event: FederatedPointerEvent) => {
    const currentTarget = event.currentTarget as PixiGraphics | null;
    const parent = currentTarget?.parent;
    if (parent) {
      return event.getLocalPosition(parent);
    }
    return { x: event.globalX, y: event.globalY };
  }, []);

  const handlePointerDown = useCallback(
    (event: FederatedPointerEvent, tokenId: string, x: number, y: number) => {
      event.stopPropagation();
      onCloseContextMenu();
      flush();

      if (event.button === 2) {
        event.preventDefault();
        const nativeEvent = event.nativeEvent as Event | undefined;
        if (nativeEvent && typeof (nativeEvent as MouseEvent).preventDefault === "function") {
          (nativeEvent as MouseEvent).preventDefault();
        }
        blockNextNativeContextMenu();
        const menuX = event.clientX ?? event.globalX;
        const menuY = event.clientY ?? event.globalY;
        onOpenContextMenu({ tokenId, position: { x: menuX, y: menuY } });
        return;
      }

      const pointerPosition = getPointerPosition(event);
      dragRef.current = {
        pointerId: event.pointerId,
        tokenId,
        offsetX: pointerPosition.x - x,
        offsetY: pointerPosition.y - y,
      };
    },
    [blockNextNativeContextMenu, flush, getPointerPosition, onCloseContextMenu, onOpenContextMenu]
  );

  const handlePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      const drag = dragRef.current;
      if (!drag.tokenId || drag.pointerId !== event.pointerId) {
        return;
      }
      const pointerPosition = getPointerPosition(event);
      schedule(drag.tokenId, {
        x: pointerPosition.x - drag.offsetX,
        y: pointerPosition.y - drag.offsetY,
      });
    },
    [getPointerPosition, schedule]
  );

  const handlePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      flush();
      resetDragState();
    },
    [flush, resetDragState]
  );

  const handleSizePointerDown = useCallback(
    (event: FederatedPointerEvent, token: (typeof tokens)[number]) => {
      event.stopPropagation();
      onCloseContextMenu();
      flush();
      const pointerPosition = getPointerPosition(event);
      const handlePosition = getSizeHandlePosition(token);
      sizeDragRef.current = {
        pointerId: event.pointerId,
        tokenId: token.id,
        offsetX: pointerPosition.x - handlePosition.x,
        offsetY: pointerPosition.y - handlePosition.y,
        sourceX: token.x,
        sourceY: token.y,
      };
    },
    [flush, getPointerPosition, getSizeHandlePosition, onCloseContextMenu]
  );

  const handleSizePointerMove = useCallback(
    (event: FederatedPointerEvent) => {
      const drag = sizeDragRef.current;
      if (!drag.tokenId || drag.pointerId !== event.pointerId) {
        return;
      }
      const pointerPosition = getPointerPosition(event);
      const nextX = pointerPosition.x - drag.offsetX;
      const nextY = pointerPosition.y - drag.offsetY;
      const dx = nextX - drag.sourceX;
      const dy = nextY - drag.sourceY;
      const nextSize = Math.min(TOKEN_MAX_SIZE, Math.max(TOKEN_MIN_SIZE, Math.hypot(dx, dy)));
      const angle = Math.atan2(dy, dx);
      updateSizeHandleAngle(drag.tokenId, angle);
      schedule(drag.tokenId, { size: nextSize });
    },
    [getPointerPosition, schedule, updateSizeHandleAngle]
  );

  const handleSizePointerUp = useCallback(
    (event: FederatedPointerEvent) => {
      if (sizeDragRef.current.pointerId !== event.pointerId) {
        return;
      }
      flush();
      resetSizeDragState();
    },
    [flush, resetSizeDragState]
  );

  useEffect(() => {
    if (!sizeEditTokenId) {
      return;
    }
    const tokenExists = tokens.some((token) => token.id === sizeEditTokenId);
    if (!tokenExists) {
      onCloseSizeEdit();
    }
  }, [onCloseSizeEdit, sizeEditTokenId, tokens]);

  const sizeLinkDrawers = useMemo(() => {
    if (!sizeEditTokenId) {
      return [];
    }
    return tokens
      .filter((token) => token.id === sizeEditTokenId)
      .map((token) => ({
        id: token.id,
        draw: (graphics: PixiGraphics) =>
          drawDashedLink(graphics, { x: token.x, y: token.y }, getSizeHandlePosition(token)),
      }));
  }, [getSizeHandlePosition, sizeEditTokenId, tokens]);

  if (!isGM || tokens.length === 0) {
    return null;
  }

  return (
    <>
      {sizeLinkDrawers.map(({ id, draw }) => (
        <pixiGraphics key={`${id}-size-link`} draw={draw} eventMode="none" />
      ))}
      {tokens.map((token) => (
        <pixiGraphics
          key={token.id}
          x={token.x}
          y={token.y}
          draw={(graphics: PixiGraphics) =>
            drawHitTarget(graphics, (token.size ?? DEFAULT_TOKEN_RADIUS) + TOKEN_HIT_PADDING)
          }
          eventMode="static"
          cursor="grab"
          onPointerDown={(event: FederatedPointerEvent) =>
            handlePointerDown(event, token.id, token.x, token.y)
          }
          onGlobalPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerUpOutside={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      ))}
      {sizeEditTokenId &&
        tokens
          .filter((token) => token.id === sizeEditTokenId)
          .map((token) => (
            <pixiGraphics
              key={`${token.id}-size-handle`}
              x={getSizeHandlePosition(token).x}
              y={getSizeHandlePosition(token).y}
              draw={drawHandle}
              eventMode="static"
              cursor="grab"
              onPointerDown={(event: FederatedPointerEvent) => handleSizePointerDown(event, token)}
              onGlobalPointerMove={handleSizePointerMove}
              onPointerUp={handleSizePointerUp}
              onPointerUpOutside={handleSizePointerUp}
              onPointerCancel={handleSizePointerUp}
            />
          ))}
    </>
  );
}

export default TokenControls;
