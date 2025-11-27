import { useLightStore } from "@/stores/lightStore";
import type { Light, LightPreset, LightType, LightUpdate } from "@shared/index";

export type { Light, LightPreset, LightType, LightUpdate };

export function useLightManager() {
  const lights = useLightStore((state) => state.lights);
  const presets = useLightStore((state) => state.presets);
  const activePresetId = useLightStore((state) => state.activePresetId);
  const addLight = useLightStore((state) => state.addLight);
  const updateLight = useLightStore((state) => state.updateLight);
  const removeLight = useLightStore((state) => state.removeLight);
  const savePreset = useLightStore((state) => state.savePreset);
  const updateSavedPreset = useLightStore((state) => state.updateSavedPreset);
  const loadPreset = useLightStore((state) => state.loadPreset);
  const randomizePreset = useLightStore((state) => state.randomizePreset);
  const deletePreset = useLightStore((state) => state.deletePreset);

  return {
    lights,
    presets,
    activePresetId,
    addLight,
    updateLight,
    removeLight,
    savePreset,
    updateSavedPreset,
    loadPreset,
    randomizePreset,
    deletePreset,
  };
}
