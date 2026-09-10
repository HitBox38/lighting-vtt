import { useEffect, useEffectEvent, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import {
  readPlacementHandoff,
  readPlacementAnalytics,
  builtinFromPlacement,
} from "@/lib/effects/catalog";
import { useWorkshopStore } from "@/stores/workshopStore";
import { ADD_EFFECT_PARAM, parseAddEffectParam } from "@/lib/effects/routes";

/**
 * Consumes the `addEffect=<effectId>@<version>` query param the effect library
 * appends when the user picks "Add to scene". Fires `onPlace` exactly once per
 * param value, after `ready` is true (scene loaded, viewport known), and then
 * strips the param so a reload or back-navigation does not place a duplicate.
 */
export function usePendingEffectPlacement(
  ready: boolean,
  onPlace: (effectId: string, version: number) => void,
  mapFailed = false,
): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(ADD_EFFECT_PARAM);
  const consumedRef = useRef<string | null>(null);
  const place = useEffectEvent(onPlace);

  useEffect(() => {
    if (!ready && !mapFailed) return;
    const path = new URL(window.location.href);
    path.searchParams.delete(ADD_EFFECT_PARAM);
    const handoff = readPlacementHandoff(
      `${path.pathname}${path.search}${path.hash}`,
    );
    const analytics = readPlacementAnalytics(`${path.pathname}${path.search}${path.hash}`);
    if (mapFailed && !analytics) return;
    const key = raw ?? (handoff ? JSON.stringify(handoff) : null);
    if (key === null || consumedRef.current === key) return;
    consumedRef.current = key;
    const ref = raw ? parseAddEffectParam(raw) : null;
    if (handoff) useWorkshopStore.getState().begin(handoff, "gallery", analytics);
    else if (raw && builtinFromPlacement(raw))
      useWorkshopStore.getState().begin(builtinFromPlacement(raw)!, "gallery", analytics);
    else if (ref) place(ref.effectId, ref.version);
    if (mapFailed) useWorkshopStore.getState().fail("map_load");
    if (raw !== null)
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete(ADD_EFFECT_PARAM);
          return next;
        },
        { replace: true },
      );
  }, [ready, raw, setSearchParams, mapFailed]);
}
