import { ArrowLeft, ArrowRight, Shuffle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { usePresetActions } from "@/components/organisms/PresetToolbar/hooks/usePresetActions";

type Actions = ReturnType<typeof usePresetActions>;

export function PresetCycleControls({ actions }: { actions: Actions }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={!actions.canCyclePresets}
              onClick={actions.handlePreviousPreset}
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
              onClick={actions.handleRandomizePreset}
              disabled={actions.presets.length < 2}
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
              disabled={!actions.canCyclePresets}
              onClick={actions.handleNextPreset}
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
            onClick={actions.handleDelete}
            disabled={!actions.activePresetId}
            aria-label="Delete Current Preset">
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Delete Current Preset</p>
        </TooltipContent>
      </Tooltip>
    </>
  );
}
