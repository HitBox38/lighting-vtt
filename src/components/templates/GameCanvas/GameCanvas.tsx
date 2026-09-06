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
import { GameCanvasHud } from "@/components/templates/GameCanvas/components/GameCanvasHud";
import { GameCanvasMenus } from "@/components/templates/GameCanvas/components/GameCanvasMenus";
import { GameCanvasStage } from "@/components/templates/GameCanvas/components/GameCanvasStage";
import { useAllowedTokenIds } from "@/components/templates/GameCanvas/hooks/useAllowedTokenIds";
import { useCanvasInteraction } from "@/components/templates/GameCanvas/hooks/useCanvasInteraction";
import { useMapTexture } from "@/components/templates/GameCanvas/hooks/useMapTexture";
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
  useEffect(() => {
    useWorkshopStore.setState({
      sceneStartedAt: Date.now(),
      completedCount: 0,
    });
    return () => useWorkshopStore.getState().reset();
  }, [sceneId]);
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIPreferencesStore((state) => state.setSidebarOpen);
  const windowSize = useViewportSize();
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
  const mapTexture = useMapTexture(mapUrl);
  const menus = useOverlayMenus();
  const { allowedTokenIds } = useAllowedTokenIds(sceneId, remotePlayerId);
  const handleRemoteTokenMove = useRemoteTokenMove(sceneId, remotePlayerId);
  const interaction = useCanvasInteraction({ isGM, mapTexture, viewportSize });
  const storeSceneId = useLightStore((state) => state.sceneId);

  const handlePlaceEffect = (effectId: string, version: number) =>
    useWorkshopStore
      .getState()
      .begin({ kind: "effect", effectId, version, name: "Effect" });

  const sceneReadyForPlacement =
    isGM && mapTexture !== null && (sceneId ? storeSceneId === sceneId : true);
  usePendingEffectPlacement(sceneReadyForPlacement, handlePlaceEffect);

  return (
    <SidebarProvider
      side={sidebarSide}
      open={sidebarOpen && !(isGM && (workshopOpen || placingEffect) && windowSize.width < 1024)}
      onOpenChange={setSidebarOpen}
    >
      <InitiativeSidebar isGM={isGM} />
      <WorkshopTelemetry isGM={isGM} />
      <SidebarInset ref={insetRef} className="relative h-dvh overflow-hidden">
        {isGM ? <GameCanvasHud sceneId={sceneId} /> : null}
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
          <FrameCounter appRef={interaction.appRef} />
        </div>
        <GameCanvasStage
          viewportSize={viewportSize}
          mapTexture={mapTexture}
          isGM={isGM}
          containerRef={interaction.containerRef}
          spriteRef={interaction.spriteRef}
          onAppInit={interaction.handleAppInit}
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
