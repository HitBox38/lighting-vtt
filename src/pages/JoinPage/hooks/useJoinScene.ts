import { useEffect, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useUser } from "@clerk/react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../../../../convex/_generated/api";
import { ANALYTICS_EVENTS, setSceneEntrySource } from "@/lib/analytics";
import {
  getClerkDisplayName,
  getErrorCategory,
  getJoinErrorMessage,
} from "@/pages/JoinPage/helpers";

export function useJoinScene() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { user } = useUser();
  const sceneInfo = useQuery(
    api.players.getSceneByInviteCode,
    inviteCode ? { inviteCode } : "skip",
  );
  const joinScene = useMutation(api.players.joinScene);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteStateTrackedRef = useRef<string | null>(null);
  const playerName = playerNameDraft || getClerkDisplayName(user);
  const alreadyJoined =
    sceneInfo && user?.id ? sceneInfo.players.some((player) => player.clerkUserId === user.id) : false;

  useEffect(() => {
    inviteStateTrackedRef.current = null;
  }, [inviteCode]);

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

  const handleJoin = async () => {
    if (!sceneInfo || !playerName.trim() || !characterName.trim()) {
      return;
    }
    setIsJoining(true);
    setError(null);
    const result = await submitJoin();
    setIsJoining(false);
    if (!result.ok) {
      setError(result.message);
    }

    async function submitJoin(): Promise<{ ok: true } | { ok: false; message: string }> {
      try {
        const playerId = await joinScene({
          sceneId: sceneInfo!._id,
          playerName: playerName.trim(),
          characterName: characterName.trim(),
          clerkUserId: user?.id,
        });
        posthog.capture(ANALYTICS_EVENTS.JoinSceneSucceeded);
        setSceneEntrySource("join");
        navigate(`/scene?id=${sceneInfo!._id}&playerId=${playerId}`);
        return { ok: true };
      } catch (joinError) {
        posthog.capture(ANALYTICS_EVENTS.JoinSceneFailed, {
          error_category: getErrorCategory(joinError),
        });
        return { ok: false, message: getJoinErrorMessage(joinError) };
      }
    }
  };

  return {
    sceneInfo,
    playerName,
    setPlayerNameDraft,
    characterName,
    setCharacterName,
    isJoining,
    error,
    alreadyJoined,
    handleJoin,
    user,
  };
}
