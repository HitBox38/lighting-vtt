import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  DEFAULT_CONE_ANGLE,
  DEFAULT_LIGHT_COLOR,
  DEFAULT_LIGHT_INTENSITY,
  DEFAULT_LIGHT_RADIUS,
  type Light,
  type LightPreset,
  type LightType,
  type LightUpdate,
  lightSchema,
} from "@/types/light";

type LightStoreState = {
  lights: Light[];
  presets: LightPreset[];
  activePresetId: string | null;
  addLight: (type: LightType, x: number, y: number) => string;
  updateLight: (id: string, partial: LightUpdate) => void;
  removeLight: (id: string) => void;
  savePreset: (name: string) => string;
  updateSavedPreset: (id: string) => void;
  loadPreset: (id: string) => void;
  randomizePreset: () => void;
  deletePreset: (id: string) => void;
};

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

const STORAGE_KEY = "lighting-vtt-presets";

const loadPresetsFromStorage = (): LightPreset[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LightPreset[];
  } catch (error) {
    console.error("Failed to load presets from storage:", error);
    return [];
  }
};

const savePresetsToStorage = (presets: LightPreset[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Failed to save presets to storage:", error);
  }
};

const buildLight = (type: LightType, x: number, y: number): Light => {
  const base = {
    id: createId(),
    type,
    x,
    y,
    radius: DEFAULT_LIGHT_RADIUS,
    color: DEFAULT_LIGHT_COLOR,
    intensity: DEFAULT_LIGHT_INTENSITY,
  };

  const candidate = (() => {
    if (type === "radial") {
      return base;
    }

    if (type === "line") {
      return {
        ...base,
        radius: 10,
        targetX: x + DEFAULT_LIGHT_RADIUS,
        targetY: y,
      };
    }

    return {
      ...base,
      coneAngle: DEFAULT_CONE_ANGLE,
      targetX: x + DEFAULT_LIGHT_RADIUS,
      targetY: y,
    };
  })();

  return lightSchema.parse(candidate);
};

export const useLightStore = create<LightStoreState>()(
  devtools((set, get) => ({
    lights: [],
    presets: loadPresetsFromStorage(),
    activePresetId: null,
    addLight: (type, x, y) => {
      const light = buildLight(type, x, y);
      set((state) => ({ lights: state.lights.concat(light) }));
      return light.id;
    },
    updateLight: (id, partial) =>
      set((state) => {
        const index = state.lights.findIndex((light) => light.id === id);
        if (index === -1) {
          return state;
        }
        const nextLight = lightSchema.parse({
          ...state.lights[index],
          ...partial,
        });
        const lights = state.lights.slice();
        lights[index] = nextLight;
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
    savePreset: (name) => {
      const state = get();
      const newPreset: LightPreset = {
        id: createId(),
        name,
        lights: state.lights,
      };
      const nextPresets = [...state.presets, newPreset];
      savePresetsToStorage(nextPresets);
      set({ presets: nextPresets, activePresetId: newPreset.id });
      return newPreset.id;
    },
    updateSavedPreset: (id) => {
      const state = get();
      const index = state.presets.findIndex((p) => p.id === id);
      if (index === -1) return;

      const updatedPreset = { ...state.presets[index], lights: state.lights };
      const nextPresets = [...state.presets];
      nextPresets[index] = updatedPreset;
      savePresetsToStorage(nextPresets);
      set({ presets: nextPresets });
    },
    loadPreset: (id) => {
      const state = get();
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
        // Deep copy lights to avoid reference issues if modified
        const lightsCopy = JSON.parse(JSON.stringify(preset.lights));
        set({ lights: lightsCopy, activePresetId: id });
      }
    },
    randomizePreset: () => {
      const state = get();
      const availablePresets = state.presets.filter((p) => p.id !== state.activePresetId);
      if (availablePresets.length === 0) return;

      const randomIndex = Math.floor(Math.random() * availablePresets.length);
      const randomPreset = availablePresets[randomIndex];

      // Reuse loadPreset logic
      get().loadPreset(randomPreset.id);
    },
    deletePreset: (id) => {
      const state = get();
      const nextPresets = state.presets.filter((p) => p.id !== id);
      savePresetsToStorage(nextPresets);

      const nextActiveId = state.activePresetId === id ? null : state.activePresetId;
      set({ presets: nextPresets, activePresetId: nextActiveId });
    },
  }))
);

export type { LightStoreState };
