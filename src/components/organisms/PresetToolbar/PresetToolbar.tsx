import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="max-w-[90px] sm:max-w-[180px]"
          >
            <span className="truncate">
              {actions.presets.find((p) => p.id === actions.activePresetId)
                ?.name ?? "Presets"}
            </span>
            <ChevronDown className="size-3 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <p className="text-xs text-muted-foreground">
            Save and recall lights, mirrors, and effects together.
          </p>
          <div className="min-w-0">
            <Select
              value={actions.activePresetId || ""}
              onValueChange={actions.handleValueChange}
            >
              <SelectTrigger className="h-8 w-[200px] min-w-[160px]">
                <SelectValue placeholder="Select preset…" />
              </SelectTrigger>
              <SelectContent>
                {actions.presets.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No presets
                  </div>
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
          <div
            className="hidden h-5 w-px bg-border/70 sm:block"
            aria-hidden="true"
          />
          <SavePresetControls actions={actions} />
          <div
            className="hidden h-5 w-px bg-border/70 sm:block"
            aria-hidden="true"
          />
          <PresetCycleControls actions={actions} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
