import { useEffect, useState, type RefObject } from "react";
import type { Application as PixiApplication } from "pixi.js";

const SAMPLE_INTERVAL_MS = 250;

type Props = {
  appRef: RefObject<PixiApplication | null>;
};

type Stats = {
  fps: number;
  frames: number;
};

export function FrameCounter({ appRef }: Props) {
  const isDev = import.meta.env.DEV;
  const [app, setApp] = useState<PixiApplication | null>(null);
  const [stats, setStats] = useState<Stats>({ fps: 0, frames: 0 });

  useEffect(() => {
    if (!isDev) {
      return;
    }

    if (appRef.current) {
      setApp(appRef.current);
      return;
    }

    let rafId: number | null = null;

    const waitForApp = () => {
      if (appRef.current) {
        setApp(appRef.current);
        return;
      }
      rafId = requestAnimationFrame(waitForApp);
    };

    waitForApp();

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [appRef, isDev]);

  useEffect(() => {
    if (!isDev || !app) {
      return;
    }

    let totalFrames = 0;
    let windowFrames = 0;
    let lastSample = performance.now();

    const handleTick = () => {
      totalFrames += 1;
      windowFrames += 1;

      const now = performance.now();
      const elapsed = now - lastSample;

      if (elapsed >= SAMPLE_INTERVAL_MS) {
        const fps = Math.round((windowFrames * 1000) / elapsed);
        setStats({ fps, frames: totalFrames });
        windowFrames = 0;
        lastSample = now;
      }
    };

    app.ticker.add(handleTick);

    return () => {
      app.ticker.remove(handleTick);
    };
  }, [app, isDev]);

  if (!isDev || !app) {
    return null;
  }

  return (
    <div className="pointer-events-none text-xs font-mono text-white">
      <div className="rounded bg-black/60 px-3 py-1 text-right shadow-lg shadow-black/40">
        <div>FPS: {stats.fps}</div>
        <div>Frame: {stats.frames}</div>
      </div>
    </div>
  );
}

export default FrameCounter;
