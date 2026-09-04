import { FilePlus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { usePresetActions } from "@/components/organisms/PresetToolbar/hooks/usePresetActions";

type Actions = ReturnType<typeof usePresetActions>;

export function SavePresetControls({ actions }: { actions: Actions }) {
  return (
    <div className="flex items-center gap-1.5">
      {actions.activePresetId ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={actions.handleUpdateCurrent}
              aria-label="Update Current Preset">
              <Save className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Update Current Preset</p>
          </TooltipContent>
        </Tooltip>
      ) : null}
      <Dialog
        open={actions.isSaveDialogOpen}
        onOpenChange={(open) => {
          actions.setIsSaveDialogOpen(open);
          if (!open) {
            actions.setNewPresetName("");
          }
        }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label={actions.saveDialogLabel}>
                {actions.activePresetId ? (
                  <FilePlus className="size-4" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{actions.saveDialogLabel}</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{actions.saveDialogLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={actions.handleSaveAsNew} className="grid gap-4 py-4">
            <Input
              id="preset-name"
              name="presetName"
              placeholder="Preset name…"
              autoComplete="off"
              value={actions.newPresetName}
              onChange={(event) => actions.setNewPresetName(event.target.value)}
              autoFocus
            />
            <div className="flex justify-end">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
