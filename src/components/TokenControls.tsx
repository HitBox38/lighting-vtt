import { useCallback, useEffect, useRef } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

import { useTokenStore } from "@/stores/tokenStore";
import type { TokenInstanceUpdate } from "@shared/index";
import type { TokenContextMenuState } from "@/components/TokenContextMenu";

interface Props {
  isGM: boolean;
  onOpenContextMenu: (state: TokenContextMenuState) => void;
  onCloseContextMenu: () => void;
}

type DragState = {
  pointerId: number | null;
  tokenId: string | null;
  offsetX: number;
  offsetY: number;
};

const TOKEN_HIT_RADIUS = 24;

const createInitialDragState = (): DragState => ({
  pointerId: null,
  tokenId: null,
  offsetX: 0,
  offsetY: 0,
});

const drawHitTarget = (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, TOKEN_HIT_RADIUS);
  graphics.fill({ color: 0xffffff, alpha: 0.001 });
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

export function TokenControls({ isGM, onOpenContextMenu, onCloseContextMenu }: Props) {
  const tokens = useTokenStore((state) => state.tokens);
  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);
  const { schedule, flush } = useTokenUpdateScheduler(updateTokenInstance);
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

  if (!isGM || tokens.length === 0) {
    return null;
  }

  return (
    <>
      {tokens.map((token) => (
        <pixiGraphics
          key={token.id}
          x={token.x}
          y={token.y}
          draw={drawHitTarget}
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
    </>
  );
}

export default TokenControls;
