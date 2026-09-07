import { useRef, useState } from "react";
import type { GroupImperativeHandle, GroupProps } from "react-resizable-panels";
import {
  DEFAULT_LAYOUTS,
  LAYOUT_KEY,
  presetLayout,
  readWorkbenchLayouts,
  type LayoutGroup,
  type LayoutPreset,
} from "./workbenchLayout";

export function useWorkbenchLayout() {
  const [initial] = useState(() => {
    try {
      return readWorkbenchLayouts(localStorage.getItem(LAYOUT_KEY));
    } catch {
      return readWorkbenchLayouts(null);
    }
  });
  const saved = useRef(initial);
  const workbench = useRef<GroupImperativeHandle | null>(null);
  const reference = useRef<GroupImperativeHandle | null>(null);
  const diagnostics = useRef<GroupImperativeHandle | null>(null);
  const inspector = useRef<GroupImperativeHandle | null>(null);
  const refs = { workbench, reference, diagnostics, inspector };
  const persist = () => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(saved.current));
    } catch {
      /* Resizing still works without storage. */
    }
  };
  const remember =
    (group: LayoutGroup): GroupProps["onLayoutChanged"] =>
    (layout, meta) => {
      if (!meta.isUserInteraction || Object.keys(layout).length !== 2) return;
      saved.current = { ...saved.current, [group]: layout };
      persist();
    };
  const applyPreset = (preset: LayoutPreset) => {
    saved.current = { ...saved.current, workbench: presetLayout(preset) };
    workbench.current?.setLayout(saved.current.workbench);
    persist();
  };
  const reset = () => {
    saved.current = readWorkbenchLayouts(null);
    for (const group of Object.keys(DEFAULT_LAYOUTS) as LayoutGroup[]) {
      const handle = refs[group].current;
      if (handle && Object.keys(handle.getLayout()).length === 2)
        handle.setLayout(saved.current[group]);
    }
    persist();
  };
  return { initial, saved, refs, remember, applyPreset, reset };
}
