import type { Application as PixiApplication } from "pixi.js";

import { MAX_ZOOM, MIN_ZOOM } from "@/components/templates/GameCanvas/constants";

export const getCanvasFromApp = (app: PixiApplication | null) => {
  if (!app) {
    return null;
  }
  return (app.canvas ??
    (app.renderer as unknown as { view: HTMLCanvasElement })?.view ??
    null) as HTMLCanvasElement | null;
};

export const clampScale = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
