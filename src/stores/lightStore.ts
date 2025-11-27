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
  DEFAULT_MIRROR_LENGTH,
  type Mirror,
  type MirrorUpdate,
  mirrorSchema,
  type SavePresetResponse,
  type DeletePresetResponse,
} from "@shared/index";
import {
  broadcastState,
  subscribeToStateUpdates,
  requestState,
  subscribeToStateRequests,
  type SyncState,
} from "@/lib/windowSync";

// Check if this is a GM window (defaults to true)
const getIsGM = (): boolean => {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("isGM") !== "false";
};

const IS_GM = getIsGM();

interface LightStoreState {
  lights: Light[];
  mirrors: Mirror[];
  presets: LightPreset[];
  activePresetId: string | null;
  hoveredLightId: string | null;
  sceneId: string | null;
  creatorId: string | null;
  initialStateHash: string | null;
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
    presets: LightPreset[]
  ) => void;
  getStateHash: () => string;
  // Internal method for applying synced state from GM
  _applySyncedState: (state: SyncState) => void;
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

// API helper functions for preset operations
const savePresetToAPI = async (
  sceneId: string,
  creatorId: string,
  preset: LightPreset
): Promise<SavePresetResponse> => {
  try {
    const response = await fetch(`/api/scene/${sceneId}/presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId, preset }),
    });
    return (await response.json()) as SavePresetResponse;
  } catch (error) {
    console.error("Failed to save preset to API:", error);
    return { message: "Network error", success: false, payload: null };
  }
};

const deletePresetFromAPI = async (
  sceneId: string,
  creatorId: string,
  presetId: string
): Promise<DeletePresetResponse> => {
  try {
    const response = await fetch(`/api/scene/${sceneId}/presets/${presetId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
    return (await response.json()) as DeletePresetResponse;
  } catch (error) {
    console.error("Failed to delete preset from API:", error);
    return { message: "Network error", success: false };
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

const buildMirror = (x: number, y: number): Mirror => {
  const halfLength = DEFAULT_MIRROR_LENGTH / 2;
  const candidate = {
    id: createId(),
    x1: x - halfLength,
    y1: y,
    x2: x + halfLength,
    y2: y,
  };
  return mirrorSchema.parse(candidate);
};

const computeStateHash = (lights: Light[], mirrors: Mirror[]): string => {
  return JSON.stringify({ lights, mirrors });
};

export const useLightStore = create<LightStoreState>()(
  devtools((set, get) => ({
    lights: [],
    mirrors: [],
    presets: [],
    activePresetId: null,
    hoveredLightId: null,
    sceneId: null,
    creatorId: null,
    initialStateHash: null,
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
    addMirror: (x, y) => {
      const mirror = buildMirror(x, y);
      set((state) => ({ mirrors: state.mirrors.concat(mirror) }));
      return mirror.id;
    },
    updateMirror: (id, partial) =>
      set((state) => {
        const index = state.mirrors.findIndex((mirror) => mirror.id === id);
        if (index === -1) {
          return state;
        }
        const nextMirror = mirrorSchema.parse({
          ...state.mirrors[index],
          ...partial,
        });
        const mirrors = state.mirrors.slice();
        mirrors[index] = nextMirror;
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
    savePreset: (name) => {
      const state = get();
      const newPreset: LightPreset = {
        id: createId(),
        name,
        lights: state.lights,
        mirrors: state.mirrors,
      };
      const nextPresets = [...state.presets, newPreset];
      set({ presets: nextPresets, activePresetId: newPreset.id });

      // Persist to API if we have a scene loaded
      if (state.sceneId && state.creatorId) {
        void savePresetToAPI(state.sceneId, state.creatorId, newPreset);
      }

      return newPreset.id;
    },
    updateSavedPreset: (id) => {
      const state = get();
      const index = state.presets.findIndex((p) => p.id === id);
      if (index === -1) return;

      const updatedPreset: LightPreset = {
        ...state.presets[index],
        lights: state.lights,
        mirrors: state.mirrors,
      };
      const nextPresets = [...state.presets];
      nextPresets[index] = updatedPreset;
      set({ presets: nextPresets });

      // Persist to API if we have a scene loaded
      if (state.sceneId && state.creatorId) {
        void savePresetToAPI(state.sceneId, state.creatorId, updatedPreset);
      }
    },
    loadPreset: (id) => {
      const state = get();
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
        // Deep copy lights and mirrors to avoid reference issues if modified
        const lightsCopy = JSON.parse(JSON.stringify(preset.lights));
        const mirrorsCopy = JSON.parse(JSON.stringify(preset.mirrors ?? []));
        set({ lights: lightsCopy, mirrors: mirrorsCopy, activePresetId: id });
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

      const nextActiveId = state.activePresetId === id ? null : state.activePresetId;
      set({ presets: nextPresets, activePresetId: nextActiveId });

      // Persist to API if we have a scene loaded
      if (state.sceneId && state.creatorId) {
        void deletePresetFromAPI(state.sceneId, state.creatorId, id);
      }
    },
    setHoveredLightId: (id) => set({ hoveredLightId: id }),
    loadScene: (sceneId, creatorId, lights, mirrors, presets) => {
      const lightsCopy = JSON.parse(JSON.stringify(lights)) as Light[];
      const mirrorsCopy = JSON.parse(JSON.stringify(mirrors)) as Mirror[];
      const presetsCopy = JSON.parse(JSON.stringify(presets)) as LightPreset[];
      const hash = computeStateHash(lightsCopy, mirrorsCopy);
      set({
        sceneId,
        creatorId,
        lights: lightsCopy,
        mirrors: mirrorsCopy,
        presets: presetsCopy,
        initialStateHash: hash,
        activePresetId: null,
      });
    },
    getStateHash: () => {
      const state = get();
      return computeStateHash(state.lights, state.mirrors);
    },
    _applySyncedState: (syncedState) => {
      set({
        lights: syncedState.lights,
        mirrors: syncedState.mirrors,
        activePresetId: syncedState.activePresetId,
      });
    },
  }))
);

// Subscribe to state changes and broadcast (GM only)
if (IS_GM) {
  useLightStore.subscribe((state, prevState) => {
    // Only broadcast if lights, mirrors, or activePresetId changed
    if (
      state.lights !== prevState.lights ||
      state.mirrors !== prevState.mirrors ||
      state.activePresetId !== prevState.activePresetId
    ) {
      broadcastState({
        lights: state.lights,
        mirrors: state.mirrors,
        activePresetId: state.activePresetId,
      });
    }
  });

  // Listen for state requests from player windows and respond
  subscribeToStateRequests(() => {
    const state = useLightStore.getState();
    return {
      lights: state.lights,
      mirrors: state.mirrors,
      activePresetId: state.activePresetId,
    };
  });

  // Broadcast initial state when GM window is ready
  if (typeof window !== "undefined") {
    // Small delay to ensure store is initialized
    setTimeout(() => {
      const state = useLightStore.getState();
      broadcastState({
        lights: state.lights,
        mirrors: state.mirrors,
        activePresetId: state.activePresetId,
      });
    }, 100);
  }
}

// Subscribe to GM updates (player windows only)
if (!IS_GM) {
  subscribeToStateUpdates((syncedState) => {
    useLightStore.getState()._applySyncedState(syncedState);
  });

  // Request current state when player window loads
  if (typeof window !== "undefined") {
    requestState();
  }
}

export type { LightStoreState };
