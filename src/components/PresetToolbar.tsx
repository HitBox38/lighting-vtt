import { useState } from "react";
import { ArrowLeft, ArrowRight, FilePlus, Save, Shuffle, Trash2 } from "lucide-react";
import { useLightManager } from "@/hooks/useLightManager";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PresetToolbar() {
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

  const handleSaveAsNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim());
      setNewPresetName("");
      setIsSaveDialogOpen(false);
    }
  };

  const handleUpdateCurrent = () => {
    if (activePresetId) {
      updateSavedPreset(activePresetId);
    }
  };

  const handleValueChange = (value: string) => {
    loadPreset(value);
  };

  const handleDelete = () => {
    if (activePresetId) {
      deletePreset(activePresetId);
    }
  };

  const handlePreviousPreset = () => {
    if (activePresetId) {
      const previousPresetId = presets.findIndex((preset) => preset.id === activePresetId) - 1;
      if (previousPresetId >= 0) {
        loadPreset(presets[previousPresetId].id);
      } else {
        loadPreset(presets[presets.length - 1].id);
      }
    }
  };

  const handleNextPreset = () => {
    if (activePresetId) {
      const nextPresetId = presets.findIndex((preset) => preset.id === activePresetId) + 1;
      if (nextPresetId < presets.length) {
        loadPreset(presets[nextPresetId].id);
      } else {
        loadPreset(presets[0].id);
      }
    }
  };

  return (
    <div className="inline-flex gap-2 rounded-lg bg-background/80 p-2 shadow-lg ring-1 ring-border backdrop-blur items-center">
      <Select value={activePresetId || ""} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Select preset..." />
        </SelectTrigger>
        <SelectContent>
          {presets.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">No presets</div>
          ) : (
            presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {activePresetId ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="outline" onClick={handleUpdateCurrent}>
                <Save className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Update Current Preset</p>
            </TooltipContent>
          </Tooltip>
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button size="icon-sm" variant="outline">
                    <FilePlus className="size-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Save As New Preset</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Save As New Preset</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveAsNew} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input
                    id="name"
                    placeholder="Preset name"
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
        </>
      ) : (
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="outline">
                  <Save className="size-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Save New Preset</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Save New Preset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAsNew} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input
                  id="name"
                  placeholder="Preset name"
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
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            disabled={!activePresetId || presets.length < 2}
            onClick={handlePreviousPreset}>
            <ArrowLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Go to previous preset</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={randomizePreset}
            disabled={presets.length < 2}>
            <Shuffle className="size-4" />
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
            disabled={!activePresetId || presets.length < 2}
            onClick={handleNextPreset}>
            <ArrowRight className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Go to next preset</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={!activePresetId}>
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Delete Current Preset</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
