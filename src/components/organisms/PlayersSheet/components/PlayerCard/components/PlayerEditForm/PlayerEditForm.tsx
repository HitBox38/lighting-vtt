import { useRef, useState } from "react";
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
  const [submitted, setSubmitted] = useState(false);
  const playerNameRef = useRef<HTMLInputElement>(null);
  const characterNameRef = useRef<HTMLInputElement>(null);
  const playerNameError = submitted && !playerName.trim() ? "Player name is required" : null;
  const characterNameError =
    submitted && !characterName.trim() ? "Character name is required" : null;

  return (
    <form
      noValidate
      className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (!playerName.trim()) {
          playerNameRef.current?.focus();
          return;
        }
        if (!characterName.trim()) {
          characterNameRef.current?.focus();
          return;
        }
        onSave();
      }}>
      <div className="space-y-1.5">
        <Label htmlFor={`pn-${playerId}`} className="text-xs font-medium text-muted-foreground">
          Player Name
        </Label>
        <Input
          id={`pn-${playerId}`}
          ref={playerNameRef}
          required
          aria-invalid={Boolean(playerNameError)}
          aria-describedby={playerNameError ? `pn-error-${playerId}` : undefined}
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
          placeholder="Enter player name…"
          autoComplete="off"
        />
        {playerNameError ? (
          <p id={`pn-error-${playerId}`} className="text-sm text-destructive" role="alert">
            {playerNameError}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`cn-${playerId}`} className="text-xs font-medium text-muted-foreground">
          Character Name
        </Label>
        <Input
          id={`cn-${playerId}`}
          ref={characterNameRef}
          required
          aria-invalid={Boolean(characterNameError)}
          aria-describedby={characterNameError ? `cn-error-${playerId}` : undefined}
          value={characterName}
          onChange={(event) => onCharacterNameChange(event.target.value)}
          className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
          placeholder="Enter character name…"
          autoComplete="off"
        />
        {characterNameError ? (
          <p id={`cn-error-${playerId}`} className="text-sm text-destructive" role="alert">
            {characterNameError}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Check className="size-3" aria-hidden="true" />
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={onCancel}>
          <X className="size-3" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
