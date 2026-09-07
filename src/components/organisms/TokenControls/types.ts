import type { TokenContextMenuState } from "@/components/molecules/TokenContextMenu/types";
import type { TokenInstance } from "@shared/index";

export const DEFAULT_TOKEN_RADIUS = 22;
export const TOKEN_HIT_PADDING = 2;
export const TOKEN_MIN_SIZE = 12;
export const TOKEN_MAX_SIZE = 96;

export type TokenDragState = {
  pointerId: number | null;
  tokenId: string | null;
  offsetX: number;
  offsetY: number;
};

export type SizeDragState = {
  pointerId: number | null;
  tokenId: string | null;
  offsetX: number;
  offsetY: number;
  sourceX: number;
  sourceY: number;
};

export interface TokenControlsProps {
  isGM: boolean;
  sizeEditTokenId: string | null;
  onCloseSizeEdit: () => void;
  onOpenContextMenu: (state: TokenContextMenuState) => void;
  onCloseContextMenu: () => void;
  remotePlayerId?: string | null;
  allowedTokenIds?: Set<string>;
  onRemoteTokenMove?: (tokenId: string, x: number, y: number) => void;
}

export const createInitialTokenDragState = (): TokenDragState => ({
  pointerId: null,
  tokenId: null,
  offsetX: 0,
  offsetY: 0,
});

export const createInitialSizeDragState = (): SizeDragState => ({
  pointerId: null,
  tokenId: null,
  offsetX: 0,
  offsetY: 0,
  sourceX: 0,
  sourceY: 0,
});

export const getSizeHandlePosition = (token: TokenInstance, angle: number) => {
  const radius = token.size ?? DEFAULT_TOKEN_RADIUS;
  return {
    x: token.x + Math.cos(angle) * radius,
    y: token.y + Math.sin(angle) * radius,
  };
};
