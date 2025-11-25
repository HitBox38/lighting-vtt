import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, extend } from "@pixi/react";
import {
  Application as PixiApplication,
  Assets,
  Container as PixiContainer,
  FederatedPointerEvent,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Texture as PixiTexture,
} from "pixi.js";

import FrameCounter from "@/components/FrameCounter";
import LightToolbar from "@/components/LightToolbar";
import { PresetToolbar } from "@/components/PresetToolbar";
import LightControls from "@/components/LightControls";
import LightingLayer from "@/components/LightingLayer";
import LightContextMenu, { type LightContextMenuState } from "@/components/LightContextMenu";
import { useLightManager } from "@/hooks/useLightManager";
import type { LightType } from "@/types/light";

extend({ Container: PixiContainer, Sprite: PixiSprite, Graphics: PixiGraphics });

interface Props {
  mapUrl: string;
  isGM?: boolean;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;

const getCanvasFromApp = (app: PixiApplication | null) => {
  if (!app) {
    return null;
  }
  return (app.canvas ??
    (app.renderer as unknown as { view: HTMLCanvasElement })?.view ??
    null) as HTMLCanvasElement | null;
};

export function GameCanvas({ mapUrl, isGM = true }: Props) {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  const resolution = useMemo(
    () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
    []
  );

  const [mapTexture, setMapTexture] = useState<PixiTexture | null>(null);
  const [contextMenuState, setContextMenuState] = useState<LightContextMenuState | null>(null);
  const { addLight } = useLightManager();
  const appRef = useRef<PixiApplication | null>(null);
  const containerRef = useRef<PixiContainer | null>(null);
  const spriteRef = useRef<PixiSprite | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const panStateRef = useRef({
    dragging: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadTexture = async () => {
      try {
        // Check if the URL is a blob URL
        const isBlob = mapUrl.startsWith("blob:");
        const texture = await Assets.load({
          src: mapUrl,
          parser: isBlob ? "loadTextures" : undefined,
          format: isBlob ? "png" : undefined, // Hint format for blobs if needed, though usually detected
        });

        if (isMounted) {
          setMapTexture(texture);
        }
      } catch (error) {
        console.error("Failed to load texture:", error);
      }
    };

    loadTexture();

    return () => {
      isMounted = false;
    };
  }, [mapUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const centerMap = useCallback(() => {
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

    const scaledWidth = mapWidth * container.scale.x;
    const scaledHeight = mapHeight * container.scale.y;

    container.position.set(
      (viewportSize.width - scaledWidth) / 2,
      (viewportSize.height - scaledHeight) / 2
    );
  }, [viewportSize.height, viewportSize.width, mapTexture]);

  useEffect(() => {
    if (mapTexture) {
      centerMap();
    }
  }, [centerMap, mapTexture]);

  const clampScale = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const currentScale = container.scale.x;
      const wheelDirection = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const nextScale = clampScale(currentScale * wheelDirection);

      if (nextScale === currentScale) {
        return;
      }

      const worldX = (event.offsetX - container.x) / currentScale;
      const worldY = (event.offsetY - container.y) / currentScale;

      container.scale.set(nextScale);
      container.position.set(
        event.offsetX - worldX * nextScale,
        event.offsetY - worldY * nextScale
      );
    },
    [clampScale]
  );

  const getViewportCenterWorld = useCallback(() => {
    const container = containerRef.current;
    const scale = container?.scale?.x ?? 1;
    const x = (viewportSize.width / 2 - (container?.x ?? 0)) / scale;
    const y = (viewportSize.height / 2 - (container?.y ?? 0)) / scale;
    return { x, y };
  }, [viewportSize.height, viewportSize.width]);

  const handleAddLight = useCallback(
    (type: LightType) => {
      const { x, y } = getViewportCenterWorld();
      addLight(type, x, y);
    },
    [addLight, getViewportCenterWorld]
  );

  const handlePointerDown = useCallback((event: FederatedPointerEvent) => {
    panStateRef.current.dragging = true;
    panStateRef.current.pointerId = event.pointerId;
    panStateRef.current.lastX = event.global.x;
    panStateRef.current.lastY = event.global.y;
  }, []);

  const handlePointerMove = useCallback((event: FederatedPointerEvent) => {
    const state = panStateRef.current;
    const container = containerRef.current;
    if (!state.dragging || state.pointerId !== event.pointerId || !container) {
      return;
    }

    const deltaX = event.global.x - state.lastX;
    const deltaY = event.global.y - state.lastY;

    container.position.set(container.x + deltaX, container.y + deltaY);

    state.lastX = event.global.x;
    state.lastY = event.global.y;
  }, []);

  const handlePointerUp = useCallback((event: FederatedPointerEvent) => {
    const state = panStateRef.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }

    state.dragging = false;
    state.pointerId = null;
  }, []);

  const detachInteractionHandlers = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const attachInteractionHandlers = useCallback(
    (canvas: HTMLCanvasElement, app: PixiApplication) => {
      detachInteractionHandlers();

      canvas.style.touchAction = "none";

      const stage = app.stage;
      stage.eventMode = "static";
      stage.hitArea = app.screen;

      stage.on("pointerdown", handlePointerDown);
      stage.on("pointermove", handlePointerMove);
      stage.on("pointerup", handlePointerUp);
      stage.on("pointerupoutside", handlePointerUp);
      stage.on("pointerleave", handlePointerUp);

      canvas.addEventListener("wheel", handleWheel, { passive: false });
      const preventContextMenu = (event: Event) => event.preventDefault();
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
    },
    [detachInteractionHandlers, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]
  );

  useEffect(() => {
    return () => {
      detachInteractionHandlers();
    };
  }, [detachInteractionHandlers]);

  const handleAppInit = useCallback(
    (app: PixiApplication) => {
      appRef.current = app;
      const canvas = getCanvasFromApp(app);
      if (canvas) {
        attachInteractionHandlers(canvas, app);
      }
    },
    [attachInteractionHandlers]
  );

  // Ensure stage hitArea updates on resize
  useEffect(() => {
    if (appRef.current) {
      appRef.current.stage.hitArea = appRef.current.screen;
    }
  }, [viewportSize]);

  const lightingWidth = mapTexture?.width ?? viewportSize.width;
  const lightingHeight = mapTexture?.height ?? viewportSize.height;

  const handleOpenContextMenu = useCallback((state: LightContextMenuState) => {
    setContextMenuState(state);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <div className="pointer-events-auto flex flex-row gap-2">
          <PresetToolbar />
          <LightToolbar
            onAddRadial={() => handleAddLight("radial")}
            onAddConic={() => handleAddLight("conic")}
            onAddLine={() => handleAddLight("line")}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <FrameCounter appRef={appRef} />
      </div>
      <Application
        width={viewportSize.width}
        height={viewportSize.height}
        resolution={resolution}
        autoDensity
        backgroundColor={0x000000}
        className="block h-full w-full"
        onInit={handleAppInit}>
        <pixiContainer ref={containerRef}>
          {mapTexture && <pixiSprite ref={spriteRef} texture={mapTexture} />}
          <LightingLayer width={lightingWidth} height={lightingHeight} isGM={isGM} />
          <LightControls
            isGM={isGM}
            onOpenContextMenu={handleOpenContextMenu}
            onCloseContextMenu={handleCloseContextMenu}
          />
        </pixiContainer>
      </Application>
      {contextMenuState && (
        <LightContextMenu state={contextMenuState} isGM={isGM} onClose={handleCloseContextMenu} />
      )}
    </div>
  );
}

export default GameCanvas;
