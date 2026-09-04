import type { FederatedPointerEvent } from "pixi.js";
import type { Light } from "@shared/index";

import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";

export type DragHandleType = "radial" | "radialRadius" | "source" | "target" | "conicAngle";

export type LightHandlePointerHandlers = {
  onPointerDown: (event: FederatedPointerEvent, light: Light, handle: DragHandleType) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: (event: FederatedPointerEvent) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
};

export type LightDragState = {
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
  baseAngle: number;
};

export interface LightControlsProps {
  isGM: boolean;
  onOpenContextMenu: (state: LightContextMenuState) => void;
  onCloseContextMenu: () => void;
}
