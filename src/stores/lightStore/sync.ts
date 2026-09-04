import {
  broadcastState,
  requestState,
  subscribeToStateRequests,
  subscribeToStateUpdates,
  type SyncState,
} from "@/lib/windowSync";
import { createScenePersister } from "@/stores/lightStore/persistScene";
import type { LightStoreApi, TokenStoreApi } from "@/stores/lightStore/types";

const getCombinedSyncState = (lightStore: LightStoreApi, tokenStore: TokenStoreApi): SyncState => {
  const lightState = lightStore.getState();
  const tokenState = tokenStore.getState();
  return {
    lights: lightState.lights,
    mirrors: lightState.mirrors,
    tokenTemplates: tokenState.tokenTemplates,
    tokens: tokenState.tokens,
    activePresetId: lightState.activePresetId,
  };
};

export const registerGmSync = (lightStore: LightStoreApi, tokenStore: TokenStoreApi): void => {
  const schedulePersist = createScenePersister(lightStore, tokenStore);

  lightStore.subscribe((state, prevState) => {
    if (state.lights !== prevState.lights || state.mirrors !== prevState.mirrors) {
      broadcastState(getCombinedSyncState(lightStore, tokenStore));
      schedulePersist();
      return;
    }
    if (state.activePresetId !== prevState.activePresetId) {
      broadcastState(getCombinedSyncState(lightStore, tokenStore));
    }
  });

  tokenStore.subscribe((state, prevState) => {
    if (state.tokenTemplates !== prevState.tokenTemplates || state.tokens !== prevState.tokens) {
      broadcastState(getCombinedSyncState(lightStore, tokenStore));
      schedulePersist();
    }
  });

  subscribeToStateRequests(() => getCombinedSyncState(lightStore, tokenStore));

  if (typeof window !== "undefined") {
    setTimeout(() => {
      broadcastState(getCombinedSyncState(lightStore, tokenStore));
    }, 100);
  }
};

export const registerPlayerSync = (lightStore: LightStoreApi): void => {
  subscribeToStateUpdates((syncedState) => {
    lightStore.getState()._applySyncedState(syncedState);
  });

  if (typeof window !== "undefined") {
    requestState();
  }
};
