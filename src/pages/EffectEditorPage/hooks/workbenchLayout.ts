import type { Layout } from "react-resizable-panels";

export const LAYOUT_KEY = "workshop:layout:v1";
export const DEFAULT_LAYOUTS = {
  workbench: { source: 55, preview: 45 },
  reference: { code: 65, reference: 35 },
  diagnostics: { editor: 75, diagnostics: 25 },
  inspector: { stage: 55, inspector: 45 },
};
export type LayoutGroup = keyof typeof DEFAULT_LAYOUTS;
export type WorkbenchLayouts = Record<LayoutGroup, Layout>;
export type LayoutPreset = "Balanced" | "Code focus" | "Preview focus";

export function readWorkbenchLayouts(raw: string | null): WorkbenchLayouts {
  let input: Record<string, unknown> = {};
  try {
    input = JSON.parse(raw ?? "{}") ?? {};
  } catch {
    /* Optional preferences. */
  }
  return Object.fromEntries(
    Object.entries(DEFAULT_LAYOUTS).map(([group, defaults]) => {
      const candidate = input[group] as Layout | undefined;
      const keys = Object.keys(defaults);
      const valid =
        candidate &&
        keys.every(
          (key) =>
            Number.isFinite(candidate[key]) &&
            candidate[key] > 0 &&
            candidate[key] < 100,
        ) &&
        Math.abs(keys.reduce((sum, key) => sum + candidate[key], 0) - 100) <
          0.01;
      return [
        group,
        valid
          ? Object.fromEntries(keys.map((key) => [key, candidate[key]]))
          : { ...defaults },
      ];
    }),
  ) as WorkbenchLayouts;
}

export function presetLayout(preset: LayoutPreset): Layout {
  const source =
    preset === "Code focus" ? 70 : preset === "Preview focus" ? 35 : 55;
  return { source, preview: 100 - source };
}
