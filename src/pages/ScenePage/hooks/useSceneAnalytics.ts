import { useLayoutEffect } from "react";
import { ANALYTICS_EVENTS, consumeSceneEntrySource } from "@/lib/analytics";
import { setAnalyticsScene } from "@/lib/analyticsContext";
import { useAnalyticsReady, useAnalyticsView } from "@/lib/hooks/useAnalyticsView";
import type { SceneRole } from "@/pages/ScenePage/types";
import { useRef } from "react";
export function useSceneAnalytics({ sceneId, scene, isRemotePlayer, role }: {
  sceneId: string | null; scene: unknown; isRemotePlayer: boolean; role: SceneRole;
}) {
  const ready = useAnalyticsReady();
  const visit = useRef({ key: "", id: "" });
  const entry = useRef({ scene: null as string | null, source: "direct_or_library" });
  useLayoutEffect(() => {
    const key = `${sceneId}:${role}`;
    if (visit.current.key !== key) visit.current = { key, id: crypto.randomUUID() };
    setAnalyticsScene({ scene_id: sceneId, role, scene_visit_id: visit.current.id });
    return () => setAnalyticsScene({});
  }, [sceneId, role]);
  // Consume attribution only when its outcome can actually be observed.
  useLayoutEffect(() => {
    if (!ready || entry.current.scene === sceneId) return;
    entry.current = { scene: sceneId, source: isRemotePlayer ? "join" : consumeSceneEntrySource() ?? "direct_or_library" };
  }, [sceneId, isRemotePlayer, ready]);
  useAnalyticsView(scene === null ? ANALYTICS_EVENTS.SceneLoadFailed : ANALYTICS_EVENTS.SceneLoaded,
    `${sceneId}:${role}:${scene === null}`,
    { scene_id: sceneId, role, is_remote_player: isRemotePlayer, ...(scene === null ? { reason: "unavailable" } : {}) },
    Boolean(sceneId) && scene !== undefined);
  useAnalyticsView(ANALYTICS_EVENTS.SceneEditorEntered, `${sceneId}:${role}`,
    () => ({ scene_id: sceneId, role, entry_source: entry.current.source }), Boolean(sceneId && scene));
}
