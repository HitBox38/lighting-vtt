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
import { useRemoteTokenMove } from "@/components/templates/GameCanvas/hooks/useRemoteTokenMove";
import { useViewportSize } from "@/components/templates/GameCanvas/hooks/useViewportSize";
import type { GameCanvasProps } from "@/components/templates/GameCanvas/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useUIPreferencesStore } from "@/stores/uiPreferencesStore";

extend({ Container: PixiContainer, Sprite: PixiSprite, Graphics: PixiGraphics });

export function GameCanvas({
  mapUrl,
  isGM = true,
  remotePlayerId,
  sceneId,
}: GameCanvasProps) {
  const sidebarSide = useUIPreferencesStore((state) => state.sidebarSide);
  const sidebarOpen = useUIPreferencesStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIPreferencesStore((state) => state.setSidebarOpen);
  const viewportSize = useViewportSize();
  const mapTexture = useMapTexture(mapUrl);
  const menus = useOverlayMenus();
  const { allowedTokenIds } = useAllowedTokenIds(sceneId, remotePlayerId);
  const handleRemoteTokenMove = useRemoteTokenMove(sceneId, remotePlayerId);
  const interaction = useCanvasInteraction({ isGM, mapTexture, viewportSize });

  return (
    <SidebarProvider side={sidebarSide} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <InitiativeSidebar isGM={isGM} />
      <SidebarInset className="relative h-screen overflow-hidden">
        {isGM ? (
          <GameCanvasHud
            sceneId={sceneId}
            getViewportCenterWorld={interaction.getViewportCenterWorld}
          />
        ) : null}
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
          remotePlayerId={remotePlayerId}
          allowedTokenIds={allowedTokenIds}
          onRemoteTokenMove={handleRemoteTokenMove}
        />
        <GameCanvasMenus isGM={isGM} menus={menus} />
      </SidebarInset>
    </SidebarProvider>
  );
}
