import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  BASICS,
  addRecent,
  builtinFromPlacement,
  catalogKey,
  clearPlacementHandoff,
  placementPath,
  readPlacementHandoff,
} from "../src/lib/effects/catalog";
import {
  coerceParamValues,
  effectDefinitionSchema,
  EFFECT_LIMITS,
} from "../shared/effects";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import {
  parseAddEffectParam,
  sanitizeReturnTo,
} from "../src/lib/effects/routes";

// Keep these behavioral tests entirely local: no backend writes or player broadcasts.
mock.module("../src/stores/lightStore/sync", () => ({
  registerGmSync() {},
  registerPlayerSync() {},
}));
mock.module("../src/stores/lightStore/persistScene", () => ({
  persistPreset() {},
  removePersistedPreset() {},
}));
const { useLightStore } = await import("../src/stores/lightStore/lightStore");
const { useWorkshopStore } = await import("../src/stores/workshopStore");
const { duplicateSceneObject, removeSceneObject } =
  await import("../src/lib/effects/sceneObjects");

beforeEach(() => {
  useLightStore.setState({
    lights: [],
    mirrors: [],
    effects: [],
    sceneId: "scene-a",
  });
  useWorkshopStore.setState({
    open: false,
    selection: null,
    pending: null,
    recent: [],
  });
});

describe("catalog and handoff", () => {
  test("all four basics and existing programmable URLs remain supported", () => {
    for (const item of BASICS) {
      const path = placementPath("/scene?id=example", item);
      expect(
        builtinFromPlacement(
          new URL(path, "https://test.invalid").searchParams.get("addEffect")!,
        ),
      ).toEqual(item);
    }
    expect(parseAddEffectParam("existing@3")).toEqual({
      effectId: "existing",
      version: 3,
    });
    expect(parseAddEffectParam("existing@0")).toBeNull();
    expect(sanitizeReturnTo("/\\evil.example/path")).toBeNull();
  });
  test("a tuned handoff survives reading and is scoped to its scene", () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        setItem: (k: string, v: string) => values.set(k, v),
        getItem: (k: string) => values.get(k) ?? null,
        removeItem: (k: string) => values.delete(k),
      },
    });
    const item = {
      kind: "effect" as const,
      effectId: "example",
      version: 2,
      name: "Tuned",
      params: { speed: 4 },
    };
    placementPath("/scene?id=example", item);
    expect(readPlacementHandoff("/scene?id=other")).toBeNull();
    expect(readPlacementHandoff("/scene?id=example")).toEqual(item);
    expect(readPlacementHandoff("/scene?id=example")).toEqual(item);
    clearPlacementHandoff();
    expect(readPlacementHandoff("/scene?id=example")).toBeNull();
  });
  test("recent choices are distinct, newest first, bounded to six", () => {
    let recent = [...BASICS];
    for (let i = 0; i < 7; i++)
      recent = addRecent(recent, {
        kind: "effect",
        effectId: `e${i}`,
        version: 1,
        name: `e${i}`,
      });
    recent = addRecent(recent, recent[2]);
    expect(recent).toHaveLength(6);
    expect(new Set(recent.map(catalogKey)).size).toBe(6);
    expect(catalogKey(recent[0])).toBe("e4@1");
  });
});

describe("scene object lifecycle", () => {
  test("beginning and cancelling placement never changes persisted objects", () => {
    const initial = useLightStore.getState();
    for (const item of BASICS) {
      useWorkshopStore.getState().begin(item);
      useWorkshopStore.getState().cancel();
    }
    expect(useLightStore.getState().lights).toBe(initial.lights);
    expect(useLightStore.getState().mirrors).toBe(initial.mirrors);
    expect(useLightStore.getState().effects).toBe(initial.effects);
    expect(useWorkshopStore.getState().recent).toEqual([]);
  });
  test("selecting locked or hidden objects does not reorder them", () => {
    const first = useLightStore.getState().addLight("radial", 50, 60);
    useLightStore.getState().addLight("conic", 100, 100);
    useLightStore.getState().updateLight(first, { hidden: true, locked: true });
    const lights = useLightStore.getState().lights;
    useWorkshopStore.getState().select({ kind: "light", id: first });
    expect(useLightStore.getState().lights).toBe(lights);
    expect(useWorkshopStore.getState().open).toBe(true);
  });
  test("mirror placement centers existing default geometry at the chosen point", () => {
    useLightStore.getState().addMirror(420, 250);
    const mirror = useLightStore.getState().mirrors[0];
    expect((mirror.x1 + mirror.x2) / 2).toBe(420);
    expect((mirror.y1 + mirror.y2) / 2).toBe(250);
  });
  test("duplicate preserves conic direction, flags and tuning while unlocking", () => {
    const id = useLightStore.getState().addLight("conic", 10, 20);
    useLightStore
      .getState()
      .updateLight(id, { locked: true, hidden: true, intensity: 0.3 });
    duplicateSceneObject({ kind: "light", id });
    const [original, duplicate] = useLightStore.getState().lights;
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.locked).toBe(false);
    expect(duplicate.hidden).toBe(true);
    expect(duplicate.intensity).toBe(0.3);
    if (original.type !== "conic" || duplicate.type !== "conic")
      throw new Error("Wrong light shape");
    expect(duplicate.targetX - duplicate.x).toBe(original.targetX - original.x);
  });
  test("Undo restores original order exactly once and cannot cross scenes", () => {
    const a = useLightStore.getState().addMirror(0, 0);
    const b = useLightStore.getState().addMirror(200, 0);
    const undo = removeSceneObject({ kind: "mirror", id: a })!;
    expect(useLightStore.getState().mirrors.map((m) => m.id)).toEqual([b]);
    expect(undo()).toBe(true);
    expect(undo()).toBe(false);
    expect(useLightStore.getState().mirrors.map((m) => m.id)).toEqual([a, b]);
    const otherUndo = removeSceneObject({ kind: "mirror", id: a })!;
    useLightStore.setState({ sceneId: "scene-b" });
    expect(otherUndo()).toBe(false);
  });
  test("programmable duplication preserves pinned parameters and enforces limits", () => {
    const id = useLightStore
      .getState()
      .addEffect({
        effectId: "test",
        version: 3,
        x: 20,
        y: 30,
        params: { speed: 4 },
      })!;
    for (let i = 1; i < EFFECT_LIMITS.maxInstancesPerScene; i++)
      expect(duplicateSceneObject({ kind: "effect", id })).not.toBeNull();
    expect(duplicateSceneObject({ kind: "effect", id })).toBeNull();
    expect(useLightStore.getState().effects[1].params).toEqual({ speed: 4 });
    expect(useLightStore.getState().effects[1].version).toBe(3);
  });
});

test("curated starters satisfy authoring contracts and tuned values coerce to the pinned version", () => {
  for (const starter of EFFECT_STARTERS)
    expect(effectDefinitionSchema.safeParse(starter).success).toBe(true);
  const params = EFFECT_STARTERS[0].params;
  expect(
    coerceParamValues(params, { speed: 7, color: "#123456", undeclared: 99 }),
  ).toEqual({ speed: 7, color: "#123456" });
  expect(coerceParamValues(params, { speed: 99 }).speed).toBe(10);
});


test("placement outcomes match attempts through replacement, failure, retry and consent withdrawal", async () => {
  const { default: posthog } = await import("posthog-js");
  const { useCookieConsentStore } = await import("../src/stores/cookieConsentStore");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
  const oldConsent = useCookieConsentStore.getState().consent;
  const oldLoaded = posthog.__loaded;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: new URL("https://lighting-vtt.xyz/scene?id=scene-a") } });
  process.env.VITE_PUBLIC_POSTHOG_KEY = "phc_test_only";
  posthog.__loaded = true;
  const captured = spyOn(posthog, "capture").mockImplementation((event, properties) => ({ event, properties: properties ?? {}, uuid: "test" }));
  try {
    useCookieConsentStore.setState({ consent: "accepted" });
    const store = useWorkshopStore.getState;
    store().begin(BASICS[0], "gallery", null);
    expect(captured).not.toHaveBeenCalled();
    expect(store().attempt).toBeNull();
    store().retry();
    expect(store().attempt).not.toBeNull();
    store().cancel();
    captured.mockClear();
    store().begin(BASICS[0]);
    const first = store().attempt!.attempt_id;
    store().begin(BASICS[1]);
    const second = store().attempt!.attempt_id;
    store().fail("unavailable");
    store().fail("unavailable");
    store().retry();
    const retry = store().attempt!.attempt_id;
    store().complete(BASICS[1], { kind: "light", id: "placed" });
    const outcomes = captured.mock.calls.filter(([name]) => /effect_placement_(completed|failed|cancelled)/.test(name));
    expect(outcomes.map(([name, props]) => [name, props?.attempt_id])).toEqual([
      ["effect_placement_cancelled", first], ["effect_placement_failed", second], ["effect_placement_completed", retry],
    ]);
    expect(new Set([first, second, retry]).size).toBe(3);
    expect(outcomes[2][1]).toMatchObject({ kind: "light", source: "palette", role: "gm", first_in_scene: true });
    expect(outcomes[2][1]).not.toHaveProperty("x");
    expect(outcomes[2][1]).not.toHaveProperty("name");
    store().begin(BASICS[0]);
    useCookieConsentStore.setState({ consent: "rejected" });
    useCookieConsentStore.setState({ consent: "accepted" });
    store().cancel();
    expect(captured.mock.calls.filter(([name]) => name === "effect_placement_cancelled")).toHaveLength(1);
  } finally {
    captured.mockRestore();
    posthog.__loaded = oldLoaded;
    useCookieConsentStore.setState({ consent: oldConsent });
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldKey === undefined) delete process.env.VITE_PUBLIC_POSTHOG_KEY;
    else process.env.VITE_PUBLIC_POSTHOG_KEY = oldKey;
    useWorkshopStore.setState({ pending: null, attempt: null });
  }
});
