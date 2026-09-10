import { analyticsOperationEpoch } from "./analyticsOperation";
import { useCookieConsentStore } from "@/stores/cookieConsentStore";
import { analyticsEnabled } from "./analyticsContext";
import type { CatalogItem } from "./effects/catalog";

export type PlacementAttempt = { attempt_id: string; source: "palette" | "gallery"; started_at: number; consent_epoch: number; scene_id?: string };
export function createPlacementAttempt(source: PlacementAttempt["source"], scene_id?: string): PlacementAttempt | null {
  if (useCookieConsentStore.getState().consent !== "accepted" || !analyticsEnabled()) return null;
  return { attempt_id: crypto.randomUUID(), source, started_at: Date.now(), consent_epoch: analyticsOperationEpoch(), scene_id };
}
export function placementProperties(item: CatalogItem, attempt: PlacementAttempt | null) {
  return {
    attempt_id: attempt?.attempt_id, source: attempt?.source ?? "palette", scene_id: attempt?.scene_id,
    kind: item.kind, role: "gm", light_type: item.kind === "light" ? item.type : undefined,
    effect_id: item.kind === "effect" ? item.effectId : undefined,
    version: item.kind === "effect" ? item.version : undefined,
  };
}
