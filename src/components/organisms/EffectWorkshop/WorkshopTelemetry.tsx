import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";
import { useEffectRuntimeStore } from "@/stores/effectRuntimeStore/effectRuntimeStore";

/** Report status transitions, never frames or source text. */
export function WorkshopTelemetry({ isGM }: { isGM: boolean }) {
  const posthog = usePostHog();
  const statuses = useEffectRuntimeStore((state) => state.statuses);
  const backend = useEffectRuntimeStore((state) => state.backend);
  const previous = useRef<Record<string, string>>({});
  useEffect(() => {
    for (const [instanceId, status] of Object.entries(statuses)) {
      if (status.kind === "loading" || status.kind === "compiling") continue;
      if (previous.current[instanceId] === status.kind) continue;
      posthog.capture("effect_runtime_observed", {
        instance_id: instanceId,
        status: status.kind,
        backend,
        view: isGM ? "gm" : "player",
      });
    }
    previous.current = Object.fromEntries(
      Object.entries(statuses).map(([id, status]) => [id, status.kind]),
    );
  }, [statuses, backend, isGM, posthog]);
  return null;
}
