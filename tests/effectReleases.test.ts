import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { convexTest } from "convex-test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { EFFECT_STARTERS } from "../shared/effectStarters";
import { assertSceneEffectInstances } from "../convex/lib/effectInstances";
import type { Id } from "../convex/_generated/dataModel";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/effects.ts": () => import("../convex/effects"),
  "../convex/scenes.ts": () => import("../convex/scenes"),
};
let clock: ReturnType<typeof spyOn>;
let now = 1_800_000_000_000;
beforeEach(() => { process.env.EFFECT_VERSION_RELEASES_ENABLED = "true"; now = 1_800_000_000_000; clock = spyOn(Date, "now").mockImplementation(() => now); });
afterEach(() => { clock.mockRestore(); delete process.env.EFFECT_VERSION_RELEASES_ENABLED; delete process.env.EFFECT_ADMIN_USER_IDS; });
async function setup() {
  const t = convexTest(schema, modules);
  const root = join(import.meta.dir, "../node_modules/@convex-dev/rate-limiter/src/component");
  const componentModules = Object.fromEntries([...new Bun.Glob("**/*.ts").scanSync(root)].filter(p => !p.endsWith(".d.ts")).map(p => ["./component/" + p, () => import(pathToFileURL(join(root, p)).href)]));
  t.registerComponent("rateLimiter", (await import(pathToFileURL(join(root, "schema.ts")).href)).default, componentModules);
  const author = t.withIdentity({ subject: "author", name: "Author" });
  const other = t.withIdentity({ subject: "other", name: "Other" });
  // Seed content without spending authoring tokens; publishing uses the real component.
  const create = async (name = "Released ember") => t.run(async ctx => {
    const definition = { ...EFFECT_STARTERS[0], name };
    const effectId = await ctx.db.insert("effects", { authorId: "author", authorName: "Author", name, description: definition.description, kind: "shader", visibility: "private", latestVersion: 1, createdAt: now, updatedAt: now });
    await ctx.db.insert("effectVersions", { effectId, version: 1, createdAt: now, ...definition });
    return effectId;
  });
  return { t, author, other, create };
}

test("save keeps public catalog, search, thumbnail, and source at the released version", async () => {
  const { t, author, other, create } = await setup();
  const effectId = await create();
  await author.mutation(api.effects.publishEffect, { effectId, version: 1 });
  await author.mutation(api.effects.saveVersion, { effectId, definition: { ...EFFECT_STARTERS[0], name: "Secret snow", category: "Atmosphere", thumbnailUrl: "https://example.com/private.png" } });
  expect(await t.query(api.effects.getEffect, { effectId })).toMatchObject({ name: "Released ember", latestVersion: 1, publishedVersion: 1, category: "Light" });
  expect((await t.query(api.effects.getEffect, { effectId }))?.thumbnailUrl).not.toBe("https://example.com/private.png");
  expect(await t.query(api.effects.getVersion, { effectId, version: 2 })).toBeNull();
  expect(await other.query(api.effects.getVersion, { effectId, version: 2 })).toBeNull();
  expect(await author.query(api.effects.getVersion, { effectId, version: 2 })).toHaveProperty("name", "Secret snow");
  expect(await t.query(api.effects.listVersions, { effectId })).toHaveLength(1);
  const browse = (search: string) => t.query(api.effects.browse, { search, paginationOpts: { cursor: null, numItems: 10 } });
  expect((await browse("Secret")).page).toHaveLength(0);
  expect((await browse("Released")).page).toHaveLength(1);
  await expect(other.mutation(api.effects.createEffect, { definition: { ...EFFECT_STARTERS[0], source: { effectId, version: 2 } } })).rejects.toThrow("unavailable");
  await author.mutation(api.effects.publishEffect, { effectId, version: 2 });
  expect(await t.query(api.effects.getEffect, { effectId })).toMatchObject({ name: "Secret snow", latestVersion: 2, category: "Atmosphere" });
  expect(await t.query(api.effects.getVersion, { effectId, version: 1 })).not.toBeNull();
  expect(await t.query(api.effects.listVersions, { effectId })).toHaveLength(2);
});

test("real regular cooldown survives reopening and retries the saved version without resaving", async () => {
  const { author, create, t, other } = await setup();
  const ids: Id<"effects">[] = [];
  for (let i = 0; i < 6; i++) ids.push(await create(`Effect ${i}`));
  for (const effectId of ids.slice(0, 5)) await author.mutation(api.effects.publishEffect, { effectId, version: 1 });
  // Idempotence and authorization checks do not consume tokens.
  await author.mutation(api.effects.publishEffect, { effectId: ids[0], version: 1 });
  await expect(other.mutation(api.effects.publishEffect, { effectId: ids[5], version: 1 })).rejects.toThrow("Unauthorized");
  await expect(author.mutation(api.effects.publishEffect, { effectId: ids[5], version: 1 })).rejects.toMatchObject({ data: { kind: "RateLimited", retryAfter: 360_000 } });
  expect(await author.query(api.effects.releaseStatus, { effectId: ids[5], version: 1 })).toMatchObject({ retryAt: now + 360_000 });
  now += 360_000;
  await author.mutation(api.effects.publishEffect, { effectId: ids[5], version: 1 });
  expect(await t.query(api.effects.getEffect, { effectId: ids[5] })).toHaveProperty("publishedVersion", 1);
  expect(await author.query(api.effects.listVersions, { effectId: ids[5] })).toHaveLength(1);
});

test("curators have burst 20 and hidden effects never consume release allowance", async () => {
  const { author, t, create } = await setup();
  process.env.EFFECT_ADMIN_USER_IDS = "author";
  for (let i = 0; i < 20; i++) await author.mutation(api.effects.publishEffect, { effectId: await create(), version: 1 });
  const blocked = await create();
  await expect(author.mutation(api.effects.publishEffect, { effectId: blocked, version: 1 })).rejects.toMatchObject({ data: { retryAfter: 60_000 } });
  now += 60_000;
  await t.run(ctx => ctx.db.patch(blocked, { visibility: "hidden" }));
  await expect(author.mutation(api.effects.publishEffect, { effectId: blocked, version: 1 })).rejects.toThrow("hidden");
  const ready = await create();
  expect(await author.query(api.effects.releaseStatus, { effectId: ready, version: 1 })).toMatchObject({ curator: true, retryAt: null });
});

test("private working versions cannot be pinned or read through another GM's scene", async () => {
  const { t, author, other, create } = await setup();
  const effectId = await create();
  await author.mutation(api.effects.publishEffect, { effectId, version: 1 });
  await author.mutation(api.effects.saveVersion, { effectId, definition: EFFECT_STARTERS[0] });
  const pin = { id: "pin", effectId, version: 2, x: 0, y: 0, radius: 100, rotation: 0, params: {} };
  const sceneId = await t.run(ctx => ctx.db.insert("scenes", { creatorId: "other", name: "Table", mapUrl: "", lights: [], mirrors: [], presets: [], updatedAt: now }));
  await expect(t.run(async ctx => assertSceneEffectInstances(ctx, (await ctx.db.get(sceneId))!, [pin], "test"))).rejects.toThrow("unavailable");
  await t.run(ctx => ctx.db.patch(sceneId, { effects: [pin] }));
  expect(await other.query(api.effects.getVersions, { refs: [{ effectId, version: 2 }], sceneId })).toEqual([]);
  // The effect author's own table still grants its members access to active private pins.
  await t.run(ctx => ctx.db.patch(sceneId, { creatorId: "author", players: [{ id: "player", playerName: "Other", characterName: "Other", clerkUserId: "other", tokenInstanceIds: [] }] }));
  expect(await other.query(api.effects.getVersions, { refs: [{ effectId, version: 2 }], sceneId })).toHaveLength(1);
  await t.run(ctx => ctx.db.patch(effectId, { visibility: "hidden" }));
  expect(await other.query(api.effects.getVersions, { refs: [{ effectId, version: 2 }], sceneId })).toEqual([]);
  expect(await author.query(api.effects.getVersion, { effectId, version: 2 })).not.toBeNull();
});

test("bounded backfill preserves legacy public versions without releasing private effects", async () => {
  const { t, author, create } = await setup();
  delete process.env.EFFECT_VERSION_RELEASES_ENABLED;
  const effectId = await create();
  const privateId = await create("Private");
  await author.mutation(api.effects.publishEffect, { effectId });
  await author.mutation(api.effects.saveVersion, { effectId, definition: EFFECT_STARTERS[0] });
  await t.mutation(internal.effects.backfillReleases, {});
  await t.mutation(internal.effects.backfillVersionReleases, {});
  process.env.EFFECT_VERSION_RELEASES_ENABLED = "true";
  expect(await t.query(api.effects.listVersions, { effectId })).toHaveLength(2);
  expect(await t.query(api.effects.getVersion, { effectId: privateId, version: 1 })).toBeNull();
  await author.mutation(api.effects.saveVersion, { effectId, definition: EFFECT_STARTERS[0] });
  expect(await t.query(api.effects.getVersion, { effectId, version: 3 })).toBeNull();
});

test("disabling the rollout flag after activation never exposes working versions", async () => {
  const { t, author, create } = await setup();
  const effectId = await create();
  await author.mutation(api.effects.publishEffect, { effectId, version: 1 });
  await author.mutation(api.effects.saveVersion, { effectId, definition: { ...EFFECT_STARTERS[0], name: "Private working copy" } });
  delete process.env.EFFECT_VERSION_RELEASES_ENABLED;
  expect(await t.query(api.effects.releasePolicy, {})).toEqual({ enabled: true });
  expect(await t.query(api.effects.getVersion, { effectId, version: 2 })).toBeNull();
  expect(await t.query(api.effects.getEffect, { effectId })).toHaveProperty("name", "Released ember");
  await author.mutation(api.effects.saveVersion, { effectId, definition: EFFECT_STARTERS[0] });
  expect(await t.query(api.effects.getVersion, { effectId, version: 3 })).toBeNull();
});
