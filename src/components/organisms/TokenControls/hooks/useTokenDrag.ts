import { useEffect, useRef, useState } from "react";
import type { FederatedPointerEvent } from "pixi.js";
import type { TokenInstance } from "@shared/index";

import {
  TOKEN_MAX_SIZE,
  TOKEN_MIN_SIZE,
  getSizeHandlePosition,
  type SizeDragState,
  type TokenControlsProps,
  type TokenDragState,
} from "@/components/organisms/TokenControls/types";
import { getPointerPosition, preventNativeContextMenu } from "@/lib/pixiControls/helpers";
import { useRafUpdateScheduler } from "@/lib/pixiControls/hooks/useRafUpdateScheduler";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function useTokenDrag({
  sizeEditTokenId,
  onCloseSizeEdit,
  onOpenContextMenu,
  onCloseContextMenu,
  remotePlayerId,
  onRemoteTokenMove,
}: TokenControlsProps) {
  const isRemotePlayer = !!remotePlayerId;
  const tokens = useTokenStore((state) => state.tokens);
  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);
  const { schedule, flush } = useRafUpdateScheduler(updateTokenInstance);
  const dragRef = useRef<TokenDragState | null>(null);
  const sizeDragRef = useRef<SizeDragState | null>(null);
  const [sizeHandleAngles, setSizeHandleAngles] = useState<Record<string, number>>({});

  useEffect(() => {
    if (sizeEditTokenId && !tokens.some((token) => token.id === sizeEditTokenId)) {
      onCloseSizeEdit();
    }
  }, [onCloseSizeEdit, sizeEditTokenId, tokens]);

  const getAngle = (tokenId: string) => sizeHandleAngles[tokenId] ?? 0;

  const handlePointerDown = (
    event: FederatedPointerEvent,
    tokenId: string,
    x: number,
    y: number,
  ) => {
    event.stopPropagation();
    onCloseContextMenu();
    flush();
    if (event.button === 2) {
      preventNativeContextMenu(event);
      onOpenContextMenu({
        tokenId,
        position: { x: event.clientX ?? event.globalX, y: event.clientY ?? event.globalY },
      });
      return;
    }
    const pointerPosition = getPointerPosition(event);
    dragRef.current = {
      pointerId: event.pointerId,
      tokenId,
      offsetX: pointerPosition.x - x,
      offsetY: pointerPosition.y - y,
    };
  };

  const handlePointerMove = (event: FederatedPointerEvent) => {
    const drag = dragRef.current;
    if (!drag?.tokenId || drag.pointerId !== event.pointerId) {
      return;
    }
    const pointerPosition = getPointerPosition(event);
    schedule(drag.tokenId, {
      x: pointerPosition.x - drag.offsetX,
      y: pointerPosition.y - drag.offsetY,
    });
  };

  const handlePointerUp = (event: FederatedPointerEvent) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    const movedTokenId = dragRef.current.tokenId;
    flush();
    dragRef.current = null;
    if (isRemotePlayer && movedTokenId && onRemoteTokenMove) {
      const token = useTokenStore.getState().tokens.find((candidate) => candidate.id === movedTokenId);
      if (token) {
        onRemoteTokenMove(movedTokenId, token.x, token.y);
      }
    }
  };

  const handleSizePointerDown = (event: FederatedPointerEvent, token: TokenInstance) => {
    event.stopPropagation();
    onCloseContextMenu();
    flush();
    const pointerPosition = getPointerPosition(event);
    const handlePosition = getSizeHandlePosition(token, getAngle(token.id));
    sizeDragRef.current = {
      pointerId: event.pointerId,
      tokenId: token.id,
      offsetX: pointerPosition.x - handlePosition.x,
      offsetY: pointerPosition.y - handlePosition.y,
      sourceX: token.x,
      sourceY: token.y,
    };
  };

  const handleSizePointerMove = (event: FederatedPointerEvent) => {
    const drag = sizeDragRef.current;
    if (!drag?.tokenId || drag.pointerId !== event.pointerId) {
      return;
    }
    const pointerPosition = getPointerPosition(event);
    const nextX = pointerPosition.x - drag.offsetX;
    const nextY = pointerPosition.y - drag.offsetY;
    const dx = nextX - drag.sourceX;
    const dy = nextY - drag.sourceY;
    setSizeHandleAngles((prev) => ({ ...prev, [drag.tokenId!]: Math.atan2(dy, dx) }));
    schedule(drag.tokenId, {
      size: Math.min(TOKEN_MAX_SIZE, Math.max(TOKEN_MIN_SIZE, Math.hypot(dx, dy))),
    });
  };

  const handleSizePointerUp = (event: FederatedPointerEvent) => {
    if (sizeDragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    flush();
    sizeDragRef.current = null;
  };

  return {
    getAngle,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSizePointerDown,
    handleSizePointerMove,
    handleSizePointerUp,
  };
}
