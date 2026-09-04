import type { Mirror } from "@shared/index";
import type { MirrorContextMenuState } from "@/components/molecules/MirrorContextMenu/types";

export type MirrorDragHandleType = "endpoint1" | "endpoint2" | "midpoint";

export interface MirrorDragState {
  pointerId: number | null;
  mirrorId: string | null;
  handle: MirrorDragHandleType | null;
  offsetX: number;
  offsetY: number;
  endpoint1OffsetX: number;
  endpoint1OffsetY: number;
  endpoint2OffsetX: number;
  endpoint2OffsetY: number;
  fixedWidth: boolean;
  fixedLength: number;
  otherEndpointX: number;
  otherEndpointY: number;
}

export interface MirrorControlsProps {
  isGM: boolean;
  onOpenContextMenu: (state: MirrorContextMenuState) => void;
  onCloseContextMenu: () => void;
}

export const createInitialMirrorDragState = (): MirrorDragState => ({
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

export const getMirrorMidpoint = (mirror: Mirror) => ({
  x: (mirror.x1 + mirror.x2) / 2,
  y: (mirror.y1 + mirror.y2) / 2,
});
