import { importStarterScript } from "./helpers/importScript";
import { expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { draftFromDefinition, newEffectDraft, recoveryDraftSchema, serializeDraft, toDefinition } from "../src/pages/EffectEditorPage/hooks/useEffectDraft";
import { reconcilePreviewValues } from "../src/lib/effects/previewValues";
import { describeMutationError, mutationRetryAt } from "../src/lib/effects/errors";
import { SCRIPT_STARTERS } from "../shared/scriptStarters";
import { defaultParamValues, effectDefinitionSchema } from "../shared/effects";
import { lintScriptSource, sanitizeScriptOutput } from "../src/lib/effects/scriptContract";

test("recovery normalization does not manufacture changes from nested property order", () => {
  const draft = newEffectDraft();
  expect(serializeDraft(recoveryDraftSchema.parse(draft))).toBe(serializeDraft(draft));
  const reversed = { ...draft, params: draft.params.map(param => Object.fromEntries(Object.entries(param).reverse())), coverage: { kind: draft.coverage.kind } };
  expect(serializeDraft(reversed as typeof draft)).toBe(serializeDraft(draft));
  expect(serializeDraft({ ...draft, params: draft.params.map(p => p.type === "number" ? { ...p, default: 3 } : p) })).not.toBe(serializeDraft(draft));
  const saved = draftFromDefinition(toDefinition(draft));
  expect(serializeDraft(recoveryDraftSchema.parse(saved))).toBe(serializeDraft(saved));
});

test("defaults follow edits while deliberate numeric, color, and toggle overrides survive", () => {
  const params = [
    { key: "width", label: "Width", type: "number" as const, min: 0, max: 100, step: 1, default: 20 },
    { key: "color", label: "Color", type: "color" as const, default: "#ffffff" },
    { key: "on", label: "On", type: "boolean" as const, default: true },
  ];
  const next = [{ ...params[0], default: 40 }, { ...params[1], default: "#aabbcc" }, { ...params[2], default: false }];
  expect(reconcilePreviewValues(params, next, defaultParamValues(params))).toEqual({ width: 40, color: "#aabbcc", on: false });
  expect(reconcilePreviewValues(params, next, { width: 50, color: "#112233", on: false })).toEqual({ width: 50, color: "#112233", on: false });
  expect(reconcilePreviewValues(params, [{ ...params[0], key: "size" }, params[2]], { width: 30, on: false })).toEqual({ size: 30, on: false });
  expect(reconcilePreviewValues(params, [params[2], params[0]], { width: 30, on: false })).toEqual({ width: 30, on: false });
});

test("structured cooldown survives Convex transport without parsing stack traces", () => {
  const error = new ConvexError({ kind: "RateLimited", retryAfter: 360_000, name: "publishEffect" });
  expect(mutationRetryAt(error, 1000)).toBe(361_000);
  expect(describeMutationError(error)).toContain("version is saved");
  expect(mutationRetryAt(new Error("RateLimited retryAfter: 1"), 1000)).toBeNull();
});

test("all script starters have bounded, valid output at default and extreme controls", async () => {
  for (const definition of SCRIPT_STARTERS) {
    expect(effectDefinitionSchema.safeParse(definition).success).toBe(true);
    expect(lintScriptSource(definition.script!)).toEqual([]);
    // These are checked-in curated examples, never community source.
    const module = await importStarterScript(definition.script!);
    for (const limit of [null, -1e8, 1e8]) {
      const params = limit === null ? defaultParamValues(definition.params) : Object.fromEntries(definition.params.map(p => [p.key, limit]));
      for (const lights of [[], Array.from({ length: 300 }, (_, i) => ({ x: 500 + (i % 30) * 4, y: 500 + (i % 10) * 5, radius: 100 }))]) {
        const output = module.compute({ effect: { x: 500, y: 500, radius: 250, rotation: Math.PI / 3 }, params, lights, mirrors: [] });
        expect(sanitizeScriptOutput(output).ok).toBe(true);
        expect(output.polygons.length).toBeLessThanOrEqual(64);
      }
    }
  }
});
