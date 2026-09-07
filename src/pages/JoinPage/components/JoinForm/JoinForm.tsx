import { Show, SignInButton } from "@clerk/react";
import { Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinFormProps {
  playerName: string;
  characterName: string;
  isJoining: boolean;
  error: string | null;
  signedInLabel: string | undefined;
  onPlayerNameChange: (value: string) => void;
  onCharacterNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function JoinForm({
  playerName,
  characterName,
  isJoining,
  error,
  signedInLabel,
  onPlayerNameChange,
  onCharacterNameChange,
  onSubmit,
}: JoinFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
      <div className="space-y-2">
        <Label htmlFor="player-name">Player Name</Label>
        <Input
          id="player-name"
          placeholder="Your name"
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="character-name">Character Name</Label>
        <Input
          id="character-name"
          placeholder="Your character's name"
          value={characterName}
          onChange={(event) => onCharacterNameChange(event.target.value)}
          required
        />
      </div>
      <Show when="signed-out">
        <div className="space-y-2 rounded-lg border border-dashed p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Sign in to save this scene to your library for quick access later.
          </p>
          <SignInButton mode="modal" forceRedirectUrl={window.location.href}>
            <Button type="button" variant="outline" size="sm">
              <LogIn className="mr-1.5 size-3.5" />
              Sign In (optional)
            </Button>
          </SignInButton>
        </div>
      </Show>
      <Show when="signed-in">
        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium">{signedInLabel}</span>. This scene will be saved
          to your library.
        </p>
      </Show>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={isJoining || !playerName.trim() || !characterName.trim()}>
        {isJoining ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <LogIn className="mr-2 size-4" />
        )}
        Join Scene
      </Button>
    </form>
  );
}
