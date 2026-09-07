import { MapPin, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlreadyJoinedPanel } from "@/pages/JoinPage/components/AlreadyJoinedPanel";
import { JoinForm } from "@/pages/JoinPage/components/JoinForm";

interface JoinSceneCardProps {
  sceneName: string;
  alreadyJoined: boolean;
  playerName: string;
  characterName: string;
  isJoining: boolean;
  error: string | null;
  signedInLabel: string | undefined;
  onPlayerNameChange: (value: string) => void;
  onCharacterNameChange: (value: string) => void;
  onJoin: () => void;
}

export function JoinSceneCard({
  sceneName,
  alreadyJoined,
  playerName,
  characterName,
  isJoining,
  error,
  signedInLabel,
  onPlayerNameChange,
  onCharacterNameChange,
  onJoin,
}: JoinSceneCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <Badge variant="outline" className="gap-1">
              <Wifi className="size-3 text-green-500" />
              DM Online
            </Badge>
          </div>
          <CardTitle className="text-xl">Join Scene</CardTitle>
          <CardDescription>
            You've been invited to join <span className="font-medium text-foreground">{sceneName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alreadyJoined ? (
            <AlreadyJoinedPanel isJoining={isJoining} onRejoin={onJoin} />
          ) : (
            <JoinForm
              playerName={playerName}
              characterName={characterName}
              isJoining={isJoining}
              error={error}
              signedInLabel={signedInLabel}
              onPlayerNameChange={onPlayerNameChange}
              onCharacterNameChange={onCharacterNameChange}
              onSubmit={onJoin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
