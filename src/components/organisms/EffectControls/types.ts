import type { FederatedPointerEvent } from "pixi.js";
import type { EffectInstance } from "@shared/effects";

import type { EffectContextMenuState } from "@/components/molecules/EffectContextMenu/types";

export type EffectDragHandle = "center" | "rim";

export type EffectHandlePointerHandlers = {
  onPointerDown: (
    event: FederatedPointerEvent,
    effect: EffectInstance,
    handle: EffectDragHandle,
  ) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: (event: FederatedPointerEvent) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
};

export type EffectDragState = {
  pointerId: number | null;
  effectId: string | null;
  handle: EffectDragHandle | null;
  offsetX: number;
  offsetY: number;
  centerX: number;
  centerY: number;
};

export interface EffectControlsProps {
  isGM: boolean;
  onOpenContextMenu: (state: EffectContextMenuState) => void;
  onCloseContextMenu: () => void;
}
