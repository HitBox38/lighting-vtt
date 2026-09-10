import { mock } from "bun:test";
import assert from "node:assert/strict";

const events: Array<{ event: string; properties: Record<string, unknown> }> = [];
let visit = "visit-a";
let permitted = true;
let settle: { resolve: () => void; reject: (error: Error) => void };
mock.module("../../src/lib/convex", () => ({ convexClient: {
  mutation: () => new Promise<void>((resolve, reject) => { settle = { resolve, reject }; }),
} }));
mock.module("../../src/lib/analyticsContext", () => ({ getAnalyticsContext: () => ({ scene_visit_id: visit }) }));
mock.module("../../src/lib/analyticsOperation", () => ({ analyticsOperationGuard: () => {
  const allowedAtStart = permitted;
  return () => allowedAtStart && permitted;
} }));
mock.module("../../src/lib/analytics", () => ({
  ANALYTICS_EVENTS: {
    SceneEditPersisted: "scene_edit_persisted", SceneAutosaveFailed: "scene_autosave_failed", SceneAutosaveRecovered: "scene_autosave_recovered",
    PresetSavedNew: "preset_saved_new", PresetUpdatedCurrent: "preset_updated_current", PresetDeleted: "preset_deleted", PresetMutationFailed: "preset_mutation_failed",
  },
  capture: (event: string, properties: Record<string, unknown>) => { events.push({ event, properties }); return true; },
  errorCategory: () => "network", toCountBucket: () => "1-3",
}));

const { createScenePersister, persistPreset, removePersistedPreset } = await import("../../src/stores/lightStore/persistScene");
const timers = new Map<number, () => void>();
let nextTimer = 0;
globalThis.setTimeout = ((callback: () => void) => { timers.set(++nextTimer, callback); return nextTimer; }) as unknown as typeof setTimeout;
globalThis.clearTimeout = ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout;
const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const runTimer = () => { const [id, fn] = [...timers.entries()].at(-1)!; timers.delete(id); fn(); };
const state = { sceneId: "scene-a", creatorId: "account-a", lights: [], mirrors: [], effects: [], initialStateHash: "unchanged", saveStatus: "idle" };
const lightStore = { getState: () => state, setState: (partial: object) => Object.assign(state, partial) };
const tokenState = { tokenTemplates: [], tokens: [] as object[] };
const tokenStore = { getState: () => tokenState };
const persist = createScenePersister(lightStore as never, tokenStore as never);

persist(); runTimer();
assert.equal(events.length, 0, "submission is not a persisted edit");
settle!.reject(new Error("private network diagnostic")); await flushPromises();
persist(); runTimer(); settle!.reject(new Error("same failure")); await flushPromises();
assert.deepEqual(events.map(e => e.event), ["scene_autosave_failed"], "repeated failures are one transition");
persist(); runTimer(); settle!.resolve(); await flushPromises();
assert.deepEqual(events.map(e => e.event), ["scene_autosave_failed", "scene_edit_persisted", "scene_autosave_recovered"]);
tokenState.tokens = [{ id: "second-edit" }];
persist(); runTimer(); settle!.resolve(); await flushPromises();
assert.equal(events.filter(e => e.event === "scene_edit_persisted").length, 1, "only the first changed save in a visit is emitted");
visit = "visit-b";
persist(); runTimer();
visit = "visit-c";
settle!.resolve(); await flushPromises();
assert.equal(events.length, 3, "an old visit's response cannot affect a new visit");
permitted = false;
persist(); runTimer();
permitted = true;
settle!.resolve(); await flushPromises();
assert.equal(events.length, 3, "pre-consent saves are not replayed after acceptance");

const preset = { id: "preset-a", name: "private preset", lights: [], mirrors: [], effects: [] };
persistPreset("scene-a", "account-a", preset as never, "new", 1);
assert.equal(events.length, 3);
settle!.resolve(); await flushPromises();
assert.equal(events.at(-1)!.event, "preset_saved_new");
removePersistedPreset("scene-a", "account-a", "preset-a");
settle!.reject(new Error("private error")); await flushPromises();
assert.equal(events.at(-1)!.event, "preset_mutation_failed");
assert.equal(events.at(-1)!.properties.operation, "delete");
assert.ok(!JSON.stringify(events).includes("private"), "names and diagnostics stay out of product events");
console.log("Autosave transitions, visit boundaries, late consent and preset mutation outcomes verified.");
