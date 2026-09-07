import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { convexTest } from "convex-test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { requestThumbnail } from "../convex/lib/thumbnailJobs";
import { THUMBNAIL_FIXTURES } from "../shared/effectThumbnailFixtures";
import { thumbnailShaderInput } from "../shared/effectThumbnail";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/effects.ts": () => import("../convex/effects"),
  "../convex/thumbnails.ts": () => import("../convex/thumbnails"),
};
let timers: ReturnType<typeof spyOn>;
beforeEach(() => {
  process.env.EFFECT_THUMBNAILS_ENABLED = "true";
  // Execute dispatch explicitly: Bun's clock mocking does not virtualize timers.
  timers = spyOn(globalThis, "setTimeout").mockImplementation((() => 0) as unknown as typeof setTimeout);
});
afterEach(() => { timers.mockRestore(); delete process.env.EFFECT_THUMBNAILS_ENABLED; });

async function setup() {
  const t = convexTest(schema, modules);
  for (const [name, pkg] of [["rateLimiter", "rate-limiter"], ["thumbnailWorkpool", "workpool"]]) {
    const root = join(import.meta.dir, "../node_modules/@convex-dev", pkg, "src/component");
    const componentModules = Object.fromEntries([...new Bun.Glob("**/*.ts").scanSync(root)].filter((p) => !p.endsWith(".d.ts")).map((p) => ["./component/" + p.replaceAll("\\", "/"), () => import(pathToFileURL(join(root, p)).href)]));
    t.registerComponent(name, (await import(pathToFileURL(join(root, "schema.ts")).href)).default, componentModules);
  }
  const owner = t.withIdentity({ subject: "thumbnail-test-owner", name: "Test" });
  const { effectId } = await owner.mutation(api.effects.createEffect, { definition: THUMBNAIL_FIXTURES[0] });
  const row = () => t.run((ctx) => ctx.db.query("effectThumbnails").withIndex("by_effectId", (q) => q.eq("effectId", effectId)).unique());
  const claim = async () => {
    const pending = (await row())!;
    await t.run((ctx) => ctx.db.patch(pending._id, { nextRunAt: 0 }));
    await t.mutation(internal.thumbnails.dispatch, { effectId });
    const r = (await row())!;
    const job = { effectId, version: r.requestedVersion, revision: r.rendererRevision, generation: r.generation };
    return { job, workId: r.workId! };
  };
  const image = () => t.run((ctx) => ctx.storage.store(new Blob(["fixture"], { type: "image/png" })));
  return { t, owner, effectId, row, claim, image };
}

test("rapid saves coalesce, duplicate claims cannot render, and stale results cannot publish", async () => {
  const { t, owner, effectId, row, claim, image } = await setup();
  for (let i = 0; i < 3; i++) await owner.mutation(api.effects.saveVersion, { effectId, definition: THUMBNAIL_FIXTURES[0] });
  expect((await row())!.requestedVersion).toBe(4);
  expect(await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())).toHaveLength(1);
  const { job, workId } = await claim();
  expect(await t.mutation(internal.thumbnails.begin, job)).toHaveProperty("attempt", 1);
  expect(await t.mutation(internal.thumbnails.begin, job)).toBe("busy");
  await owner.mutation(api.effects.saveVersion, { effectId, definition: THUMBNAIL_FIXTURES[1] });
  const storageId = await image();
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(false);
  expect(await t.run((ctx) => ctx.storage.get(storageId))).toBeNull();
  await t.mutation(internal.thumbnails.completed, { workId: workId as never, context: job, result: { kind: "success", returnValue: { category: "superseded", retryable: false } } });
  const next = (await row())!;
  expect(next.status).toBe("pending");
  expect(next.attempts).toBe(0);
  expect(next.workId).toBeUndefined();
  expect(next.nextRunAt).toBeGreaterThanOrEqual(next.startedAt! + 60_000);
});

test("publication is idempotent, keeps immutable versions and ordering, and protects private metadata", async () => {
  const { t, owner, effectId, row, claim, image } = await setup();
  const before = await owner.query(api.effects.getEffect, { effectId });
  const immutable = await owner.query(api.effects.getVersion, { effectId, version: 1 });
  const { job } = await claim();
  await t.mutation(internal.thumbnails.begin, job);
  const storageId = await image();
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(true);
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(true);
  expect(await owner.query(api.effects.getVersion, { effectId, version: 1 })).toEqual(immutable);
  expect((await owner.query(api.effects.getEffect, { effectId }))!.updatedAt).toBe(before!.updatedAt);
  expect(await t.query(api.effects.getEffect, { effectId })).toBeNull();
  expect(await t.withIdentity({ subject: "someone-else" }).query(api.effects.getEffect, { effectId })).toBeNull();
  await owner.mutation(api.effects.saveVersion, { effectId, definition: THUMBNAIL_FIXTURES[1] });
  expect((await row())!.storageId).toBe(storageId);
  expect((await owner.query(api.effects.getEffect, { effectId }))!.generatedThumbnailUrl).toBeTruthy();
  await t.run((ctx) => ctx.db.patch(effectId, { visibility: "hidden" }));
  expect(await t.query(api.effects.getEffect, { effectId })).toBeNull();
});

test("transient failures retry three attempts with backoff; timeouts stop and preserve the last image", async () => {
  const { t, effectId, row, claim, image } = await setup();
  const previous = await image();
  const pending = (await row())!;
  await t.run((ctx) => ctx.db.patch(pending._id, { storageId: previous, renderedVersion: 0 }));
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { job, workId } = await claim();
    await t.mutation(internal.thumbnails.begin, job);
    const now = Date.now();
    await t.mutation(internal.thumbnails.completed, { workId: workId as never, context: job, result: { kind: "success", returnValue: { category: "storage", retryable: true } } });
    const r = (await row())!;
    expect(r.attempts).toBe(attempt);
    expect(r.status).toBe(attempt === 3 ? "failed" : "pending");
    if (attempt < 3) expect(r.nextRunAt).toBeGreaterThanOrEqual(now + 60_000 * 2 ** (attempt - 1));
    expect(r.storageId).toBe(previous);
  }
  await t.run((ctx) => requestThumbnail(ctx, effectId, 2));
  const { job, workId } = await claim();
  await t.mutation(internal.thumbnails.completed, { workId: workId as never, context: job, result: { kind: "success", returnValue: { category: "timeout", retryable: false } } });
  expect((await row())!.status).toBe("failed");
  expect((await row())!.attempts).toBe(0);
});

test("deletion during rendering rejects storage; duplicate rejection and cancellation are harmless", async () => {
  const { t, owner, effectId, row, claim, image } = await setup();
  const { job, workId } = await claim();
  await t.mutation(internal.thumbnails.begin, job);
  const storageId = await image();
  await owner.mutation(api.effects.deleteEffect, { effectId });
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(false);
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(false);
  await t.mutation(internal.thumbnails.completed, { workId: workId as never, context: job, result: { kind: "canceled" } });
  expect(await row()).toBeNull();
});

test("flag disables enqueue; shader remixes discard inherited thumbnails", async () => {
  const { t, owner, effectId } = await setup();
  delete process.env.EFFECT_THUMBNAILS_ENABLED;
  const remix = await owner.mutation(api.effects.createEffect, { definition: { ...THUMBNAIL_FIXTURES[0], source: { effectId, version: 1 }, thumbnailUrl: "https://example.com/old.png", thumbnailKey: "old" } });
  const saved = await owner.query(api.effects.getVersion, remix);
  expect(saved!.thumbnailUrl).toBeUndefined();
  expect(await t.run((ctx) => ctx.db.query("effectThumbnails").withIndex("by_effectId", (q) => q.eq("effectId", remix.effectId)).unique())).toBeNull();
});

test("fixed snapshot packs saved number, boolean, and color defaults and rejects script effects", () => {
  const input = thumbnailShaderInput(THUMBNAIL_FIXTURES[2]);
  expect(input.effect[0]).toBe(0.5);
  expect(input.effect[4]).toBe(1);
  expect(input.effect[8]).toBeCloseTo(64 / 255);
  expect(input.effect.slice(32, 39)).toEqual([320, 180, 640, 360, 640, 360, 1]);
  expect(() => thumbnailShaderInput({ ...THUMBNAIL_FIXTURES[0], kind: "script" })).toThrow("Only WGSL");
});

test("a save while generation is disabled cannot be overwritten after re-enabling", async () => {
  const { t, owner, effectId, claim, image } = await setup();
  const { job } = await claim();
  await t.mutation(internal.thumbnails.begin, job);
  process.env.EFFECT_THUMBNAILS_ENABLED = "false";
  await owner.mutation(api.effects.saveVersion, { effectId, definition: THUMBNAIL_FIXTURES[1] });
  process.env.EFFECT_THUMBNAILS_ENABLED = "true";
  const storageId = await image();
  expect(await t.mutation(internal.thumbnails.finish, { ...job, storageId })).toBe(false);
  expect(await t.run((ctx) => ctx.storage.get(storageId))).toBeNull();
});
