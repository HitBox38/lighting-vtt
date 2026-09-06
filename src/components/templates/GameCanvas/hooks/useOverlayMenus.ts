import { useState } from "react";
import { useWorkshopStore } from "@/stores/workshopStore";

import type { EffectContextMenuState } from "@/components/molecules/EffectContextMenu/types";
import type { EffectParamsPanelState } from "@/components/molecules/EffectParamsPanel/types";
import type { LightContextMenuState } from "@/components/molecules/LightContextMenu/types";
import type { MirrorContextMenuState } from "@/components/molecules/MirrorContextMenu/types";
import type { TokenContextMenuState } from "@/components/molecules/TokenContextMenu/types";

export function useOverlayMenus() {
  const [lightContextMenuState, setLightContextMenuState] =
    useState<LightContextMenuState | null>(null);
  const [mirrorContextMenuState, setMirrorContextMenuState] =
    useState<MirrorContextMenuState | null>(null);
  const [tokenContextMenuState, setTokenContextMenuState] =
    useState<TokenContextMenuState | null>(null);
  const [effectContextMenuState, setEffectContextMenuState] =
    useState<EffectContextMenuState | null>(null);
  const [effectParamsPanelState, setEffectParamsPanelState] =
    useState<EffectParamsPanelState | null>(null);
  const [sizeEditTokenId, setSizeEditTokenId] = useState<string | null>(null);

  const closeAll = () => {
    setSizeEditTokenId(null);
    setLightContextMenuState(null);
    setMirrorContextMenuState(null);
    setTokenContextMenuState(null);
    setEffectContextMenuState(null);
    setEffectParamsPanelState(null);
  };

  return {
    lightContextMenuState,
    mirrorContextMenuState,
    tokenContextMenuState,
    effectContextMenuState,
    effectParamsPanelState,
    sizeEditTokenId,
    handleOpenLightContextMenu: (state: LightContextMenuState) => {
      closeAll();
      setLightContextMenuState(state);
    },
    handleCloseLightContextMenu: () => setLightContextMenuState(null),
    handleOpenMirrorContextMenu: (state: MirrorContextMenuState) => {
      closeAll();
      setMirrorContextMenuState(state);
    },
    handleCloseMirrorContextMenu: () => setMirrorContextMenuState(null),
    handleOpenTokenContextMenu: (state: TokenContextMenuState) => {
      closeAll();
      setTokenContextMenuState(state);
    },
    handleCloseTokenContextMenu: () => setTokenContextMenuState(null),
    handleOpenEffectContextMenu: (state: EffectContextMenuState) => {
      closeAll();
      setEffectContextMenuState(state);
    },
    handleCloseEffectContextMenu: () => setEffectContextMenuState(null),
    handleOpenEffectParams: (state: EffectParamsPanelState) => {
      closeAll();
      useWorkshopStore
        .getState()
        .select({ kind: "effect", id: state.effectId });
    },
    handleCloseEffectParams: () => setEffectParamsPanelState(null),
    handleStartTokenSizeEdit: (tokenId: string) => {
      closeAll();
      setSizeEditTokenId(tokenId);
    },
    handleCloseTokenSizeEdit: () => setSizeEditTokenId(null),
  };
}
