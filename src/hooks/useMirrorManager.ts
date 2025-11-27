import { useLightStore } from "@/stores/lightStore";
import type { Mirror, MirrorUpdate } from "@shared/index";

export type { Mirror, MirrorUpdate };

export function useMirrorManager() {
  const mirrors = useLightStore((state) => state.mirrors);
  const addMirror = useLightStore((state) => state.addMirror);
  const updateMirror = useLightStore((state) => state.updateMirror);
  const removeMirror = useLightStore((state) => state.removeMirror);

  return {
    mirrors,
    addMirror,
    updateMirror,
    removeMirror,
  };
}
