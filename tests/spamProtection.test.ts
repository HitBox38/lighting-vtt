import { afterEach, expect, spyOn, test } from "bun:test";
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { registerRateLimiter } from "./helpers/rateLimiter";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/scenes.ts": () => import("../convex/scenes"),
  "../convex/players.ts": () => import("../convex/players"),
};
let clock: ReturnType<typeof spyOn<typeof Date, "now">> | undefined;
afterEach(() => { clock?.mockRestore(); });

async function setup() {
  const t = convexTest(schema, modules);
  await registerRateLimiter(t);
  const sceneId = await t.run((ctx) => ctx.db.insert("scenes", {
    creatorId: "dm", name: "Table", mapUrl: "map", lights: [], mirrors: [], presets: [],
    updatedAt: Date.now(), dmLastSeen: Date.now(), inviteCode: "invite",
  }));
  return { t, sceneId, join: { sceneId, inviteCode: "invite", playerName: "Player", characterName: "Hero" } };
}

test("scene creation limits use verified accounts and refill after the burst", async () => {
  const { t } = await setup();
  let now = Date.now();
  clock = spyOn(Date, "now").mockImplementation(() => now);
  const alice = t.withIdentity({ subject: "alice" });
  const create = { creatorId: "alice", name: "Scene", mapUrl: "map" };
  await expect(t.mutation(api.scenes.create, create)).rejects.toThrow("Not authenticated");
  for (let i = 0; i < 10; i++) await alice.mutation(api.scenes.create, create);
  await expect(alice.mutation(api.scenes.create, create)).rejects.toThrow("Too many new scenes");
  await expect(alice.mutation(api.scenes.create, { ...create, creatorId: "bob" })).rejects.toThrow("does not match");
  await t.withIdentity({ subject: "bob" }).mutation(api.scenes.create, { ...create, creatorId: "bob" });
  expect(await t.run((ctx) => ctx.db.query("scenes").withIndex("by_creatorId", (q) => q.eq("creatorId", "alice")).collect())).toHaveLength(10);
  now += 120_001;
  await alice.mutation(api.scenes.create, create);
});

test("rotating guest tokens and accounts cannot bypass scene enrollment limits; members can resume", async () => {
  const { t, sceneId, join } = await setup();
  const now = Date.now();
  clock = spyOn(Date, "now").mockReturnValue(now);
  const member = t.withIdentity({ subject: "member" });
  const memberId = await member.mutation(api.players.joinScene, join);
  for (let i = 0; i < 19; i++) {
    await t.mutation(api.players.joinScene, { ...join, guestToken: i.toString(16).padStart(64, "0") });
  }
  const before = await t.run(async (ctx) => ({ scene: await ctx.db.get(sceneId), sessions: await ctx.db.query("guestPlayerSessions").collect() }));
  await expect(t.mutation(api.players.joinScene, { ...join, guestToken: "f".repeat(64) })).rejects.toThrow("Too many new players");
  await expect(t.withIdentity({ subject: "new-account" }).mutation(api.players.joinScene, join)).rejects.toThrow("Too many new players");
  expect(await member.mutation(api.players.joinScene, { ...join, inviteCode: undefined })).toBe(memberId);
  expect(await t.run(async (ctx) => ({ scene: await ctx.db.get(sceneId), sessions: await ctx.db.query("guestPlayerSessions").collect() }))).toEqual(before);
  // A busy table does not block unrelated tables.
  const otherScene = await t.withIdentity({ subject: "dm" }).mutation(api.scenes.create, { creatorId: "dm", name: "Other", mapUrl: "map" });
  await t.run((ctx) => ctx.db.patch(otherScene, { dmLastSeen: now, inviteCode: "other-invite" }));
  await t.mutation(api.players.joinScene, { ...join, sceneId: otherScene, inviteCode: "other-invite", guestToken: "f".repeat(64) });
});

test("invalid enrollments do not spend quota and player data stays bounded", async () => {
  const { t, sceneId, join } = await setup();
  for (let i = 0; i < 25; i++) {
    await expect(t.mutation(api.players.joinScene, { ...join, inviteCode: "wrong", guestToken: "a".repeat(64) })).rejects.toThrow("Invalid scene invite");
  }
  for (const field of ["playerName", "characterName"]) {
    await expect(t.mutation(api.players.joinScene, { ...join, [field]: "x".repeat(101), guestToken: "a".repeat(64) })).rejects.toThrow("at most 100");
  }
  await t.mutation(api.players.joinScene, { ...join, guestToken: "a".repeat(64) });
  await t.run((ctx) => ctx.db.patch(sceneId, {
    players: Array.from({ length: 50 }, (_, i) => ({ id: `p${i}`, playerName: "P", characterName: "C", tokenInstanceIds: [] })),
  }));
  await expect(t.mutation(api.players.joinScene, { ...join, guestToken: "b".repeat(64) })).rejects.toThrow("scene is full");
  expect((await t.run((ctx) => ctx.db.get(sceneId)))?.players).toHaveLength(50);
  expect(await t.run((ctx) => ctx.db.query("guestPlayerSessions").collect())).toHaveLength(1);
});
