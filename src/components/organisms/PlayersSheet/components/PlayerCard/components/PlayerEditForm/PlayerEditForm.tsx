import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface PlayerEditFormProps {
  playerId: string;
  playerName: string;
  characterName: string;
  onPlayerNameChange: (value: string) => void;
  onCharacterNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PlayerEditForm({
  playerId,
  playerName,
  characterName,
  onPlayerNameChange,
  onCharacterNameChange,
  onSave,
  onCancel,
}: PlayerEditFormProps) {
  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <div className="space-y-1.5">
        <Label htmlFor={`pn-${playerId}`} className="text-xs font-medium text-muted-foreground">
          Player Name
        </Label>
        <Input
          id={`pn-${playerId}`}
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
          placeholder="Enter player name…"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`cn-${playerId}`} className="text-xs font-medium text-muted-foreground">
          Character Name
        </Label>
        <Input
          id={`cn-${playerId}`}
          value={characterName}
          onChange={(event) => onCharacterNameChange(event.target.value)}
          className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
          placeholder="Enter character name…"
          autoComplete="off"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          onClick={onSave}>
          <Check className="size-3" aria-hidden="true" />
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={onCancel}>
          <X className="size-3" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
