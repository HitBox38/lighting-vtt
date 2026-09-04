import { useState } from "react";

import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";
import type { MirrorContextMenuState } from "@/components/molecules/MirrorContextMenu/types";
import type { TokenContextMenuState } from "@/components/molecules/TokenContextMenu/types";

export function useOverlayMenus() {
  const [lightContextMenuState, setLightContextMenuState] = useState<LightContextMenuState | null>(
    null,
  );
  const [mirrorContextMenuState, setMirrorContextMenuState] =
    useState<MirrorContextMenuState | null>(null);
  const [tokenContextMenuState, setTokenContextMenuState] = useState<TokenContextMenuState | null>(
    null,
  );
  const [sizeEditTokenId, setSizeEditTokenId] = useState<string | null>(null);

  return {
    lightContextMenuState,
    mirrorContextMenuState,
    tokenContextMenuState,
    sizeEditTokenId,
    handleOpenLightContextMenu: (state: LightContextMenuState) => {
      setSizeEditTokenId(null);
      setTokenContextMenuState(null);
      setMirrorContextMenuState(null);
      setLightContextMenuState(state);
    },
    handleCloseLightContextMenu: () => setLightContextMenuState(null),
    handleOpenMirrorContextMenu: (state: MirrorContextMenuState) => {
      setSizeEditTokenId(null);
      setTokenContextMenuState(null);
      setLightContextMenuState(null);
      setMirrorContextMenuState(state);
    },
    handleCloseMirrorContextMenu: () => setMirrorContextMenuState(null),
    handleOpenTokenContextMenu: (state: TokenContextMenuState) => {
      setSizeEditTokenId(null);
      setLightContextMenuState(null);
      setMirrorContextMenuState(null);
      setTokenContextMenuState(state);
    },
    handleCloseTokenContextMenu: () => setTokenContextMenuState(null),
    handleStartTokenSizeEdit: (tokenId: string) => setSizeEditTokenId(tokenId),
    handleCloseTokenSizeEdit: () => setSizeEditTokenId(null),
  };
}
