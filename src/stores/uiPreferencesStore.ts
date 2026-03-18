import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type SidebarSide = "left" | "right";

interface UIPreferencesState {
  sidebarSide: SidebarSide;
  sidebarOpen: boolean;
  setSidebarSide: (side: SidebarSide) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set, get) => ({
      sidebarSide: "right" as SidebarSide,
      sidebarOpen: true,
      setSidebarSide: (sidebarSide) => set({ sidebarSide }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebarOpen: () => set({ sidebarOpen: !get().sidebarOpen }),
    }),
    {
      name: "ui-preferences-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export type { SidebarSide };
