import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/players.ts": () => import("../convex/players"),
  "../convex/scenes.ts": () => import("../convex/scenes"),
};

async function setup() {
  const t = convexTest(schema, modules);
  const sceneId = await t.run((ctx) => ctx.db.insert("scenes", {
    creatorId: "dm", name: "Table", mapUrl: "https://example.com/map.png",
    lights: [], mirrors: [], presets: [], updatedAt: Date.now(), dmLastSeen: Date.now(),
    players: [{ id: "signed-player", clerkUserId: "player", playerName: "Player", characterName: "Hero", tokenInstanceIds: ["token"] }],
    tokens: [{ id: "token", templateId: "template", x: 0, y: 0 }], activePlayerIds: ["signed-player"],
  }));
  const move = { sceneId, playerId: "signed-player", tokenId: "token", x: 20, y: 30 };
  const scene = () => t.run((ctx) => ctx.db.get(sceneId));
  return { t, sceneId, move, scene };
}

test("public player identifiers cannot authorize anonymous or another account's moves", async () => {
  const { t, move, scene } = await setup();
  const before = await scene();
  for (const caller of [t, t.withIdentity({ subject: "attacker" })]) {
    await expect(caller.mutation(api.players.moveToken, move)).rejects.toThrow("PLAYER_AUTH_REQUIRED");
    expect(await scene()).toEqual(before);
  }
});

test("the authenticated player can move their assigned token during their turn", async () => {
  const { t, move, scene } = await setup();
  await t.withIdentity({ subject: "player" }).mutation(api.players.moveToken, move);
  expect((await scene())?.tokens?.[0]).toMatchObject({ x: 20, y: 30 });
});

test("legacy guest entries without a private session cannot be reclaimed using their public ID", async () => {
  const { t, sceneId, move, scene } = await setup();
  await t.run((ctx) => ctx.db.patch(sceneId, {
    players: [{ id: "signed-player", playerName: "Guest", characterName: "Hero", tokenInstanceIds: ["token"] }],
  }));
  const before = await scene();
  await expect(t.mutation(api.players.moveToken, move)).rejects.toThrow("PLAYER_AUTH_REQUIRED");
  expect(await scene()).toEqual(before);
});

async function setupGuest() {
  const fixture = await setup();
  const { t, sceneId } = fixture;
  const guestToken = "a".repeat(64);
  const playerId = await t.mutation(api.players.joinScene, {
    sceneId, playerName: "Guest", characterName: "Hero", guestToken,
  });
  const dm = t.withIdentity({ subject: "dm" });
  await dm.mutation(api.players.updatePlayer, { sceneId, creatorId: "dm", playerId, tokenInstanceIds: ["token"] });
  await dm.mutation(api.players.setPlayerActive, { sceneId, creatorId: "dm", playerId, active: true });
  return { ...fixture, guestToken, playerId, dm, guestMove: { ...fixture.move, playerId, guestToken } };
}

test("guest capability works anonymously and after optional sign-in without being published", async () => {
  const { t, sceneId, guestMove, guestToken, scene } = await setupGuest();
  await t.mutation(api.players.moveToken, guestMove);
  await t.withIdentity({ subject: "now-signed-in" }).mutation(api.players.moveToken, { ...guestMove, x: 40 });
  expect((await scene())?.tokens?.[0].x).toBe(40);
  const sessions = await t.run((ctx) => ctx.db.query("guestPlayerSessions").collect());
  expect(sessions).toHaveLength(1);
  expect(sessions[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  expect(sessions[0].tokenHash).not.toBe(guestToken);
  await t.run((ctx) => ctx.db.patch(sceneId, { inviteCode: "guest-invite" }));
  const publicResults = [await t.query(api.scenes.getById, { id: sceneId }), await t.query(api.players.getSceneByInviteCode, { inviteCode: "guest-invite" })];
  for (const result of publicResults) {
    expect(JSON.stringify(result)).not.toContain(guestToken);
    expect(JSON.stringify(result)).not.toContain(sessions[0].tokenHash);
    expect(JSON.stringify(result)).not.toContain("guestToken");
  }
});

test("missing, forged, wrong-player and cross-scene capabilities cannot move tokens", async () => {
  const { t, guestMove, scene, sceneId } = await setupGuest();
  const before = await scene();
  for (const guestToken of [undefined, "short", "b".repeat(64)]) {
    await expect(t.mutation(api.players.moveToken, { ...guestMove, guestToken })).rejects.toThrow("PLAYER_AUTH_REQUIRED");
    expect(await scene()).toEqual(before);
  }
  for (const playerId of ["signed-player", "missing-player"]) {
    await expect(t.mutation(api.players.moveToken, { ...guestMove, playerId })).rejects.toThrow("PLAYER_AUTH_REQUIRED");
    expect(await scene()).toEqual(before);
  }
  const otherSceneId = await t.run(async (ctx) => {
    const source = (await ctx.db.get(sceneId))!;
    return ctx.db.insert("scenes", {
      creatorId: source.creatorId, name: source.name, mapUrl: source.mapUrl,
      lights: [], mirrors: [], presets: [], updatedAt: 0,
      players: source.players, tokens: source.tokens, activePlayerIds: source.activePlayerIds,
    });
  });
  const otherBefore = await t.run((ctx) => ctx.db.get(otherSceneId));
  await expect(t.mutation(api.players.moveToken, { ...guestMove, sceneId: otherSceneId })).rejects.toThrow("PLAYER_AUTH_REQUIRED");
  expect(await t.run((ctx) => ctx.db.get(otherSceneId))).toEqual(otherBefore);
});

test("removing a guest revokes the credential and deletes its private session", async () => {
  const { t, dm, sceneId, playerId, guestMove, scene } = await setupGuest();
  await dm.mutation(api.players.removePlayer, { sceneId, creatorId: "dm", playerId });
  const before = await scene();
  await expect(t.mutation(api.players.moveToken, guestMove)).rejects.toThrow("PLAYER_AUTH_REQUIRED");
  expect(await scene()).toEqual(before);
  expect(await t.run((ctx) => ctx.db.query("guestPlayerSessions").collect())).toEqual([]);
});

test("authenticated guests still need their turn and the requested token assignment", async () => {
  const { t, dm, sceneId, playerId, guestMove, scene } = await setupGuest();
  await dm.mutation(api.players.setPlayerActive, { sceneId, creatorId: "dm", playerId, active: false });
  const before = await scene();
  await expect(t.mutation(api.players.moveToken, guestMove)).rejects.toThrow("not your turn");
  expect(await scene()).toEqual(before);
  await dm.mutation(api.players.setPlayerActive, { sceneId, creatorId: "dm", playerId, active: true });
  const active = await scene();
  await expect(t.mutation(api.players.moveToken, { ...guestMove, tokenId: "other-token" })).rejects.toThrow("not assigned");
  expect(await scene()).toEqual(active);
});

test("new anonymous joins require a well-formed credential before any write", async () => {
  const { t, sceneId, scene } = await setup();
  const before = await scene();
  for (const guestToken of [undefined, "", "a".repeat(63), "A".repeat(64), "z".repeat(64)]) {
    await expect(t.mutation(api.players.joinScene, { sceneId, playerName: "Guest", characterName: "Hero", guestToken })).rejects.toThrow("GUEST_SESSION_REQUIRED");
    expect(await scene()).toEqual(before);
    expect(await t.run((ctx) => ctx.db.query("guestPlayerSessions").collect())).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("playerSceneBookmarks").collect())).toEqual([]);
  }
});
