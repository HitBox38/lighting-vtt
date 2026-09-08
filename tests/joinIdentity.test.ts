import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/players.ts": () => import("../convex/players"),
};

async function setup() {
  const t = convexTest(schema, modules);
  const sceneId = await t.run((ctx) => ctx.db.insert("scenes", {
    creatorId: "dm", name: "Table", mapUrl: "https://example.com/map.png",
    lights: [], mirrors: [], presets: [], updatedAt: Date.now(), dmLastSeen: Date.now(),
  }));
  const args = { sceneId, playerName: "Player", characterName: "Character" };
  const snapshot = () => t.run(async (ctx) => ({
    scene: await ctx.db.get(sceneId),
    bookmarks: await ctx.db.query("playerSceneBookmarks").collect(),
  }));
  return { t, sceneId, args, snapshot };
}

test("anonymous and authenticated callers cannot claim another account or rejoin as it", async () => {
  const { t, args, snapshot } = await setup();
  await t.withIdentity({ subject: "victim" }).mutation(api.players.joinScene, {
    ...args, clerkUserId: "victim",
  });
  const before = await snapshot();
  for (const caller of [t, t.withIdentity({ subject: "attacker" })]) {
    for (const clerkUserId of ["victim", "another-victim", ""]) {
      await expect(caller.mutation(api.players.joinScene, {
        ...args, clerkUserId,
      })).rejects.toThrow("clerkUserId does not match");
      expect(await snapshot()).toEqual(before);
    }
  }
});

test("authenticated joins derive identity when the legacy claim is omitted and rejoin without duplicates", async () => {
  const { t, args, snapshot } = await setup();
  const player = t.withIdentity({ subject: "player" });
  const id = await player.mutation(api.players.joinScene, args);
  const before = await snapshot();
  expect(before.scene?.players).toEqual([expect.objectContaining({ id, clerkUserId: "player" })]);
  expect(before.bookmarks).toEqual([expect.objectContaining({ playerId: id, clerkUserId: "player" })]);
  expect(await player.mutation(api.players.joinScene, { ...args, clerkUserId: "player" })).toBe(id);
  expect(await player.mutation(api.players.joinScene, args)).toBe(id);
  expect(await snapshot()).toEqual(before);
});

test("anonymous guests remain distinct and create no account bookmarks", async () => {
  const { t, args, snapshot } = await setup();
  const first = await t.mutation(api.players.joinScene, { ...args, guestToken: "a".repeat(64) });
  const second = await t.mutation(api.players.joinScene, { ...args, guestToken: "b".repeat(64) });
  expect(second).not.toBe(first);
  const state = await snapshot();
  expect(state.scene?.players).toHaveLength(2);
  expect(state.scene?.players?.every((player) => player.clerkUserId === undefined)).toBe(true);
  expect(state.bookmarks).toEqual([]);
});

test("a returning authenticated player refreshes only their existing bookmark after removal", async () => {
  const { t, sceneId, args, snapshot } = await setup();
  const player = t.withIdentity({ subject: "player" });
  const oldId = await player.mutation(api.players.joinScene, { ...args, clerkUserId: "player" });
  const before = await snapshot();
  await t.run((ctx) => ctx.db.patch(sceneId, { players: [] }));
  const newId = await player.mutation(api.players.joinScene, { ...args, characterName: "New character" });
  expect(newId).not.toBe(oldId);
  const after = await snapshot();
  expect(after.bookmarks).toHaveLength(1);
  expect(after.bookmarks[0]).toMatchObject({
    _id: before.bookmarks[0]._id, clerkUserId: "player", playerId: newId, characterName: "New character",
  });
});

test("offline scenes still reject authenticated and guest joins without writes", async () => {
  const { t, sceneId, args, snapshot } = await setup();
  await t.run((ctx) => ctx.db.patch(sceneId, { dmLastSeen: 0 }));
  const before = await snapshot();
  for (const caller of [t, t.withIdentity({ subject: "player" })]) {
    await expect(caller.mutation(api.players.joinScene, args)).rejects.toThrow("DM is not currently online");
  }
  expect(await snapshot()).toEqual(before);
});
