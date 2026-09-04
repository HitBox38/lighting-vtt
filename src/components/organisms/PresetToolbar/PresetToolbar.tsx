import { HudSurface } from "@/components/atoms/HudSurface";
import { PresetCycleControls } from "@/components/organisms/PresetToolbar/components/PresetCycleControls";
import { SavePresetControls } from "@/components/organisms/PresetToolbar/components/SavePresetControls";
import { usePresetActions } from "@/components/organisms/PresetToolbar/hooks/usePresetActions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";

export function PresetToolbar() {
  const actions = usePresetActions();

  return (
    <TooltipProvider>
      <HudSurface className="items-center gap-2">
        <div className="min-w-0">
          <Select value={actions.activePresetId || ""} onValueChange={actions.handleValueChange}>
            <SelectTrigger className="h-8 w-[200px] min-w-[160px]">
              <SelectValue placeholder="Select preset…" />
            </SelectTrigger>
            <SelectContent>
              {actions.presets.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">No presets</div>
              ) : (
                actions.presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden h-5 w-px bg-border/70 sm:block" aria-hidden="true" />
        <SavePresetControls actions={actions} />
        <div className="hidden h-5 w-px bg-border/70 sm:block" aria-hidden="true" />
        <PresetCycleControls actions={actions} />
      </HudSurface>
    </TooltipProvider>
  );
}
