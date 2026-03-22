import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/clerk-react";

import { api } from "../../convex/_generated/api";
import { ANALYTICS_EVENTS, setSceneEntrySource } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, MapPin, ShieldAlert, Wifi, WifiOff } from "lucide-react";

export function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { user } = useUser();

  const sceneInfo = useQuery(
    api.players.getSceneByInviteCode,
    inviteCode ? { inviteCode } : "skip",
  );
  const joinScene = useMutation(api.players.joinScene);

  const [playerName, setPlayerName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteStateTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    inviteStateTrackedRef.current = null;
  }, [inviteCode]);

  useEffect(() => {
    if (user) {
      const displayName = user.fullName ?? user.firstName ?? "";
      if (displayName && !playerName) {
        setPlayerName(displayName);
      }
    }
  }, [user, playerName]);

  const handleJoin = useCallback(async () => {
    if (!sceneInfo || !playerName.trim() || !characterName.trim()) return;

    setIsJoining(true);
    setError(null);

    try {
      const playerId = await joinScene({
        sceneId: sceneInfo._id,
        playerName: playerName.trim(),
        characterName: characterName.trim(),
        clerkUserId: user?.id,
      });

      posthog.capture(ANALYTICS_EVENTS.JoinSceneSucceeded);
      setSceneEntrySource("join");
      navigate(`/scene?id=${sceneInfo._id}&playerId=${playerId}`);
    } catch (err) {
      const errorCategory = err instanceof Error ? err.message.slice(0, 120) : "unknown";
      posthog.capture(ANALYTICS_EVENTS.JoinSceneFailed, { error_category: errorCategory });
      setError(err instanceof Error ? err.message : "Failed to join scene");
    } finally {
      setIsJoining(false);
    }
  }, [sceneInfo, playerName, characterName, user?.id, joinScene, navigate, posthog]);

  const alreadyJoined = sceneInfo && user?.id
    ? sceneInfo.players.some((p) => p.clerkUserId === user.id)
    : false;

  useEffect(() => {
    if (sceneInfo === undefined) {
      return;
    }

    if (sceneInfo === null) {
      if (inviteStateTrackedRef.current !== "invalid") {
        posthog.capture(ANALYTICS_EVENTS.JoinInviteInvalid);
        inviteStateTrackedRef.current = "invalid";
      }
      return;
    }

    if (!sceneInfo.dmOnline) {
      if (inviteStateTrackedRef.current !== "dm_offline") {
        posthog.capture(ANALYTICS_EVENTS.JoinDmOffline);
        inviteStateTrackedRef.current = "dm_offline";
      }
      return;
    }

    if (inviteStateTrackedRef.current !== "valid") {
      posthog.capture(ANALYTICS_EVENTS.JoinInviteValid, { already_joined: alreadyJoined });
      inviteStateTrackedRef.current = "valid";
    }
  }, [sceneInfo, alreadyJoined, posthog]);

  if (sceneInfo === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Looking up scene...</p>
        </div>
      </div>
    );
  }

  if (sceneInfo === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldAlert className="size-12 mx-auto mb-2 text-destructive" />
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is not valid or has expired. Ask the DM for a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sceneInfo.dmOnline) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <WifiOff className="size-12 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>DM is Offline</CardTitle>
            <CardDescription>
              The DM for <span className="font-medium text-foreground">{sceneInfo.name}</span> is
              not currently online. You can only join when the DM is viewing the scene.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground">
              This page will automatically detect when the DM comes online.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="size-5 text-primary" />
            <Badge variant="outline" className="gap-1">
              <Wifi className="size-3 text-green-500" />
              DM Online
            </Badge>
          </div>
          <CardTitle className="text-xl">Join Scene</CardTitle>
          <CardDescription>
            You've been invited to join{" "}
            <span className="font-medium text-foreground">{sceneInfo.name}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {alreadyJoined ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You've already joined this scene. Click below to rejoin.
              </p>
              <Button
                className="w-full"
                disabled={isJoining}
                onClick={() => void handleJoin()}
              >
                {isJoining ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="size-4 mr-2" />
                )}
                Rejoin Scene
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleJoin();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="player-name">Player Name</Label>
                <Input
                  id="player-name"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="character-name">Character Name</Label>
                <Input
                  id="character-name"
                  placeholder="Your character's name"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  required
                />
              </div>

              <SignedOut>
                <div className="rounded-lg border border-dashed p-3 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Sign in to save this scene to your library for quick access later.
                  </p>
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={window.location.href}
                  >
                    <Button type="button" variant="outline" size="sm">
                      <LogIn className="size-3.5 mr-1.5" />
                      Sign In (optional)
                    </Button>
                  </SignInButton>
                </div>
              </SignedOut>

              <SignedIn>
                <p className="text-xs text-muted-foreground">
                  Signed in as{" "}
                  <span className="font-medium">{user?.fullName ?? user?.primaryEmailAddress?.emailAddress}</span>.
                  This scene will be saved to your library.
                </p>
              </SignedIn>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isJoining || !playerName.trim() || !characterName.trim()}
              >
                {isJoining ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="size-4 mr-2" />
                )}
                Join Scene
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default JoinPage;
