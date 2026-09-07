import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

import { DASH_GAP, DASH_LENGTH, HANDLE_RADIUS } from "./constants";

export const drawHandle = (
  graphics: PixiGraphics,
  fillColor = 0xffffff,
  fillAlpha = 0.95,
): void => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS);
  graphics.fill({ color: fillColor, alpha: fillAlpha });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

export const drawDashedLink = (
  graphics: PixiGraphics,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeColor = 0xffffff,
  strokeAlpha = 0.55,
  options?: { clear?: boolean },
): void => {
  if (options?.clear !== false) {
    graphics.clear();
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);

  if (!distance) {
    return;
  }

  graphics.setStrokeStyle({ width: 1, color: strokeColor, alpha: strokeAlpha });

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

export const getPointerPosition = (event: FederatedPointerEvent) => {
  const currentTarget = event.currentTarget as PixiGraphics | null;
  const parent = currentTarget?.parent;
  if (parent) {
    return event.getLocalPosition(parent);
  }
  return { x: event.globalX, y: event.globalY };
};

export const blockNextNativeContextMenu = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  const handler = (nativeEvent: MouseEvent) => {
    nativeEvent.preventDefault();
  };
  window.addEventListener("contextmenu", handler, { once: true, capture: true });
};

export const preventNativeContextMenu = (event: FederatedPointerEvent): void => {
  event.preventDefault();
  const nativeEvent = event.nativeEvent as Event | undefined;
  if (nativeEvent && typeof (nativeEvent as MouseEvent).preventDefault === "function") {
    (nativeEvent as MouseEvent).preventDefault();
  }
  blockNextNativeContextMenu();
};
