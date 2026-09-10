import "pixi.js/advanced-blend-modes";
import { useEffect, useRef, useState } from "react";
import { useWorkshopStore } from "@/stores/workshopStore";
import { EffectWorkshop } from "@/components/organisms/EffectWorkshop/EffectWorkshop";
import { PlacementOverlay } from "@/components/organisms/EffectWorkshop/PlacementOverlay";
import { WorkshopTelemetry } from "@/components/organisms/EffectWorkshop/WorkshopTelemetry";
import { extend } from "@pixi/react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
} from "pixi.js";

import { FrameCounter } from "@/components/atoms/FrameCounter";
import { InitiativeSidebar } from "@/components/organisms/InitiativeSidebar";
import { PlayerCanvasControls } from "./components/PlayerCanvasControls";
import { GameCanvasHud } from "@/components/templates/GameCanvas/components/GameCanvasHud";
import { GameCanvasMenus } from "@/components/templates/GameCanvas/components/GameCanvasMenus";
import { GameCanvasStage } from "@/components/templates/GameCanvas/components/GameCanvasStage";
import { useAllowedTokenIds } from "@/components/templates/GameCanvas/hooks/useAllowedTokenIds";
import { useCanvasInteraction } from "@/components/templates/GameCanvas/hooks/useCanvasInteraction";
import { useMapTexture } from "@/components/templates/GameCanvas/hooks/useMapTexture";
import { useCanvasAnalytics } from "./hooks/useCanvasAnalytics";
import { useOverlayMenus } from "@/components/templates/GameCanvas/hooks/useOverlayMenus";
import { usePendingEffectPlacement } from "@/components/templates/GameCanvas/hooks/usePendingEffectPlacement";
import { useRemoteTokenMove } from "@/components/templates/GameCanvas/hooks/useRemoteTokenMove";
import { useViewportSize } from "@/components/templates/GameCanvas/hooks/useViewportSize";
import type { GameCanvasProps } from "@/components/templates/GameCanvas/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useLightStore } from "@/stores/lightStore/lightStore";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";

extend({
  Container: PixiContainer,
  Sprite: PixiSprite,
  Graphics: PixiGraphics,
});

export function GameCanvas({
  mapUrl,
  isGM = true,
  remotePlayerId,
  sceneId,
}: GameCanvasProps) {
  const workshopOpen = useWorkshopStore((s) => s.open);
  const placingEffect = useWorkshopStore((s) => s.pending !== null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    useWorkshopStore.setState({
      sceneStartedAt: Date.now(),
      completedCount: 0,
    });
    return () => {
      const { pending, attempt } = useWorkshopStore.getState();
      // Strict Mode replays cleanup immediately. Only a real exit cancels work,
      // and an old scene's cleanup must never cancel a new scene's selection.
      exitTimer.current = setTimeout(() => {
        const current = useWorkshopStore.getState();
        if (current.pending === pending && current.attempt === attempt) current.reset();
      }, 0);
    };
  }, [sceneId]);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIPreferencesStore((state) => state.setSidebarOpen);
  const windowSize = useViewportSize();
  const mobilePlayer = !isGM && windowSize.width < 1024;
  const [playerInitiativeOpen, setPlayerInitiativeOpen] = useState(false);
  const insetRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState(windowSize);
  useEffect(() => {
    const inset = insetRef.current;
    if (!inset) return;
    const observer = new ResizeObserver(() => {
      setViewportSize({ width: inset.clientWidth, height: inset.clientHeight });
    });
    observer.observe(inset);
    return () => observer.disconnect();
  }, []);
  const { mapTexture, mapFailed } = useMapTexture(mapUrl);
  const [rendererReady, setRendererReady] = useState(false);
  useCanvasAnalytics(sceneId, rendererReady, mapTexture !== null, mapFailed);
  const menus = useOverlayMenus();
  const { allowedTokenIds } = useAllowedTokenIds(sceneId, remotePlayerId);
  const handleRemoteTokenMove = useRemoteTokenMove(sceneId, remotePlayerId);
  const interaction = useCanvasInteraction({ isGM, mapTexture, viewportSize });
  const storeSceneId = useLightStore((state) => state.sceneId);

  const handlePlaceEffect = (effectId: string, version: number) =>
    useWorkshopStore
      .getState()
      .begin({ kind: "effect", effectId, version, name: "Effect" }, "gallery");

  const sceneReadyForPlacement =
    isGM && mapTexture !== null && (sceneId ? storeSceneId === sceneId : true);
  usePendingEffectPlacement(sceneReadyForPlacement, handlePlaceEffect, mapFailed);

  return (
    <SidebarProvider
      side={sidebarSide}
      open={mobilePlayer ? playerInitiativeOpen : sidebarOpen && !(isGM && (workshopOpen || placingEffect) && windowSize.width < 1024)}
      onOpenChange={mobilePlayer ? setPlayerInitiativeOpen : setSidebarOpen}
    >
      <InitiativeSidebar isGM={isGM} mobilePlayer={mobilePlayer} />
      <WorkshopTelemetry isGM={isGM} />
      <SidebarInset ref={insetRef} className="relative h-dvh overflow-hidden">
        {isGM ? <GameCanvasHud sceneId={sceneId} /> : null}
        {!isGM ? <PlayerCanvasControls fitMap={interaction.fitMap} zoomMap={interaction.zoomMap} /> : null}
        <div className={isGM ? "pointer-events-none absolute right-4 bottom-4 z-20" : "pointer-events-none absolute right-4 bottom-4 z-20 hidden lg:block"}>
          <FrameCounter appRef={interaction.appRef} />
        </div>
        <GameCanvasStage
          viewportSize={viewportSize}
          mapTexture={mapTexture}
          isGM={isGM}
          containerRef={interaction.containerRef}
          spriteRef={interaction.spriteRef}
          onAppInit={(app) => { interaction.handleAppInit(app); setRendererReady(true); }}
          sizeEditTokenId={menus.sizeEditTokenId}
          onCloseSizeEdit={menus.handleCloseTokenSizeEdit}
          onOpenLightContextMenu={menus.handleOpenLightContextMenu}
          onCloseLightContextMenu={menus.handleCloseLightContextMenu}
          onOpenMirrorContextMenu={menus.handleOpenMirrorContextMenu}
          onCloseMirrorContextMenu={menus.handleCloseMirrorContextMenu}
          onOpenTokenContextMenu={menus.handleOpenTokenContextMenu}
          onCloseTokenContextMenu={menus.handleCloseTokenContextMenu}
          onOpenEffectContextMenu={menus.handleOpenEffectContextMenu}
          onCloseEffectContextMenu={menus.handleCloseEffectContextMenu}
          remotePlayerId={remotePlayerId}
          allowedTokenIds={allowedTokenIds}
          onRemoteTokenMove={handleRemoteTokenMove}
        />
        <GameCanvasMenus isGM={isGM} menus={menus} />
        {isGM ? <EffectWorkshop /> : null}
        {sceneReadyForPlacement ? (
          <PlacementOverlay
            containerRef={interaction.containerRef}
            center={interaction.getViewportCenterWorld}
          />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
