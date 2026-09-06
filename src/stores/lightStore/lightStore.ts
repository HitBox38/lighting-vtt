import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { lightSchema, mirrorSchema, type Light, type LightPreset, type Mirror } from "@shared/index";
import {
  EFFECT_LIMITS,
  clampEffectRadius,
  effectInstanceSchema,
  sanitizeEffectInstances,
} from "@shared/effects";

import { cloneSerializable } from "@/lib/clone";
import { createId } from "@/lib/createId";
import {
  buildEffect,
  buildLight,
  buildMirror,
  computeStateHash,
  getIsGM,
  importEffects,
} from "@/stores/lightStore/helpers";
import { persistPreset, removePersistedPreset } from "@/stores/lightStore/persistScene";
import { registerGmSync, registerPlayerSync } from "@/stores/lightStore/sync";
import type { LightStoreState } from "@/stores/lightStore/types";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export const useLightStore = create<LightStoreState>()(
  devtools((set, get) => ({
    lights: [],
    mirrors: [],
    effects: [],
    presets: [],
    activePresetId: null,
    hoveredLightId: null,
    hoveredEffectId: null,
    sceneId: null,
    creatorId: null,
    initialStateHash: null,
    saveStatus: "idle",
    addLight: (type, x, y) => {
      const light = buildLight(type, x, y);
      set((state) => ({ lights: state.lights.concat(light) }));
      return light.id;
    },
    updateLight: (id, partial) =>
      set((state) => {
        const index = state.lights.findIndex((light) => light.id === id);
        const current = state.lights[index];
        if (index === -1 || !current) {
          return state;
        }
        const lights = state.lights.slice();
        lights[index] = lightSchema.parse({ ...current, ...partial });
        return { lights };
      }),
    removeLight: (id) =>
      set((state) => {
        const nextLights = state.lights.filter((light) => light.id !== id);
        if (nextLights.length === state.lights.length) {
          return state;
        }
        return { lights: nextLights };
      }),
    addMirror: (x, y) => {
      const mirror = buildMirror(x, y);
      set((state) => ({ mirrors: state.mirrors.concat(mirror) }));
      return mirror.id;
    },
    updateMirror: (id, partial) =>
      set((state) => {
        const index = state.mirrors.findIndex((mirror) => mirror.id === id);
        const current = state.mirrors[index];
        if (index === -1 || !current) {
          return state;
        }
        const mirrors = state.mirrors.slice();
        mirrors[index] = mirrorSchema.parse({ ...current, ...partial });
        return { mirrors };
      }),
    removeMirror: (id) =>
      set((state) => {
        const nextMirrors = state.mirrors.filter((mirror) => mirror.id !== id);
        if (nextMirrors.length === state.mirrors.length) {
          return state;
        }
        return { mirrors: nextMirrors };
      }),
    addEffect: (input) => {
      if (get().effects.length >= EFFECT_LIMITS.maxInstancesPerScene) {
        return null;
      }
      const effect = buildEffect(input);
      set((state) => ({ effects: state.effects.concat(effect) }));
      return effect.id;
    },
    updateEffect: (id, partial) =>
      set((state) => {
        const index = state.effects.findIndex((effect) => effect.id === id);
        const current = state.effects[index];
        if (index === -1 || !current) {
          return state;
        }
        const merged = { ...current, ...partial };
        if (partial.radius !== undefined) {
          merged.radius = clampEffectRadius(partial.radius);
        }
        const parsed = effectInstanceSchema.safeParse(merged);
        if (!parsed.success) {
          console.warn("Ignoring invalid effect update", id, parsed.error.issues);
          return state;
        }
        const effects = state.effects.slice();
        effects[index] = parsed.data;
        return { effects };
      }),
    removeEffect: (id) =>
      set((state) => {
        const nextEffects = state.effects.filter((effect) => effect.id !== id);
        if (nextEffects.length === state.effects.length) {
          return state;
        }
        return { effects: nextEffects };
      }),
    setHoveredEffectId: (id) => set({ hoveredEffectId: id }),
    savePreset: (name) => {
      const state = get();
      const newPreset: LightPreset = {
        id: createId(),
        name,
        lights: state.lights,
        mirrors: state.mirrors,
        effects: state.effects,
      };
      set({ presets: [...state.presets, newPreset], activePresetId: newPreset.id });
      if (state.sceneId && state.creatorId) {
        persistPreset(state.sceneId, state.creatorId, newPreset);
      }
      return newPreset.id;
    },
    updateSavedPreset: (id) => {
      const state = get();
      const index = state.presets.findIndex((preset) => preset.id === id);
      const current = state.presets[index];
      if (index === -1 || !current) return;
      const updatedPreset: LightPreset = {
        ...current,
        lights: state.lights,
        mirrors: state.mirrors,
        effects: state.effects,
      };
      const nextPresets = [...state.presets];
      nextPresets[index] = updatedPreset;
      set({ presets: nextPresets });
      if (state.sceneId && state.creatorId) {
        persistPreset(state.sceneId, state.creatorId, updatedPreset);
      }
    },
    loadPreset: (id) => {
      const preset = get().presets.find((candidate) => candidate.id === id);
      if (!preset) return;
      set({
        lights: cloneSerializable(preset.lights) as Light[],
        mirrors: cloneSerializable(preset.mirrors ?? []) as Mirror[],
        effects: importEffects(preset.effects, `preset "${preset.name}"`),
        activePresetId: id,
      });
    },
    randomizePreset: () => {
      const state = get();
      const availablePresets = state.presets.filter((preset) => preset.id !== state.activePresetId);
      const randomPreset = availablePresets[Math.floor(Math.random() * availablePresets.length)];
      if (!randomPreset) return;
      get().loadPreset(randomPreset.id);
    },
    deletePreset: (id) => {
      const state = get();
      set({
        presets: state.presets.filter((preset) => preset.id !== id),
        activePresetId: state.activePresetId === id ? null : state.activePresetId,
      });
      if (state.sceneId && state.creatorId) {
        removePersistedPreset(state.sceneId, state.creatorId, id);
      }
    },
    setHoveredLightId: (id) => set({ hoveredLightId: id }),
    loadScene: (sceneId, creatorId, lights, mirrors, effects, tokenTemplates, tokens, presets) => {
      const lightsCopy = cloneSerializable(lights);
      const mirrorsCopy = cloneSerializable(mirrors);
      const effectsCopy = importEffects(effects, "scene");
      set({
        sceneId,
        creatorId,
        lights: lightsCopy,
        mirrors: mirrorsCopy,
        effects: effectsCopy,
        presets: cloneSerializable(presets),
        initialStateHash: computeStateHash(
          lightsCopy,
          mirrorsCopy,
          effectsCopy,
          tokenTemplates,
          tokens,
        ),
        activePresetId: null,
      });
    },
    getStateHash: () => {
      const state = get();
      const tokenState = useTokenStore.getState();
      return computeStateHash(
        state.lights,
        state.mirrors,
        state.effects,
        tokenState.tokenTemplates,
        tokenState.tokens,
      );
    },
    _applySyncedState: (syncedState) => {
      set({
        lights: syncedState.lights,
        mirrors: syncedState.mirrors,
        effects: sanitizeEffectInstances(syncedState.effects ?? [], (index, reason) => {
          console.warn(`[lightStore] dropped synced effect #${index}: ${reason}`);
        }),
        activePresetId: syncedState.activePresetId,
      });
      useTokenStore.getState().applySyncedTokens(syncedState.tokenTemplates, syncedState.tokens);
    },
  })),
);

if (getIsGM()) {
  registerGmSync(useLightStore, useTokenStore);
} else {
  registerPlayerSync(useLightStore);
}

export type { LightStoreState };
