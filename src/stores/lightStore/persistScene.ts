import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { LightPreset } from "@shared/index";

import { ANALYTICS_EVENTS, capture } from "@/lib/analytics";
import { convexClient } from "@/lib/convex";
import { computeStateHash } from "@/stores/lightStore/helpers";
import type { LightStoreApi, TokenStoreApi } from "@/stores/lightStore/types";

export const persistPreset = (sceneId: string, creatorId: string, preset: LightPreset): void => {
  convexClient
    .mutation(api.scenes.savePreset, {
      id: sceneId as Id<"scenes">,
      creatorId,
      preset,
    })
    .catch((error) => {
      console.error("Failed to persist preset:", error);
    });
};

export const removePersistedPreset = (
  sceneId: string,
  creatorId: string,
  presetId: string,
): void => {
  convexClient
    .mutation(api.scenes.deletePreset, {
      id: sceneId as Id<"scenes">,
      creatorId,
      presetId,
    })
    .catch((error) => {
      console.error("Failed to delete preset:", error);
    });
};

const DEBOUNCE_DELAY = 2000;
const SAVED_DISPLAY_DURATION = 2000;

export const createScenePersister = (lightStore: LightStoreApi, tokenStore: TokenStoreApi) => {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let savedDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistedHash: string | null = null;

  return () => {
    const state = lightStore.getState();
    if (!state.sceneId || !state.creatorId) {
      return;
    }

    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    const { sceneId, creatorId } = state;

    persistTimer = setTimeout(() => {
      const current = lightStore.getState();
      const currentTokens = tokenStore.getState();
      const currentHash = computeStateHash(
        current.lights,
        current.mirrors,
        current.effects,
        currentTokens.tokenTemplates,
        currentTokens.tokens,
      );

      if (currentHash === lastPersistedHash) {
        return;
      }

      if (currentHash === current.initialStateHash && lastPersistedHash === null) {
        return;
      }

      lightStore.setState({ saveStatus: "saving" });

      convexClient
        .mutation(api.scenes.update, {
          id: sceneId as Id<"scenes">,
          creatorId,
          lights: current.lights,
          mirrors: current.mirrors,
          effects: current.effects,
          tokenTemplates: currentTokens.tokenTemplates,
          tokens: currentTokens.tokens,
        })
        .then(() => {
          lastPersistedHash = currentHash;
          lightStore.setState({ saveStatus: "saved" });

          if (savedDisplayTimer) {
            clearTimeout(savedDisplayTimer);
          }
          savedDisplayTimer = setTimeout(() => {
            lightStore.setState({ saveStatus: "idle" });
          }, SAVED_DISPLAY_DURATION);
        })
        .catch((error) => {
          console.error("Auto-save failed:", error);
          capture(ANALYTICS_EVENTS.SceneAutosaveFailed);
          lightStore.setState({ saveStatus: "error" });
        });
    }, DEBOUNCE_DELAY);
  };
};
