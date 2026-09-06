import { expect, test } from "bun:test";
import type { WebGPURenderer } from "pixi.js";
import { watchDeviceLoss } from "../src/lib/effects/deviceLoss";
import {
  newEffectDraft,
  recoveryDraftSchema,
  toDefinition,
} from "../src/pages/EffectEditorPage/hooks/useEffectDraft";
import { effectDefinitionSchema } from "../shared/effects";

test("a lost WebGPU device reports failure without triggering a restore loop", async () => {
  const renderer = {
    gpu: { device: { lost: Promise.resolve({ reason: "unknown" }) } },
  } as unknown as WebGPURenderer;
  const events: string[] = [];
  const stop = watchDeviceLoss(renderer, "webgpu", {
    onLost: () => events.push("lost"),
    onRestored: () => events.push("restored"),
  });
  await Promise.resolve();
  expect(events).toEqual(["lost"]);
  stop();
  const cancel = watchDeviceLoss(renderer, "webgpu", {
    onLost: () => events.push("late"),
    onRestored: () => events.push("restored"),
  });
  cancel();
  await Promise.resolve();
  expect(events).toEqual(["lost"]);
});

test("unfinished drafts recover even when they cannot yet be saved", () => {
  const draft = {
    ...newEffectDraft(),
    name: "",
    wgsl: "",
    params: [
      {
        key: "",
        label: "",
        type: "number" as const,
        min: 10,
        max: 1,
        step: 0,
        default: 4,
      },
    ],
  };
  expect(effectDefinitionSchema.safeParse(toDefinition(draft)).success).toBe(
    false,
  );
  expect(recoveryDraftSchema.parse(draft)).toEqual(draft);
  expect(
    recoveryDraftSchema.safeParse({ ...draft, params: "broken" }).success,
  ).toBe(false);
});
