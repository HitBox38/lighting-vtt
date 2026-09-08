import { Application } from "@pixi/react";
import type {
  Container as PixiContainer,
  Sprite as PixiSprite,
  Texture as PixiTexture,
} from "pixi.js";
import type { Application as PixiApplication } from "pixi.js";
import type { RefObject } from "react";

import { EffectControls } from "@/components/organisms/EffectControls";
import { SelectionOutline } from "@/components/organisms/EffectWorkshop/SelectionOutline";
import { EffectLayer } from "@/components/organisms/EffectLayer";
import { LightControls } from "@/components/organisms/LightControls";
import { LightingLayer } from "@/components/organisms/LightingLayer";
import { MirrorControls } from "@/components/organisms/MirrorControls";
import { MirrorLayer } from "@/components/organisms/MirrorLayer";
import { TokenControls } from "@/components/organisms/TokenControls";
import { TokenLayer } from "@/components/organisms/TokenLayer";
import type { EffectContextMenuState } from "@/components/molecules/EffectContextMenu/types";
import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";
import type { MirrorContextMenuState } from "@/components/molecules/MirrorContextMenu/types";
import type { TokenContextMenuState } from "@/components/molecules/TokenContextMenu/types";

interface GameCanvasStageProps {
  viewportSize: { width: number; height: number };
  mapTexture: PixiTexture | null;
  isGM: boolean;
  containerRef: RefObject<PixiContainer | null>;
  spriteRef: RefObject<PixiSprite | null>;
  onAppInit: (app: PixiApplication) => void;
  sizeEditTokenId: string | null;
  onCloseSizeEdit: () => void;
  onOpenLightContextMenu: (state: LightContextMenuState) => void;
  onCloseLightContextMenu: () => void;
  onOpenMirrorContextMenu: (state: MirrorContextMenuState) => void;
  onCloseMirrorContextMenu: () => void;
  onOpenTokenContextMenu: (state: TokenContextMenuState) => void;
  onCloseTokenContextMenu: () => void;
  onOpenEffectContextMenu: (state: EffectContextMenuState) => void;
  onCloseEffectContextMenu: () => void;
  remotePlayerId?: string | null;
  allowedTokenIds: Set<string>;
  onRemoteTokenMove: (tokenId: string, x: number, y: number) => void;
}

export function GameCanvasStage({
  viewportSize,
  mapTexture,
  isGM,
  containerRef,
  spriteRef,
  onAppInit,
  sizeEditTokenId,
  onCloseSizeEdit,
  onOpenLightContextMenu,
  onCloseLightContextMenu,
  onOpenMirrorContextMenu,
  onCloseMirrorContextMenu,
  onOpenTokenContextMenu,
  onCloseTokenContextMenu,
  onOpenEffectContextMenu,
  onCloseEffectContextMenu,
  remotePlayerId,
  allowedTokenIds,
  onRemoteTokenMove,
}: GameCanvasStageProps) {
  const lightingWidth = mapTexture?.width ?? viewportSize.width;
  const lightingHeight = mapTexture?.height ?? viewportSize.height;
  const resolution =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  return (
    <Application
      width={viewportSize.width}
      height={viewportSize.height}
      resolution={resolution}
      autoDensity
      antialias
      backgroundColor={0x000000}
      className="block h-full w-full"
      onInit={onAppInit}
    >
      <pixiContainer ref={containerRef}>
        {mapTexture ? (
          <pixiSprite ref={spriteRef} texture={mapTexture} />
        ) : null}
        <LightingLayer
          width={lightingWidth}
          height={lightingHeight}
          isGM={isGM}
          remotePlayerId={remotePlayerId}
        />
        {mapTexture ? (
          <EffectLayer isGM={isGM} mapTexture={mapTexture} remotePlayerId={remotePlayerId} />
        ) : null}
        <MirrorLayer isGM={isGM} />
        <TokenLayer isGM={isGM} />
        {isGM ? <SelectionOutline /> : null}
        <LightControls
          isGM={isGM}
          onOpenContextMenu={onOpenLightContextMenu}
          onCloseContextMenu={onCloseLightContextMenu}
        />
        <MirrorControls
          isGM={isGM}
          onOpenContextMenu={onOpenMirrorContextMenu}
          onCloseContextMenu={onCloseMirrorContextMenu}
        />
        <EffectControls
          isGM={isGM}
          onOpenContextMenu={onOpenEffectContextMenu}
          onCloseContextMenu={onCloseEffectContextMenu}
        />
        <TokenControls
          isGM={isGM}
          sizeEditTokenId={sizeEditTokenId}
          onCloseSizeEdit={onCloseSizeEdit}
          onOpenContextMenu={onOpenTokenContextMenu}
          onCloseContextMenu={onCloseTokenContextMenu}
          remotePlayerId={remotePlayerId}
          allowedTokenIds={allowedTokenIds}
          onRemoteTokenMove={onRemoteTokenMove}
        />
      </pixiContainer>
    </Application>
  );
}
