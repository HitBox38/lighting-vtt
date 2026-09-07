import { useEffect, useRef } from "react";
import type {
  Application as PixiApplication,
  Container as PixiContainer,
  FederatedPointerEvent,
  Sprite as PixiSprite,
  Texture as PixiTexture,
} from "pixi.js";
import { usePostHog } from "@posthog/react";

import { ZOOM_STEP } from "@/components/templates/GameCanvas/constants";
import {
  clampScale,
  getCanvasFromApp,
} from "@/components/templates/GameCanvas/helpers";
import { useTokenManager } from "@/stores/tokenStore/hooks/useTokenManager";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function useCanvasInteraction({
  isGM,
  mapTexture,
  viewportSize,
}: {
  isGM: boolean;
  mapTexture: PixiTexture | null;
  viewportSize: { width: number; height: number };
}) {
  const posthog = usePostHog();
  const { placementTemplateId, addTokenInstance } = useTokenManager();
  const appRef = useRef<PixiApplication | null>(null);
  const containerRef = useRef<PixiContainer | null>(null);
  const spriteRef = useRef<PixiSprite | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isGMRef = useRef(isGM);
  const posthogRef = useRef(posthog);
  const placementTemplateIdRef = useRef<string | null>(placementTemplateId);
  const addTokenInstanceRef = useRef(addTokenInstance);
  const panStateRef = useRef({
    dragging: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    isGMRef.current = isGM;
    posthogRef.current = posthog;
    placementTemplateIdRef.current = placementTemplateId;
    addTokenInstanceRef.current = addTokenInstance;
  });

  useEffect(() => {
    const container = containerRef.current;
    const sprite = spriteRef.current;
    if (!container || !sprite || !mapTexture) {
      return;
    }
    const mapWidth = mapTexture.width;
    const mapHeight = mapTexture.height;
    if (!mapWidth || !mapHeight) {
      return;
    }
    container.position.set(
      (viewportSize.width - mapWidth * container.scale.x) / 2,
      (viewportSize.height - mapHeight * container.scale.y) / 2,
    );
  }, [mapTexture, viewportSize.height, viewportSize.width]);

  const getViewportCenterWorld = () => {
    const container = containerRef.current;
    const scale = container?.scale?.x ?? 1;
    return {
      x: (viewportSize.width / 2 - (container?.x ?? 0)) / scale,
      y: (viewportSize.height / 2 - (container?.y ?? 0)) / scale,
    };
  };

  const attachInteractionHandlers = (
    canvas: HTMLCanvasElement,
    app: PixiApplication,
  ) => {
    cleanupRef.current?.();
    canvas.style.touchAction = "none";
    const stage = app.stage;
    stage.eventMode = "static";
    stage.hitArea = app.screen;

    const handlePointerDown = (event: FederatedPointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const activeTemplateId = placementTemplateIdRef.current;
      if (isGMRef.current && activeTemplateId) {
        event.stopPropagation();
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const worldPosition = event.getLocalPosition(container);
        addTokenInstanceRef.current(
          activeTemplateId,
          worldPosition.x,
          worldPosition.y,
        );
        posthogRef.current.capture(ANALYTICS_EVENTS.TokenInstancePlaced);
        return;
      }
      panStateRef.current.dragging = true;
      panStateRef.current.pointerId = event.pointerId;
      panStateRef.current.lastX = event.global.x;
      panStateRef.current.lastY = event.global.y;
    };

    const handlePointerMove = (event: FederatedPointerEvent) => {
      const state = panStateRef.current;
      const container = containerRef.current;
      if (
        !state.dragging ||
        state.pointerId !== event.pointerId ||
        !container
      ) {
        return;
      }
      container.position.set(
        container.x + (event.global.x - state.lastX),
        container.y + (event.global.y - state.lastY),
      );
      state.lastX = event.global.x;
      state.lastY = event.global.y;
    };

    const handlePointerUp = (event: FederatedPointerEvent) => {
      if (panStateRef.current.pointerId !== event.pointerId) {
        return;
      }
      panStateRef.current.dragging = false;
      panStateRef.current.pointerId = null;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const currentScale = container.scale.x;
      const nextScale = clampScale(
        currentScale * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
      );
      if (nextScale === currentScale) {
        return;
      }
      const worldX = (event.offsetX - container.x) / currentScale;
      const worldY = (event.offsetY - container.y) / currentScale;
      container.scale.set(nextScale);
      container.position.set(
        event.offsetX - worldX * nextScale,
        event.offsetY - worldY * nextScale,
      );
    };

    const preventContextMenu = (event: Event) => event.preventDefault();
    stage.on("pointerdown", handlePointerDown);
    stage.on("pointermove", handlePointerMove);
    stage.on("pointerup", handlePointerUp);
    stage.on("pointerupoutside", handlePointerUp);
    stage.on("pointerleave", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", preventContextMenu);

    cleanupRef.current = () => {
      stage.off("pointerdown", handlePointerDown);
      stage.off("pointermove", handlePointerMove);
      stage.off("pointerup", handlePointerUp);
      stage.off("pointerupoutside", handlePointerUp);
      stage.off("pointerleave", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("contextmenu", preventContextMenu);
    };
  };

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const handleAppInit = (app: PixiApplication) => {
    appRef.current = app;
    const canvas = getCanvasFromApp(app);
    if (canvas) {
      attachInteractionHandlers(canvas, app);
    }
  };

  useEffect(() => {
    const app = appRef.current;
    if (!app?.renderer) {
      return;
    }
    app.renderer.resize(viewportSize.width, viewportSize.height);
    app.stage.hitArea = app.screen;
  }, [viewportSize.width, viewportSize.height]);

  return {
    appRef,
    containerRef,
    spriteRef,
    getViewportCenterWorld,
    handleAppInit,
  };
}
