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
  begin: (item: CatalogItem) => void;
  cancel: () => void;
  complete: (item: CatalogItem, selection: SceneSelection) => void;
  reset: () => void;
}
export const useWorkshopStore = create<WorkshopState>((set, get) => ({
  open: false,
  tab: "add",
  selection: null,
  pending: null,
  recent: readRecent(),
  placementStartedAt: 0,
  sceneStartedAt: Date.now(),
  completedCount: 0,
  setOpen: (open) => {
    if (open && get().pending) { clearPlacementHandoff(); set({ pending: null }); }
    set({ open });
  },
  setTab: (tab) => set({ tab, selection: null }),
  select: (selection) => {
    if (get().pending) clearPlacementHandoff();
    set({ selection, pending: null, open: true, tab: "scene" });
  },
  begin: (pending) =>
    set({
      pending,
      placementStartedAt: Date.now(),
      open: false,
      selection: null,
    }),
  cancel: () => {
    clearPlacementHandoff();
    set({ pending: null });
  },
  complete: (item, selection) => {
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
      selection,
      open: true,
      tab: "scene",
    });
  },
  reset: () => set({ open: false, pending: null, selection: null }),
}));
