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
} from "@shared/index";
import {
  broadcastState,
  subscribeToStateUpdates,
  requestState,
  subscribeToStateRequests,
  type SyncState,
} from "@/lib/windowSync";
import { convexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SaveStatus } from "@/components/SaveStatusIndicator";

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
    presets: LightPreset[],
  ) => void;
  getStateHash: () => string;
  _applySyncedState: (state: SyncState) => void;
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

const persistPreset = (sceneId: string, creatorId: string, preset: LightPreset): void => {
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

const removePreset = (sceneId: string, creatorId: string, presetId: string): void => {
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
    saveStatus: "idle",
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

      if (state.sceneId && state.creatorId) {
        persistPreset(state.sceneId, state.creatorId, newPreset);
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

      if (state.sceneId && state.creatorId) {
        persistPreset(state.sceneId, state.creatorId, updatedPreset);
      }
    },
    loadPreset: (id) => {
      const state = get();
      const preset = state.presets.find((p) => p.id === id);
      if (preset) {
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

      get().loadPreset(randomPreset.id);
    },
    deletePreset: (id) => {
      const state = get();
      const nextPresets = state.presets.filter((p) => p.id !== id);

      const nextActiveId = state.activePresetId === id ? null : state.activePresetId;
      set({ presets: nextPresets, activePresetId: nextActiveId });

      if (state.sceneId && state.creatorId) {
        removePreset(state.sceneId, state.creatorId, id);
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
  })),
);

if (IS_GM) {
  useLightStore.subscribe((state, prevState) => {
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

  subscribeToStateRequests(() => {
    const state = useLightStore.getState();
    return {
      lights: state.lights,
      mirrors: state.mirrors,
      activePresetId: state.activePresetId,
    };
  });

  if (typeof window !== "undefined") {
    setTimeout(() => {
      const state = useLightStore.getState();
      broadcastState({
        lights: state.lights,
        mirrors: state.mirrors,
        activePresetId: state.activePresetId,
      });
    }, 100);
  }

  const DEBOUNCE_DELAY = 2000;
  const SAVED_DISPLAY_DURATION = 2000;

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let savedDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistedHash: string | null = null;

  useLightStore.subscribe((state, prevState) => {
    if (state.lights === prevState.lights && state.mirrors === prevState.mirrors) {
      return;
    }

    if (!state.sceneId || !state.creatorId) {
      return;
    }

    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    const { sceneId, creatorId } = state;

    persistTimer = setTimeout(() => {
      const current = useLightStore.getState();
      const currentHash = computeStateHash(current.lights, current.mirrors);

      if (currentHash === lastPersistedHash) {
        return;
      }

      if (currentHash === current.initialStateHash && lastPersistedHash === null) {
        return;
      }

      useLightStore.setState({ saveStatus: "saving" });

      convexClient
        .mutation(api.scenes.update, {
          id: sceneId as Id<"scenes">,
          creatorId,
          lights: current.lights,
          mirrors: current.mirrors,
        })
        .then(() => {
          lastPersistedHash = currentHash;
          useLightStore.setState({ saveStatus: "saved" });

          if (savedDisplayTimer) {
            clearTimeout(savedDisplayTimer);
          }
          savedDisplayTimer = setTimeout(() => {
            useLightStore.setState({ saveStatus: "idle" });
          }, SAVED_DISPLAY_DURATION);
        })
        .catch((error) => {
          console.error("Auto-save failed:", error);
          useLightStore.setState({ saveStatus: "error" });
        });
    }, DEBOUNCE_DELAY);
  });
}

if (!IS_GM) {
  subscribeToStateUpdates((syncedState) => {
    useLightStore.getState()._applySyncedState(syncedState);
  });

  if (typeof window !== "undefined") {
    requestState();
  }
}

export type { LightStoreState };
