import { useEffect, useRef } from "react";
import { usePostHog } from "@posthog/react";
import { createViewTracker } from "@/lib/analyticsContext";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useAnalyticsReady, useAnalyticsView } from "@/lib/hooks/useAnalyticsView";

export function useCanvasAnalytics(sceneId: string | null | undefined, rendererReady: boolean, textureReady: boolean, mapFailed: boolean) {
  const posthog = usePostHog();
  const ready = useAnalyticsReady();
  const trackTimeout = useRef(createViewTracker());
  useAnalyticsView(ANALYTICS_EVENTS.SceneCanvasReady, sceneId ?? "none", { scene_id: sceneId }, rendererReady && textureReady);
  useAnalyticsView(ANALYTICS_EVENTS.SceneCanvasFailed, `${sceneId}:map`, { scene_id: sceneId, error_category: "map_load" }, mapFailed);
  useEffect(() => {
    if (!ready || rendererReady) return;
    // Pixi initializes asynchronously; its rejected initialization promise does not
    // reach a React boundary. Distinguish an initialization timeout from a map error.
    const timer = setTimeout(() => {
      if (!trackTimeout.current(`${sceneId}:renderer`, ready)) return;
      posthog.capture(ANALYTICS_EVENTS.SceneCanvasFailed, {
      scene_id: sceneId, error_category: "renderer_initialization_timeout",
      });
    }, 30_000);
    return () => clearTimeout(timer);
  }, [ready, rendererReady, sceneId, posthog]);
}
