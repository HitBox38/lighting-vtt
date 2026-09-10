import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { useAnalyticsReady } from "@/lib/hooks/useAnalyticsView";
import { useEffect, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useUser } from "@clerk/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../../../../convex/_generated/api";
import { ANALYTICS_EVENTS, errorCategory, setSceneEntrySource } from "@/lib/analytics";
import { createGuestPlayerToken, saveGuestPlayerToken } from "@/lib/playerSession";
import {
  getClerkDisplayName,
  getJoinErrorMessage,
} from "@/pages/JoinPage/helpers";

export function useJoinScene() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const analyticsReady = useAnalyticsReady();
  const { user } = useUser();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const sceneInfo = useQuery(
    api.players.getSceneByInviteCode,
    inviteCode && !authLoading ? { inviteCode } : "skip",
  );
  const joinScene = useMutation(api.players.joinScene);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteStateTrackedRef = useRef<string | null>(null);
  const playerName = playerNameDraft || getClerkDisplayName(user);
  const alreadyJoined = sceneInfo?.alreadyJoined ?? false;

  useEffect(() => {
    inviteStateTrackedRef.current = null;
  }, [inviteCode]);

  useEffect(() => {
    if (!analyticsReady || sceneInfo === undefined) {
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
      posthog.capture(ANALYTICS_EVENTS.JoinInviteValid, { already_joined: alreadyJoined, scene_id: sceneInfo._id, auth_type: user ? "account" : "guest" });
      inviteStateTrackedRef.current = "valid";
    }
  }, [sceneInfo, alreadyJoined, posthog, analyticsReady, user]);

  const handleJoin = async () => {
    if (!sceneInfo || authLoading || (user && !isAuthenticated) || !playerName.trim() || !characterName.trim()) {
      return;
    }
    const measurable = analyticsOperationGuard();
    const context = { scene_id: sceneInfo._id, role: "remote_player", auth_type: user ? "account" : "guest", attempt_id: crypto.randomUUID() };
    posthog.capture(ANALYTICS_EVENTS.JoinSceneStarted, context);
    setIsJoining(true);
    setError(null);
    const result = await submitJoin();
    setIsJoining(false);
    if (!result.ok) {
      setError(result.message);
    }

    async function submitJoin(): Promise<{ ok: true } | { ok: false; message: string }> {
      try {
        const guestToken = user ? undefined : createGuestPlayerToken();
        const playerId = await joinScene({
          sceneId: sceneInfo!._id,
          inviteCode,
          playerName: playerName.trim(),
          characterName: characterName.trim(),
          clerkUserId: user?.id,
          guestToken,
        });
        if (guestToken) saveGuestPlayerToken(sceneInfo!._id, playerId, guestToken);
        if (measurable()) posthog.capture(ANALYTICS_EVENTS.JoinSceneSucceeded, context);
        setSceneEntrySource("join");
        navigate(`/scene?id=${sceneInfo!._id}&playerId=${playerId}`);
        return { ok: true };
      } catch (joinError) {
        if (measurable()) posthog.capture(ANALYTICS_EVENTS.JoinSceneFailed, {
          ...context, error_category: errorCategory(joinError),
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
