import type { Graphics as PixiGraphics } from "pixi.js";

import { HANDLE_RADIUS } from "@/lib/pixiControls/constants";
import type { EffectInstanceStatus } from "@/stores/effectRuntimeStore/effectRuntimeStore";
import type { EffectInstance } from "@shared/effects";

export const EFFECT_HANDLE_FILL = 0xc084fc;
export const EFFECT_HANDLE_FILL_BROKEN = 0xf87171;
export const EFFECT_LINK_COLOR = 0xc084fc;
export const EFFECT_HIGHLIGHT_STROKE_WIDTH = 2;

/** Broken instances get a red handle so the GM can tell at a glance without opening the menu. */
export function isBrokenStatus(status: EffectInstanceStatus | undefined): boolean {
  if (!status) {
    return false;
  }
  switch (status.kind) {
    case "error":
    case "disabled":
    case "missing-definition":
    case "missing-program":
      return true;
    case "loading":
    case "compiling":
    case "ok":
      return false;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled status: ${String(exhaustive)}`);
    }
  }
}

export function rimPosition(effect: EffectInstance): { x: number; y: number } {
  return {
    x: effect.x + Math.cos(effect.rotation) * effect.radius,
    y: effect.y + Math.sin(effect.rotation) * effect.radius,
  };
}

const makeCenterDrawer = (fill: number) => (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.circle(0, 0, HANDLE_RADIUS);
  graphics.fill({ color: fill, alpha: 0.95 });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

const makeRimDrawer = (fill: number) => (graphics: PixiGraphics) => {
  graphics.clear();
  graphics.poly([0, -HANDLE_RADIUS, HANDLE_RADIUS, 0, 0, HANDLE_RADIUS, -HANDLE_RADIUS, 0]);
  graphics.fill({ color: fill, alpha: 0.95 });
  graphics.setStrokeStyle({ width: 1, color: 0x111827, alpha: 0.9 });
  graphics.stroke();
};

export const drawCenterOk = makeCenterDrawer(EFFECT_HANDLE_FILL);
export const drawCenterBroken = makeCenterDrawer(EFFECT_HANDLE_FILL_BROKEN);
export const drawRimOk = makeRimDrawer(EFFECT_HANDLE_FILL);
export const drawRimBroken = makeRimDrawer(EFFECT_HANDLE_FILL_BROKEN);
