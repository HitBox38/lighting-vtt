import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { getAnalyticsContext } from "@/lib/analyticsContext";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { LightPreset } from "@shared/index";

import { ANALYTICS_EVENTS, capture, errorCategory, toCountBucket } from "@/lib/analytics";
import { convexClient } from "@/lib/convex";
import { computeStateHash } from "@/stores/lightStore/helpers";
import type { LightStoreApi, TokenStoreApi } from "@/stores/lightStore/types";

export const persistPreset = (sceneId: string, creatorId: string, preset: LightPreset, operation: "new" | "update", count: number): void => {
  const measurable = analyticsOperationGuard();
  convexClient
    .mutation(api.scenes.savePreset, {
      id: sceneId as Id<"scenes">,
      creatorId,
      preset,
    })
    .then(() => measurable() && capture(operation === "new" ? ANALYTICS_EVENTS.PresetSavedNew : ANALYTICS_EVENTS.PresetUpdatedCurrent, { scene_id: sceneId, role: "gm", preset_count_bucket: toCountBucket(count) }))
    .catch((error) => {
      if (measurable()) capture(ANALYTICS_EVENTS.PresetMutationFailed, { scene_id: sceneId, role: "gm", operation, error_category: errorCategory(error) });
      console.error("Failed to persist preset:", error);
    });
};

export const removePersistedPreset = (
  sceneId: string,
  creatorId: string,
  presetId: string,
): void => {
  const measurable = analyticsOperationGuard();
  convexClient
    .mutation(api.scenes.deletePreset, {
      id: sceneId as Id<"scenes">,
      creatorId,
      presetId,
    })
    .then(() => measurable() && capture(ANALYTICS_EVENTS.PresetDeleted, { scene_id: sceneId, role: "gm" }))
    .catch((error) => {
      if (measurable()) capture(ANALYTICS_EVENTS.PresetMutationFailed, { scene_id: sceneId, role: "gm", operation: "delete", error_category: errorCategory(error) });
      console.error("Failed to delete preset:", error);
    });
};

const DEBOUNCE_DELAY = 2000;
const SAVED_DISPLAY_DURATION = 2000;

export const createScenePersister = (lightStore: LightStoreApi, tokenStore: TokenStoreApi) => {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let savedDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistedHash: string | null = null;
  let lastScene: string | null = null;
  let lastVisit: string | number | boolean | null | undefined;
  let trackedEdit = false;
  let failed = false;

  return () => {
    const state = lightStore.getState();
    if (!state.sceneId || !state.creatorId) {
      return;
    }

    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    const { sceneId, creatorId } = state;
    const context = getAnalyticsContext();
    if (lastScene !== sceneId || lastVisit !== context.scene_visit_id) { lastScene = sceneId; lastVisit = context.scene_visit_id; lastPersistedHash = null; trackedEdit = false; failed = false; }

    persistTimer = setTimeout(() => {
      const current = lightStore.getState();
      if (current.sceneId !== sceneId || getAnalyticsContext().scene_visit_id !== context.scene_visit_id) return;
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

      const measurableSave = analyticsOperationGuard();
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
          if (lightStore.getState().sceneId !== sceneId || getAnalyticsContext().scene_visit_id !== context.scene_visit_id) return;
          if (measurableSave() && !trackedEdit) trackedEdit = capture(ANALYTICS_EVENTS.SceneEditPersisted, { ...context, scene_id: sceneId, role: "gm" });
          if (measurableSave() && failed) capture(ANALYTICS_EVENTS.SceneAutosaveRecovered, { ...context, scene_id: sceneId, role: "gm" });
          failed = false;
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
          if (lightStore.getState().sceneId !== sceneId || getAnalyticsContext().scene_visit_id !== context.scene_visit_id) return;
          if (measurableSave() && !failed) capture(ANALYTICS_EVENTS.SceneAutosaveFailed, { ...context, scene_id: sceneId, role: "gm", error_category: errorCategory(error) });
          failed = true;
          lightStore.setState({ saveStatus: "error" });
        });
    }, DEBOUNCE_DELAY);
  };
};
