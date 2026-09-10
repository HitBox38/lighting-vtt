import { useState } from "react";
import { usePostHog } from "@posthog/react";

import { useLightManager } from "@/stores/lightStore/hooks/useLightManager";
import { ANALYTICS_EVENTS, toCountBucket } from "@/lib/analytics";

export function usePresetActions() {
  const posthog = usePostHog();
  const {
    presets,
    activePresetId,
    savePreset,
    updateSavedPreset,
    loadPreset,
    randomizePreset,
    deletePreset,
  } = useLightManager();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [saveAttempted, setSaveAttempted] = useState(false);
  const presetNameError = saveAttempted && !newPresetName.trim() ? "Preset name is required" : null;

  const loadVia = (id: string, via: "select" | "prev" | "next") => {
    loadPreset(id);
    posthog.capture(ANALYTICS_EVENTS.PresetLoaded, { via });
  };

  const cyclePreset = (direction: -1 | 1) => {
    if (!activePresetId || presets.length < 2) return;
    const activeIndex = presets.findIndex((preset) => preset.id === activePresetId);
    if (activeIndex < 0) return;
    const nextIndex = (activeIndex + direction + presets.length) % presets.length;
    const nextPreset = presets[nextIndex];
    if (!nextPreset) return;
    loadVia(nextPreset.id, direction < 0 ? "prev" : "next");
  };

  return {
    presets,
    activePresetId,
    isSaveDialogOpen,
    setIsSaveDialogOpen: (open: boolean) => {
      setIsSaveDialogOpen(open);
      setSaveAttempted(false);
    },
    newPresetName,
    presetNameError,
    setNewPresetName,
    canCyclePresets: Boolean(activePresetId) && presets.length > 1,
    saveDialogLabel: activePresetId ? "Save As New Preset" : "Save New Preset",
    handleSaveAsNew: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaveAttempted(true);
      const presetName = newPresetName.trim();
      if (!presetName) {
        event.currentTarget.querySelector<HTMLInputElement>('[name="presetName"]')?.focus();
        return;
      }
      savePreset(presetName);
      posthog.capture(ANALYTICS_EVENTS.PresetSavedNew, {
        preset_count_bucket: toCountBucket(presets.length + 1),
      });
      setNewPresetName("");
      setSaveAttempted(false);
      setIsSaveDialogOpen(false);
    },
    handleUpdateCurrent: () => {
      if (!activePresetId) return;
      updateSavedPreset(activePresetId);
      posthog.capture(ANALYTICS_EVENTS.PresetUpdatedCurrent);
    },
    handleValueChange: (value: string) => loadVia(value, "select"),
    handleDelete: () => {
      if (!activePresetId) return;
      deletePreset(activePresetId);
      posthog.capture(ANALYTICS_EVENTS.PresetDeleted);
    },
    handlePreviousPreset: () => cyclePreset(-1),
    handleNextPreset: () => cyclePreset(1),
    handleRandomizePreset: () => {
      randomizePreset();
      posthog.capture(ANALYTICS_EVENTS.PresetRandomized, {
        preset_count_bucket: toCountBucket(presets.length),
      });
    },
  };
}
