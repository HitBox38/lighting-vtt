import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";

import { ANALYTICS_EVENTS, consumeSceneEntrySource, type SceneEntrySource } from "@/lib/analytics";
import type { SceneRole } from "@/pages/ScenePage/types";

export function useSceneAnalytics({
  sceneId,
  scene,
  isRemotePlayer,
  role,
}: {
  sceneId: string | null;
  scene: unknown;
  isRemotePlayer: boolean;
  role: SceneRole;
}) {
  const posthog = usePostHog();
  const sceneAnalyticsRef = useRef({
    sceneId: null as string | null,
    didTrackOutcome: false,
    didTrackEntered: false,
  });

  useEffect(() => {
    if (sceneAnalyticsRef.current.sceneId !== sceneId) {
      sceneAnalyticsRef.current = {
        sceneId,
        didTrackOutcome: false,
        didTrackEntered: false,
      };
    }
  }, [sceneId]);

  useEffect(() => {
    if (!sceneId || scene === undefined) {
      return;
    }
    if (!sceneAnalyticsRef.current.didTrackOutcome) {
      if (scene === null) {
        posthog.capture(ANALYTICS_EVENTS.SceneLoadFailed, { reason: "not_found", role });
        sceneAnalyticsRef.current.didTrackOutcome = true;
        return;
      }
      posthog.capture(ANALYTICS_EVENTS.SceneLoaded, {
        role,
        is_remote_player: isRemotePlayer,
      });
      sceneAnalyticsRef.current.didTrackOutcome = true;
    }
    if (scene && !sceneAnalyticsRef.current.didTrackEntered) {
      const entrySource: SceneEntrySource = isRemotePlayer
        ? "join"
        : (consumeSceneEntrySource() ?? "direct_or_library");
      posthog.capture(ANALYTICS_EVENTS.SceneEditorEntered, {
        role,
        entry_source: entrySource,
      });
      sceneAnalyticsRef.current.didTrackEntered = true;
    }
  }, [sceneId, scene, isRemotePlayer, posthog, role]);
}
