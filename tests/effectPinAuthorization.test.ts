import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import type { EffectInstance } from "../shared/effects";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/effects.ts": () => import("../convex/effects"),
  "../convex/scenes.ts": () => import("../convex/scenes"),
};

async function setup(visibility: "public" | "private" | "hidden" = "private") {
  const t = convexTest(schema, modules);
  const author = t.withIdentity({ subject: "effect-author" });
  const other = t.withIdentity({ subject: "other-gm" });
  const effectId = await t.run(async (ctx) => {
    const definition = EFFECT_STARTERS[0];
    const id = await ctx.db.insert("effects", {
      authorId: "effect-author", name: definition.name,
      description: definition.description, kind: definition.kind,
      visibility, latestVersion: 2, createdAt: 1, updatedAt: 1,
    });
    for (const version of [1, 2]) {
      await ctx.db.insert("effectVersions", { ...definition, effectId: id, version, createdAt: 1 });
    }
    return id;
  });
  const authorScene = await author.mutation(api.scenes.create, { creatorId: "effect-author", name: "Author", mapUrl: "map" });
  const otherScene = await other.mutation(api.scenes.create, { creatorId: "other-gm", name: "Other", mapUrl: "map" });
  const pin: EffectInstance = { id: "pin", effectId, version: 1, x: 0, y: 0, radius: 100, rotation: 0, params: {} };
  const update = (effects: EffectInstance[], owned = false) => (owned ? author : other).mutation(api.scenes.update, {
    id: owned ? authorScene : otherScene, creatorId: owned ? "effect-author" : "other-gm",
    lights: [], mirrors: [], tokenTemplates: [], tokens: [], effects,
  });
  const preset = (effects: EffectInstance[], owned = false) => (owned ? author : other).mutation(api.scenes.savePreset, {
    id: owned ? authorScene : otherScene, creatorId: owned ? "effect-author" : "other-gm",
    preset: { id: "preset", name: "Preset", lights: [], mirrors: [], effects },
  });
  const refs = [1, 2].map((version) => ({ effectId, version }));
  return { t, author, other, effectId, authorScene, otherScene, pin, update, preset, refs };
}

test("both write paths reject another author's private or hidden effects atomically", async () => {
  for (const visibility of ["private", "hidden"] as const) {
    const { t, otherScene, pin, update, preset } = await setup(visibility);
    for (const write of [update, preset]) {
      await expect(write([pin])).rejects.toThrow("Effect version is unavailable");
    }
    const scene = await t.run((ctx) => ctx.db.get(otherScene));
    expect(scene?.effects).toEqual([]);
    expect(scene?.presets).toEqual([]);
  }
});

test("new references must resolve to an exact existing effect version", async () => {
  const { pin, otherScene, update, preset } = await setup("public");
  for (const write of [update, preset]) {
    for (const invalid of [
      { ...pin, effectId: "not-an-id" },
      { ...pin, effectId: otherScene },
      { ...pin, version: 3 },
    ]) {
      await expect(write([invalid])).rejects.toThrow("Effect version is unavailable");
    }
  }
});

test("legacy forged active and preset pins never grant private source access", async () => {
  const { t, other, otherScene, pin, refs, update, preset } = await setup();
  await t.run((ctx) => ctx.db.patch(otherScene, {
    effects: [pin], presets: [{ id: "old", name: "Old", lights: [], mirrors: [], effects: [pin] }],
  }));
  expect(await t.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
  expect(await other.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
  // A stale reference can remain a placeholder, but cannot unlock a new version.
  await update([{ ...pin, x: 20 }]);
  await preset([pin]);
  await expect(update([{ ...pin, version: 2 }])).rejects.toThrow("Effect version is unavailable");
  await expect(preset([{ ...pin, version: 2 }])).rejects.toThrow("Effect version is unavailable");
  expect(await t.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
});

test("author-owned scenes share only actively pinned private versions", async () => {
  const { t, other, author, authorScene, otherScene, pin, refs, update, preset } = await setup();
  await preset([pin], true);
  expect(await t.query(api.effects.getVersions, { refs, sceneId: authorScene })).toEqual([]);
  await update([pin], true);
  for (const viewer of [t, other]) {
    const rows = await viewer.query(api.effects.getVersions, { refs, sceneId: authorScene });
    expect(rows.map((row) => row.version)).toEqual([1]);
    expect(await viewer.query(api.effects.getVersions, { refs })).toEqual([]);
    expect(await viewer.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
  }
  expect(await author.query(api.effects.getVersions, { refs })).toHaveLength(2);
});

test("public versions can be pinned by another GM but privatization revokes source access", async () => {
  const { t, author, effectId, authorScene, otherScene, pin, refs, update, preset } = await setup("public");
  await update([pin]);
  await preset([pin]);
  await update([pin], true);
  expect(await t.query(api.effects.getVersions, { refs, sceneId: otherScene })).toHaveLength(2);
  await author.mutation(api.effects.unpublishEffect, { effectId });
  expect(await t.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
  expect((await t.query(api.effects.getVersions, { refs, sceneId: authorScene })).map((row) => row.version)).toEqual([1]);
  // Switching away and loading a saved preset must not trap autosave in errors.
  await update([]);
  await update([{ ...pin, x: 30 }]);
  await preset([pin]);
  await expect(update([{ ...pin, version: 2 }])).rejects.toThrow("Effect version is unavailable");
  await expect(preset([{ ...pin, version: 2 }])).rejects.toThrow("Effect version is unavailable");
});

test("hidden effects stay author-only even on an author's table", async () => {
  const { t, author, effectId, authorScene, pin, refs, update } = await setup();
  await update([pin], true);
  await t.run((ctx) => ctx.db.patch(effectId, { visibility: "hidden" }));
  await update([pin], true);
  expect(await t.query(api.effects.getVersions, { refs, sceneId: authorScene })).toEqual([]);
  expect(await author.query(api.effects.getVersions, { refs, sceneId: authorScene })).toHaveLength(2);
});

test("deleted legacy pins remain inert through preset load and cannot seed another scene", async () => {
  const { t, effectId, otherScene, pin, refs, update, preset } = await setup("public");
  await preset([pin]);
  await t.run((ctx) => ctx.db.delete(effectId));
  await update([pin]);
  await preset([pin]);
  expect(await t.query(api.effects.getVersions, { refs, sceneId: otherScene })).toEqual([]);
  await expect(update([pin], true)).rejects.toThrow("Effect version is unavailable");
  await expect(preset([pin], true)).rejects.toThrow("Effect version is unavailable");
});

test("retaining pins still requires the authenticated scene owner on both write paths", async () => {
  const { t, other, authorScene, pin, update } = await setup();
  await update([pin], true);
  for (const caller of [t, other]) {
    await expect(caller.mutation(api.scenes.update, {
      id: authorScene, creatorId: "effect-author", lights: [], mirrors: [],
      tokenTemplates: [], tokens: [], effects: [pin],
    })).rejects.toThrow();
    await expect(caller.mutation(api.scenes.savePreset, {
      id: authorScene, creatorId: "effect-author",
      preset: { id: "forged", name: "Forged", lights: [], mirrors: [], effects: [pin] },
    })).rejects.toThrow();
  }
});
