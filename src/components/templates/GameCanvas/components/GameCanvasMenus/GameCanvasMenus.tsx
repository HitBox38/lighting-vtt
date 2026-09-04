import { LightContextMenu } from "@/components/molecules/LightContextMenu";
import { MirrorContextMenu } from "@/components/molecules/MirrorContextMenu";
import { TokenContextMenu } from "@/components/molecules/TokenContextMenu";
import type { useOverlayMenus } from "@/components/templates/GameCanvas/hooks/useOverlayMenus";

interface GameCanvasMenusProps {
  isGM: boolean;
  menus: ReturnType<typeof useOverlayMenus>;
}

export function GameCanvasMenus({ isGM, menus }: GameCanvasMenusProps) {
  return (
    <>
      {menus.lightContextMenuState ? (
        <LightContextMenu
          state={menus.lightContextMenuState}
          isGM={isGM}
          onClose={menus.handleCloseLightContextMenu}
        />
      ) : null}
      {menus.mirrorContextMenuState ? (
        <MirrorContextMenu
          state={menus.mirrorContextMenuState}
          isGM={isGM}
          onClose={menus.handleCloseMirrorContextMenu}
        />
      ) : null}
      {menus.tokenContextMenuState ? (
        <TokenContextMenu
          state={menus.tokenContextMenuState}
          isGM={isGM}
          onEditSize={menus.handleStartTokenSizeEdit}
          onClose={menus.handleCloseTokenContextMenu}
        />
      ) : null}
    </>
  );
}
