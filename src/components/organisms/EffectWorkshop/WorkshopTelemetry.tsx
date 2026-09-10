import { useAnalyticsReady } from "@/lib/hooks/useAnalyticsView";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";

/** Report status transitions, never frames or source text. */
export function WorkshopTelemetry({ isGM }: { isGM: boolean }) {
  const posthog = usePostHog();
  const statuses = useEffectRuntimeStore((state) => state.statuses);
  const backend = useEffectRuntimeStore((state) => state.backend);
  const ready = useAnalyticsReady();
  const sceneId = useLightStore(state => state.sceneId);
  const effects = useLightStore(state => state.effects);
  const shaderStatuses = useEffectRuntimeStore(state => state.shaderStatuses);
  const previous = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!ready) return;
    for (const [instanceId, status] of Object.entries(statuses)) {
      if (status.kind === "loading" || status.kind === "compiling") continue;
      const effect = effects.find(item => item.id === instanceId);
      const key = `${sceneId}:${backend}:${effect?.version}:${status.kind}`;
      if (previous.current[instanceId] === key) continue;
      previous.current[instanceId] = key;
      posthog.capture(ANALYTICS_EVENTS.EffectRuntimeObserved, {
        instance_id: instanceId, scene_id: sceneId, effect_id: effect?.effectId, version: effect?.version, effect_kind: shaderStatuses[instanceId] ? "shader" : "script",
        status: status.kind,
        backend,
        view: isGM ? "gm" : "player",
      });
    }
    for (const id of Object.keys(previous.current)) if (!(id in statuses)) delete previous.current[id];
  }, [statuses, backend, isGM, posthog, ready, sceneId, effects, shaderStatuses]);
  return null;
}
