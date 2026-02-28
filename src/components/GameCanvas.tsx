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
import MirrorToolbar from "@/components/MirrorToolbar";
import { PlayerViewToolbar } from "@/components/PlayerViewToolbar";
import { PresetToolbar } from "@/components/PresetToolbar";
import LightControls from "@/components/LightControls";
import LightingLayer from "@/components/LightingLayer";
import MirrorLayer from "@/components/MirrorLayer";
import MirrorControls from "@/components/MirrorControls";
import LightContextMenu, { type LightContextMenuState } from "@/components/LightContextMenu";
import MirrorContextMenu, { type MirrorContextMenuState } from "@/components/MirrorContextMenu";
import TokenContextMenu, { type TokenContextMenuState } from "@/components/TokenContextMenu";
import TokenLayer from "@/components/TokenLayer";
import TokenControls from "@/components/TokenControls";
import TokenToolbar from "@/components/TokenToolbar";
import { useLightManager } from "@/hooks/useLightManager";
import { useMirrorManager } from "@/hooks/useMirrorManager";
import { useTokenManager } from "@/hooks/useTokenManager";
import type { LightType } from "@shared/index";
import { UserToolbar } from "@/components/UserToolbar";
import { InitiativeSidebar } from "@/components/InitiativeSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";

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
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIPreferencesStore((state) => state.setSidebarOpen);

  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  const resolution = useMemo(
    () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
    []
  );

  const [mapTexture, setMapTexture] = useState<PixiTexture | null>(null);
  const [lightContextMenuState, setLightContextMenuState] = useState<LightContextMenuState | null>(
    null
  );
  const [mirrorContextMenuState, setMirrorContextMenuState] =
    useState<MirrorContextMenuState | null>(null);
  const [tokenContextMenuState, setTokenContextMenuState] = useState<TokenContextMenuState | null>(
    null
  );
  const [sizeEditTokenId, setSizeEditTokenId] = useState<string | null>(null);
  const { addLight } = useLightManager();
  const { addMirror } = useMirrorManager();
  const { placementTemplateId, addTokenInstance } = useTokenManager();
  const appRef = useRef<PixiApplication | null>(null);
  const containerRef = useRef<PixiContainer | null>(null);
  const spriteRef = useRef<PixiSprite | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const placementTemplateIdRef = useRef<string | null>(null);
  const addTokenInstanceRef = useRef(addTokenInstance);
  const panStateRef = useRef({
    dragging: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    placementTemplateIdRef.current = placementTemplateId;
  }, [placementTemplateId]);

  useEffect(() => {
    addTokenInstanceRef.current = addTokenInstance;
  }, [addTokenInstance]);

  useEffect(() => {
    let isMounted = true;

    const loadTexture = async () => {
      try {
        // Check if the URL is a blob URL or UploadThing URL
        const isBlob = mapUrl.startsWith("blob:");
        const isUploadThing = mapUrl.includes(".ufs.sh/f/");
        const needsParser = isBlob || isUploadThing;

        const texture = await Assets.load({
          src: mapUrl,
          parser: needsParser ? "loadTextures" : undefined,
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

  const handleAddMirror = useCallback(() => {
    const { x, y } = getViewportCenterWorld();
    addMirror(x, y);
  }, [addMirror, getViewportCenterWorld]);

  const handlePointerDown = useCallback(
    (event: FederatedPointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const activeTemplateId = placementTemplateIdRef.current;
      if (isGM && activeTemplateId) {
        event.stopPropagation();
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const worldPosition = event.getLocalPosition(container);
        addTokenInstanceRef.current(activeTemplateId, worldPosition.x, worldPosition.y);
        return;
      }

      panStateRef.current.dragging = true;
      panStateRef.current.pointerId = event.pointerId;
      panStateRef.current.lastX = event.global.x;
      panStateRef.current.lastY = event.global.y;
    },
    [isGM]
  );

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

  const handleOpenLightContextMenu = useCallback((state: LightContextMenuState) => {
    setSizeEditTokenId(null);
    setTokenContextMenuState(null);
    setMirrorContextMenuState(null);
    setLightContextMenuState(state);
  }, []);

  const handleCloseLightContextMenu = useCallback(() => {
    setLightContextMenuState(null);
  }, []);

  const handleOpenMirrorContextMenu = useCallback((state: MirrorContextMenuState) => {
    setSizeEditTokenId(null);
    setTokenContextMenuState(null);
    setLightContextMenuState(null);
    setMirrorContextMenuState(state);
  }, []);

  const handleCloseMirrorContextMenu = useCallback(() => {
    setMirrorContextMenuState(null);
  }, []);

  const handleOpenTokenContextMenu = useCallback((state: TokenContextMenuState) => {
    setSizeEditTokenId(null);
    setLightContextMenuState(null);
    setMirrorContextMenuState(null);
    setTokenContextMenuState(state);
  }, []);

  const handleCloseTokenContextMenu = useCallback(() => {
    setTokenContextMenuState(null);
  }, []);

  const handleStartTokenSizeEdit = useCallback((tokenId: string) => {
    setSizeEditTokenId(tokenId);
  }, []);

  const handleCloseTokenSizeEdit = useCallback(() => {
    setSizeEditTokenId(null);
  }, []);

  return (
    <SidebarProvider
      side={sidebarSide}
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <InitiativeSidebar isGM={isGM} />
      <SidebarInset className="relative h-screen overflow-hidden">
        {isGM && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-black/35 via-black/20 to-transparent dark:from-black/55 dark:via-black/30" />
            <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-3 sm:px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="pointer-events-auto flex min-w-0 flex-1 flex-wrap items-start gap-2">
                  <PresetToolbar />
                  <LightToolbar
                    onAddRadial={() => handleAddLight("radial")}
                    onAddConic={() => handleAddLight("conic")}
                    onAddLine={() => handleAddLight("line")}
                  />
                  <MirrorToolbar onAddMirror={handleAddMirror} />
                  <TokenToolbar />
                  <PlayerViewToolbar />
                </div>

                <div className="pointer-events-auto shrink-0">
                  <UserToolbar />
                </div>
              </div>
            </div>
          </>
        )}
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
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
            <MirrorLayer isGM={isGM} />
            <TokenLayer isGM={isGM} />
            <LightControls
              isGM={isGM}
              onOpenContextMenu={handleOpenLightContextMenu}
              onCloseContextMenu={handleCloseLightContextMenu}
            />
            <MirrorControls
              isGM={isGM}
              onOpenContextMenu={handleOpenMirrorContextMenu}
              onCloseContextMenu={handleCloseMirrorContextMenu}
            />
            <TokenControls
              isGM={isGM}
              sizeEditTokenId={sizeEditTokenId}
              onCloseSizeEdit={handleCloseTokenSizeEdit}
              onOpenContextMenu={handleOpenTokenContextMenu}
              onCloseContextMenu={handleCloseTokenContextMenu}
            />
          </pixiContainer>
        </Application>
        {lightContextMenuState && (
          <LightContextMenu
            state={lightContextMenuState}
            isGM={isGM}
            onClose={handleCloseLightContextMenu}
          />
        )}
        {mirrorContextMenuState && (
          <MirrorContextMenu
            state={mirrorContextMenuState}
            isGM={isGM}
            onClose={handleCloseMirrorContextMenu}
          />
        )}
        {tokenContextMenuState && (
          <TokenContextMenu
            state={tokenContextMenuState}
            isGM={isGM}
            onEditSize={handleStartTokenSizeEdit}
            onClose={handleCloseTokenContextMenu}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default GameCanvas;
