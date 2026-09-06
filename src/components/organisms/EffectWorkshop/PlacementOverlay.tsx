import { useEffect, useRef, useState, type RefObject } from "react";
import type { Container } from "pixi.js";
import { usePostHog } from "@posthog/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkshopStore } from "@/stores/workshopStore";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { useEffectManager } from "@/stores/lightStore/hooks/useEffectManager";
import { catalogName, type SceneSelection } from "@/lib/effects/catalog";
import { DEFAULT_LIGHT_RADIUS, DEFAULT_MIRROR_LENGTH } from "@shared/index";
import { DEFAULT_EFFECT_RADIUS } from "@shared/effects";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function PlacementOverlay({
  containerRef,
  center,
}: {
  containerRef: RefObject<Container | null>;
  center: () => { x: number; y: number };
}) {
  const pending = useWorkshopStore((s) => s.pending);
  const cancel = useWorkshopStore((s) => s.cancel);
  const complete = useWorkshopStore((s) => s.complete);
  const { placeEffect } = useEffectManager();
  const posthog = usePostHog();
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const centerButtonRef = useRef<HTMLButtonElement>(null);
  const cancelPlacement = () => {
    posthog.capture("effect_placement_cancelled", { kind: pending?.kind });
    cancel();
  };
  useEffect(() => {
    if (!pending) return;
    centerButtonRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        posthog.capture("effect_placement_cancelled", { kind: pending.kind });
        cancel();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pending, cancel, posthog]);
  if (!pending) return null;
  const place = async (point: { x: number; y: number }) => {
    if (busyRef.current || useWorkshopStore.getState().pending !== pending)
      return;
    busyRef.current = true;
    setBusy(true);
    const sceneId = useLightStore.getState().sceneId;
    try {
      let selection: SceneSelection;
      if (pending.kind === "light") {
        selection = {
          kind: "light",
          id: useLightStore.getState().addLight(pending.type, point.x, point.y),
        };
        posthog.capture(ANALYTICS_EVENTS.LightAdded, {
          light_type: pending.type,
        });
      } else if (pending.kind === "mirror") {
        selection = {
          kind: "mirror",
          id: useLightStore.getState().addMirror(point.x, point.y),
        };
        posthog.capture(ANALYTICS_EVENTS.MirrorAdded);
      } else {
        const result = await placeEffect(
          pending.effectId,
          pending.version,
          point.x,
          point.y,
          pending.params,
          () =>
            useWorkshopStore.getState().pending === pending &&
            useLightStore.getState().sceneId === sceneId,
        );
        if (!result.ok) {
          if (result.reason !== "cancelled")
            toast.error(
              result.reason === "limit-reached"
                ? "This scene has reached its effect limit."
                : "This effect is unavailable. Choose another or retry.",
            );
          return;
        }
        selection = { kind: "effect", id: result.instanceId };
        posthog.capture(ANALYTICS_EVENTS.EffectAdded, {
          effect_id: pending.effectId,
          version: pending.version,
        });
      }
      const timing = useWorkshopStore.getState();
      posthog.capture("effect_placement_completed", {
        kind: pending.kind,
        duration_ms: Date.now() - timing.placementStartedAt,
        first_in_scene: timing.completedCount === 0,
        time_since_scene_open_ms: Date.now() - timing.sceneStartedAt,
      });
      complete(pending, selection);
    } catch {
      toast.error(
        "Could not place this effect. Your choice is kept; try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const scale = containerRef.current?.scale.x ?? 1;
  const radius =
    (pending.kind === "effect" ? DEFAULT_EFFECT_RADIUS : DEFAULT_LIGHT_RADIUS) *
    scale;
  return (
    <>
      <div
        className="absolute inset-0 z-20 cursor-crosshair touch-none"
        aria-label={`Place ${catalogName(pending)} on map`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const c = containerRef.current;
          void place({
            x: (e.clientX - rect.left - (c?.x ?? 0)) / scale,
            y: (e.clientY - rect.top - (c?.y ?? 0)) / scale,
          });
        }}
      >
        {pointer ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-amber-300"
            aria-hidden="true"
          >
            <g
              transform={`translate(${pointer.x}, ${pointer.y})`}
              fill="currentColor"
              fillOpacity=".12"
              stroke="currentColor"
              strokeDasharray="6 5"
            >
              {pending.kind === "mirror" ? (
                <path
                  d={`M${(-DEFAULT_MIRROR_LENGTH * scale) / 2} 0H${(DEFAULT_MIRROR_LENGTH * scale) / 2}`}
                  strokeWidth="3"
                />
              ) : pending.kind === "light" && pending.type === "line" ? (
                <rect
                  x="0"
                  y={-10 * scale}
                  width={DEFAULT_LIGHT_RADIUS * scale}
                  height={20 * scale}
                />
              ) : pending.kind === "light" && pending.type === "conic" ? (
                <path
                  d={`M0 0L${radius * 0.866} ${-radius * 0.5}A${radius} ${radius} 0 0 1 ${radius * 0.866} ${radius * 0.5}Z`}
                />
              ) : (
                <circle r={radius} />
              )}
              <path d="M-8 0H8M0-8V8" strokeDasharray="none" />
            </g>
          </svg>
        ) : null}
      </div>
      <div
        className="workshop-panel absolute bottom-5 left-1/2 z-40 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 px-4 py-3"
        role="status"
      >
        <span className="text-sm">
          {busy ? "Placing…" : `Place ${catalogName(pending)}`}
        </span>
        <Button
          ref={centerButtonRef}
          size="sm"
          className="workshop-primary"
          disabled={busy}
          onClick={() => void place(center())}
        >
          Place at center
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelPlacement}>
          Cancel <kbd className="ml-1 text-xs opacity-60">Esc</kbd>
        </Button>
      </div>
    </>
  );
}
