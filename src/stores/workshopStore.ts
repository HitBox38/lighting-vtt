import { analyticsOperationGuard } from "@/lib/analyticsOperation";
import { ANALYTICS_EVENTS, capture } from "@/lib/analytics";
import { createPlacementAttempt, placementProperties, type PlacementAttempt } from "@/lib/placementAnalytics";
import { useLightStore } from "@/stores/lightStore/lightStore";
import { create } from "zustand";
import {
  addRecent,
  catalogItemSchema,
  clearPlacementHandoff,
  type CatalogItem,
  type SceneSelection,
} from "@/lib/effects/catalog";

function readRecent(): CatalogItem[] {
  try {
    return catalogItemSchema
      .array()
      .parse(
        JSON.parse(localStorage.getItem("effect-workshop:recent:v1") ?? "[]"),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}
interface WorkshopState {
  open: boolean;
  tab: "add" | "scene";
  selection: SceneSelection | null;
  pending: CatalogItem | null;
  recent: CatalogItem[];
  placementStartedAt: number;
  sceneStartedAt: number;
  completedCount: number;
  setOpen: (open: boolean) => void;
  setTab: (tab: "add" | "scene") => void;
  select: (selection: SceneSelection | null) => void;
  attempt: PlacementAttempt | null;
  attemptMeasurable: () => boolean;
  source: PlacementAttempt["source"];
  begin: (item: CatalogItem, source?: PlacementAttempt["source"], attempt?: PlacementAttempt | null) => void;
  retry: () => void;
  fail: (reason: string) => void;
  cancel: (reason?: string) => void;
  complete: (item: CatalogItem, selection: SceneSelection, effectKind?: string) => void;
  reset: () => void;
}
export const useWorkshopStore = create<WorkshopState>((set, get) => ({
  open: false,
  attempt: null,
  attemptMeasurable: () => false,
  source: "palette",
  tab: "add",
  selection: null,
  pending: null,
  recent: readRecent(),
  placementStartedAt: 0,
  sceneStartedAt: Date.now(),
  completedCount: 0,
  setOpen: (open) => {
    if (open && get().pending) get().cancel("controls_opened");
    set({ open });
  },
  setTab: (tab) => set({ tab, selection: null }),
  select: (selection) => {
    if (get().pending) get().cancel("selection_changed");
    set({ selection, pending: null, open: true, tab: "scene" });
  },
  begin: (pending, source = "palette", handoff) => {
    if (get().pending) get().cancel("replaced");
    const attempt = handoff === null ? null : handoff ?? createPlacementAttempt(source, useLightStore.getState().sceneId ?? undefined);
    if (attempt && !handoff) capture(ANALYTICS_EVENTS.EffectPlacementStarted, placementProperties(pending, attempt));
    set({ pending, source, attempt, attemptMeasurable: analyticsOperationGuard(), placementStartedAt: attempt?.started_at ?? Date.now(), open: false, selection: null });
  },
  retry: () => {
    const { pending, source, attempt } = get();
    if (!pending || (attempt && get().attemptMeasurable())) return;
    const next = createPlacementAttempt(source, useLightStore.getState().sceneId ?? undefined);
    if (next) capture(ANALYTICS_EVENTS.EffectPlacementStarted, placementProperties(pending, next));
    set({ attempt: next, attemptMeasurable: analyticsOperationGuard() });
  },
  fail: (reason) => {
    const { pending, attempt } = get();
    if (pending && attempt && get().attemptMeasurable()) capture(ANALYTICS_EVENTS.EffectPlacementFailed, { ...placementProperties(pending, attempt), error_category: reason, duration_ms: Date.now() - attempt.started_at });
    set({ attempt: null });
  },
  cancel: (reason = "cancelled") => {
    const { pending, attempt } = get();
    if (pending && attempt && get().attemptMeasurable()) capture(ANALYTICS_EVENTS.EffectPlacementCancelled, { ...placementProperties(pending, attempt), reason, duration_ms: Date.now() - attempt.started_at });
    clearPlacementHandoff();
    set({ pending: null, attempt: null });
  },
  complete: (item, selection, effectKind) => {
    const { attempt, completedCount, sceneStartedAt } = get();
    if (attempt && get().attemptMeasurable()) capture(ANALYTICS_EVENTS.EffectPlacementCompleted, { ...placementProperties(item, attempt), effect_kind: effectKind,
      duration_ms: Date.now() - attempt.started_at, first_in_scene: completedCount === 0, time_since_scene_open_ms: Date.now() - sceneStartedAt });

    const recent = addRecent(get().recent, item);
    try {
      localStorage.setItem("effect-workshop:recent:v1", JSON.stringify(recent));
    } catch {
      /* Optional convenience. */
    }
    clearPlacementHandoff();
    set({
      recent,
      completedCount: get().completedCount + 1,
      pending: null,
      attempt: null,
      selection,
      open: true,
      tab: "scene",
    });
  },
  reset: () => { get().cancel("scene_left"); set({ open: false, selection: null, completedCount: 0 }); },
}));
