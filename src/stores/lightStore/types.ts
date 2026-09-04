import type { Light, LightPreset, LightType, LightUpdate, Mirror, MirrorUpdate, TokenInstance, TokenTemplate } from "@shared/index";
import type { StoreApi } from "zustand";

import type { SaveStatus } from "@/components/atoms/SaveStatusIndicator/types";
import type { SyncState } from "@/lib/windowSync";
import type { TokenStoreState } from "@/stores/tokenStore/types";

export interface LightStoreState {
  lights: Light[];
  mirrors: Mirror[];
  presets: LightPreset[];
  activePresetId: string | null;
  hoveredLightId: string | null;
  sceneId: string | null;
  creatorId: string | null;
  initialStateHash: string | null;
  saveStatus: SaveStatus;
  addLight: (type: LightType, x: number, y: number) => string;
  updateLight: (id: string, partial: LightUpdate) => void;
  removeLight: (id: string) => void;
  addMirror: (x: number, y: number) => string;
  updateMirror: (id: string, partial: MirrorUpdate) => void;
  removeMirror: (id: string) => void;
  savePreset: (name: string) => string;
  updateSavedPreset: (id: string) => void;
  loadPreset: (id: string) => void;
  randomizePreset: () => void;
  deletePreset: (id: string) => void;
  setHoveredLightId: (id: string | null) => void;
  loadScene: (
    sceneId: string,
    creatorId: string,
    lights: Light[],
    mirrors: Mirror[],
    tokenTemplates: TokenTemplate[],
    tokens: TokenInstance[],
    presets: LightPreset[],
  ) => void;
  getStateHash: () => string;
  _applySyncedState: (state: SyncState) => void;
}

export type LightStoreApi = Pick<StoreApi<LightStoreState>, "getState" | "setState" | "subscribe">;
export type TokenStoreApi = Pick<StoreApi<TokenStoreState>, "getState" | "subscribe">;
