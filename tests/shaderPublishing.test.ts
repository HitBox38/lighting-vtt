import { expect, test } from "bun:test";
import { createEffect, saveVersion, publishEffect } from "../convex/effects";
import type { MutationCtx } from "../convex/_generated/server";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { versionDocToDefinition } from "../src/lib/effects/hooks/useEffectDefinitions";
import { draftFromDefinition, toDefinition } from "../src/pages/EffectEditorPage/hooks/useEffectDraft";

// Exercise the actual mutation handlers against a local DB double. No deployment
// calls or public effects are created; rate-limit transport is stubbed separately.
function localContext() {
  const rows = new Map<string, Record<string, unknown>>();
  const patches: Array<{ id: string; fields: Record<string, unknown> }> = [];
  let sequence = 0;
  const ctx = {
    auth: { async getUserIdentity() { return { subject: "author", name: "Test Author" }; } },
    async runMutation() { return { ok: true }; },
    db: {
      async get(id: string) { return rows.get(id) ?? null; },
      async insert(table: string, fields: Record<string, unknown>) {
        const id = `${table}:${++sequence}`;
        rows.set(id, { ...structuredClone(fields), _id: id, _creationTime: sequence });
        return id;
      },
      async patch(id: string, fields: Record<string, unknown>) {
        patches.push({ id, fields });
        rows.set(id, { ...rows.get(id), ...structuredClone(fields) });
      },
    },
  } as unknown as MutationCtx;
  return { ctx, rows, patches };
}

function handler<Args, Result>(registered: unknown) {
  return (registered as { _handler: (ctx: MutationCtx, args: Args) => Promise<Result> })._handler;
}

test("saving and publishing WGSL-only effects preserves immutable version sources", async () => {
  const { ctx, rows, patches } = localContext();
  const first = { ...EFFECT_STARTERS[0], wgsl: `\n${EFFECT_STARTERS[0].wgsl}\n `, glsl: undefined };
  const created = await handler<{ definition: typeof first }, { effectId: Id<"effects">; version: number }>(createEffect)(ctx, { definition: first });
  expect(created.version).toBe(1);
  const version1 = [...rows.values()].find((row) => row.version === 1)!;
  const beforePublish = structuredClone(version1);

  await handler<{ effectId: Id<"effects"> }, null>(publishEffect)(ctx, { effectId: created.effectId });
  expect(rows.get(created.effectId)?.visibility).toBe("public");
  expect(patches.at(-1)?.fields).toEqual({ visibility: "public", updatedAt: expect.any(Number) });
  expect(rows.get(version1._id as string)).toEqual(beforePublish);
  expect([...rows.values()].filter((row) => row.version)).toHaveLength(1);

  const second = { ...first, wgsl: `${first.wgsl}\n// new authored version`, glsl: EFFECT_STARTERS[0].glsl };
  await handler<{ effectId: Id<"effects">; definition: typeof second }, { version: number }>(saveVersion)(ctx, { effectId: created.effectId, definition: second });
  expect(rows.get(version1._id as string)).toEqual(beforePublish);
  const version2 = [...rows.values()].find((row) => row.version === 2)!;
  const loaded = versionDocToDefinition(version2 as unknown as Doc<"effectVersions">);
  expect(toDefinition(draftFromDefinition(loaded))).toEqual(second);
  expect(version1.glsl).toBeUndefined();
  expect(version2.glsl).toBe(second.glsl);
});

test("server save validation rejects blank required WGSL without inserting a version", async () => {
  const { ctx, rows } = localContext();
  const definition = { ...EFFECT_STARTERS[0], wgsl: " \n\t" };
  await expect(handler<{ definition: typeof definition }, unknown>(createEffect)(ctx, { definition })).rejects.toThrow("WGSL source is required");
  expect(rows.size).toBe(0);
});
