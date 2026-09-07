import { z } from "zod";
import { effectParamValuesSchema } from "@shared/effects";

export const catalogItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("light"),
    type: z.enum(["radial", "conic", "line"]),
  }),
  z.object({ kind: z.literal("mirror") }),
  z.object({
    kind: z.literal("effect"),
    effectId: z.string().min(1),
    version: z.number().int().positive(),
    name: z.string(),
    params: effectParamValuesSchema.optional(),
  }),
]);
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type SceneSelection = {
  kind: "light" | "mirror" | "effect";
  id: string;
};
export const BASICS: readonly CatalogItem[] = [
  { kind: "light", type: "radial" },
  { kind: "light", type: "conic" },
  { kind: "light", type: "line" },
  { kind: "mirror" },
];
export const LIGHT_NAMES = {
  radial: "Point Light",
  conic: "Spotlight",
  line: "Line Light",
} as const;
export const catalogName = (item: CatalogItem) =>
  item.kind === "light"
    ? LIGHT_NAMES[item.type]
    : item.kind === "mirror"
      ? "Mirror"
      : item.name;
export const catalogKey = (item: CatalogItem) =>
  item.kind === "light"
    ? `light:${item.type}`
    : item.kind === "mirror"
      ? "mirror"
      : `${item.effectId}@${item.version}`;
export function addRecent(
  recent: CatalogItem[],
  item: CatalogItem,
): CatalogItem[] {
  return [
    item,
    ...recent.filter((entry) => catalogKey(entry) !== catalogKey(item)),
  ].slice(0, 6);
}

const HANDOFF_KEY = "effect-workshop:handoff:v1";
export function savePlacementHandoff(item: CatalogItem, scenePath: string) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ item, scenePath }));
  } catch {
    /* URL fallback remains available. */
  }
}
export function readPlacementHandoff(scenePath: string): CatalogItem | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? "null");
    if (stored?.scenePath !== scenePath) return null;
    const result = catalogItemSchema.safeParse(stored.item);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function clearPlacementHandoff() {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* Storage may be disabled. */
  }
}

export function placementPath(scenePath: string, item: CatalogItem): string {
  const url = new URL(scenePath, "http://local.invalid");
  const clean = `${url.pathname}${url.search}${url.hash}`;
  savePlacementHandoff(item, clean);
  url.searchParams.set(
    "addEffect",
    item.kind === "effect"
      ? `${item.effectId}@${item.version}`
      : `builtin:${item.kind === "mirror" ? "mirror" : item.type}@1`,
  );
  return `${url.pathname}${url.search}${url.hash}`;
}
export function builtinFromPlacement(raw: string): CatalogItem | null {
  const key = raw.replace(/@1$/, "");
  if (key === "builtin:mirror") return { kind: "mirror" };
  const type = key.slice("builtin:".length);
  return key.startsWith("builtin:") &&
    (type === "radial" || type === "conic" || type === "line")
    ? { kind: "light", type }
    : null;
}
