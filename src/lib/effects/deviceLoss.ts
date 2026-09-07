import type { Renderer, WebGPURenderer } from "pixi.js";

import type { EffectBackend } from "./shaderContract";

export interface DeviceLossHandlers {
  /** The GPU context/device is gone. Every program compiled against it is now invalid. */
  onLost: (detail: string) => void;
  /**
   * A fresh context exists. WebGL fires this from `webglcontextrestored`.
   * A lost WebGPU device is permanent: its owner must create a new renderer.
   */
  onRestored: () => void;
}

/**
 * Subscribes to GPU loss for a pixi renderer on either backend.
 *
 * User-authored shaders are the one place this app can stall a GPU hard enough
 * for the browser to pull the context, so anything that holds compiled effect
 * programs must listen and rebuild. Returns an unsubscribe function.
 */
export function watchDeviceLoss(renderer: Renderer, backend: EffectBackend, handlers: DeviceLossHandlers): () => void {
  switch (backend) {
    case "webgl": {
      const canvas = renderer.canvas as HTMLCanvasElement;
      const onLost = (event: Event) => {
        // Without preventDefault the browser never attempts a restore.
        event.preventDefault();
        handlers.onLost("webglcontextlost");
      };
      const onRestored = () => handlers.onRestored();
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      return () => {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      };
    }
    case "webgpu": {
      let cancelled = false;
      const device = (renderer as WebGPURenderer).gpu.device;
      void device.lost.then((info) => {
        if (cancelled) return;
        handlers.onLost(`device lost: ${info.reason}`);
      });
      return () => {
        cancelled = true;
      };
    }
    default: {
      const exhaustive: never = backend;
      throw new Error(`Unhandled backend: ${String(exhaustive)}`);
    }
  }
}
