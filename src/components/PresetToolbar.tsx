import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { ArrowLeft, ArrowRight, FilePlus, Save, Shuffle, Trash2 } from "lucide-react";
import { useLightManager } from "@/hooks/useLightManager";
import { ANALYTICS_EVENTS, toCountBucket } from "@/lib/analytics";
import { HudSurface } from "@/components/hud/HudSurface";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PresetToolbar() {
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

  const canCyclePresets = Boolean(activePresetId) && presets.length > 1;
  const saveDialogLabel = activePresetId ? "Save As New Preset" : "Save New Preset";

  const handleSaveAsNew = (e: React.FormEvent) => {
    e.preventDefault();
    const presetName = newPresetName.trim();
    if (!presetName) {
      return;
    }

    savePreset(presetName);
    posthog.capture(ANALYTICS_EVENTS.PresetSavedNew, {
      preset_count_bucket: toCountBucket(presets.length + 1),
    });
    setNewPresetName("");
    setIsSaveDialogOpen(false);
  };

  const handleUpdateCurrent = () => {
    if (activePresetId) {
      updateSavedPreset(activePresetId);
      posthog.capture(ANALYTICS_EVENTS.PresetUpdatedCurrent);
    }
  };

  const handleValueChange = (value: string) => {
    loadPreset(value);
    posthog.capture(ANALYTICS_EVENTS.PresetLoaded, { via: "select" });
  };

  const handleDelete = () => {
    if (activePresetId) {
      deletePreset(activePresetId);
      posthog.capture(ANALYTICS_EVENTS.PresetDeleted);
    }
  };

  const handlePreviousPreset = () => {
    if (!activePresetId || presets.length < 2) {
      return;
    }

    const activeIndex = presets.findIndex((preset) => preset.id === activePresetId);
    if (activeIndex < 0) {
      return;
    }

    const previousIndex = activeIndex > 0 ? activeIndex - 1 : presets.length - 1;
    loadPreset(presets[previousIndex].id);
    posthog.capture(ANALYTICS_EVENTS.PresetLoaded, { via: "prev" });
  };

  const handleNextPreset = () => {
    if (!activePresetId || presets.length < 2) {
      return;
    }

    const activeIndex = presets.findIndex((preset) => preset.id === activePresetId);
    if (activeIndex < 0) {
      return;
    }

    const nextIndex = activeIndex < presets.length - 1 ? activeIndex + 1 : 0;
    loadPreset(presets[nextIndex].id);
    posthog.capture(ANALYTICS_EVENTS.PresetLoaded, { via: "next" });
  };

  const handleRandomizePreset = () => {
    randomizePreset();
    posthog.capture(ANALYTICS_EVENTS.PresetRandomized, {
      preset_count_bucket: toCountBucket(presets.length),
    });
  };

  return (
    <TooltipProvider>
      <HudSurface className="items-center gap-2">
        <div className="min-w-0">
          <Select value={activePresetId || ""} onValueChange={handleValueChange}>
            <SelectTrigger className="h-8 w-[200px] min-w-[160px]">
              <SelectValue placeholder="Select preset…" />
            </SelectTrigger>
            <SelectContent>
              {presets.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">No presets</div>
              ) : (
                presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden h-5 w-px bg-border/70 sm:block" aria-hidden="true" />

        <div className="flex items-center gap-1.5">
          {activePresetId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={handleUpdateCurrent}
                  aria-label="Update Current Preset">
                  <Save className="size-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Update Current Preset</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Dialog
            open={isSaveDialogOpen}
            onOpenChange={(open) => {
              setIsSaveDialogOpen(open);
              if (!open) {
                setNewPresetName("");
              }
            }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button size="icon-sm" variant="outline" aria-label={saveDialogLabel}>
                    {activePresetId ? (
                      <FilePlus className="size-4" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{saveDialogLabel}</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{saveDialogLabel}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveAsNew} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input
                    id="preset-name"
                    name="presetName"
                    placeholder="Preset name…"
                    autoComplete="off"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="hidden h-5 w-px bg-border/70 sm:block" aria-hidden="true" />

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canCyclePresets}
                onClick={handlePreviousPreset}
                aria-label="Go to Previous Preset">
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Go to Previous Preset</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={handleRandomizePreset}
                disabled={presets.length < 2}
                aria-label="Randomize Preset">
                <Shuffle className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Randomize Preset</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canCyclePresets}
                onClick={handleNextPreset}
                aria-label="Go to Next Preset">
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Go to Next Preset</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="hidden h-5 w-px bg-border/70 sm:block" aria-hidden="true" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={!activePresetId}
              aria-label="Delete Current Preset">
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Delete Current Preset</p>
          </TooltipContent>
        </Tooltip>
      </HudSurface>
    </TooltipProvider>
  );
}
