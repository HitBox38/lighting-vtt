import { expect, test } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { EFFECT_STARTERS } from "../shared/effectStarters";

const modules = {
  "../convex/_generated/server.ts": () => import("../convex/_generated/server"),
  "../convex/scenes.ts": () => import("../convex/scenes"),
  "../convex/players.ts": () => import("../convex/players"),
  "../convex/effects.ts": () => import("../convex/effects"),
};

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "dm" });
  const member = t.withIdentity({ subject: "member" });
  const outsider = t.withIdentity({ subject: "outsider" });
  const sceneId = await t.run((ctx) => ctx.db.insert("scenes", {
    creatorId: "dm", name: "Private table", mapUrl: "map", lights: [], mirrors: [],
    presets: [], updatedAt: 1, dmLastSeen: Date.now(), inviteCode: "invite-secret",
    players: [{ id: "member-player", clerkUserId: "member", playerName: "Member", characterName: "Character", tokenInstanceIds: [] }],
  }));
  return { t, owner, member, outsider, sceneId };
}

test("a scene ID alone cannot read a scene or enroll a new account", async () => {
  const { t, outsider, sceneId } = await setup();
  for (const caller of [t, outsider]) {
    expect(await caller.query(api.scenes.getById, { id: sceneId })).toBeNull();
    await expect(caller.mutation(api.players.joinScene, {
      sceneId, playerName: "Intruder", characterName: "Intruder",
    })).rejects.toThrow();
  }
  expect((await t.run((ctx) => ctx.db.get(sceneId)))?.players).toHaveLength(1);
});

test("scene enumeration is scoped to the authenticated creator", async () => {
  const { t, owner, member, outsider, sceneId } = await setup();
  for (const caller of [t, member, outsider]) {
    await expect(caller.query(api.scenes.getByCreatorId, { creatorId: "dm" })).rejects.toThrow();
  }
  expect((await owner.query(api.scenes.getByCreatorId, { creatorId: "dm" })).map((scene) => scene._id)).toEqual([sceneId]);
  expect(await outsider.query(api.scenes.getByCreatorId, { creatorId: "outsider" })).toEqual([]);
});

test("creator TV reads and account bookmark resume work without an invite", async () => {
  const { t, owner, member, sceneId } = await setup();
  expect((await owner.query(api.scenes.getById, { id: sceneId }))?._id).toBe(sceneId);
  expect((await member.query(api.scenes.getById, { id: sceneId }))?._id).toBe(sceneId);
  expect(await member.mutation(api.players.joinScene, {
    sceneId, playerName: "Member", characterName: "Character",
  })).toBe("member-player");
  await owner.mutation(api.players.removePlayer, { sceneId, creatorId: "dm", playerId: "member-player" });
  expect(await member.query(api.scenes.getById, { id: sceneId })).toBeNull();
  await expect(member.mutation(api.players.joinScene, { sceneId, playerName: "Member", characterName: "Character" })).rejects.toThrow();
  expect((await t.run((ctx) => ctx.db.get(sceneId)))?.players).toEqual([]);
});

test("scene pins cannot bypass scene access when fetching private effect source", async () => {
  const { t, owner, member, outsider, sceneId } = await setup();
  const effectId = await t.run(async (ctx) => {
    const definition = EFFECT_STARTERS[0];
    const effectId = await ctx.db.insert("effects", {
      authorId: "dm", name: definition.name, description: definition.description,
      kind: definition.kind, visibility: "private", latestVersion: 1, createdAt: 1, updatedAt: 1,
    });
    await ctx.db.insert("effectVersions", { ...definition, effectId, version: 1, createdAt: 1 });
    await ctx.db.patch(sceneId, { effects: [{ id: "pin", effectId, version: 1, x: 0, y: 0, radius: 100, rotation: 0, params: {} }] });
    return effectId;
  });
  const refs = [{ effectId, version: 1 }];
  for (const caller of [t, outsider]) {
    expect(await caller.query(api.effects.getVersions, { refs, sceneId })).toEqual([]);
  }
  expect(await member.query(api.effects.getVersions, { refs, sceneId })).toHaveLength(1);
  expect(await owner.query(api.effects.getVersions, { refs })).toHaveLength(1);
  const guestToken = "a".repeat(64);
  const playerId = await t.mutation(api.players.joinScene, {
    sceneId, inviteCode: "invite-secret", guestToken, playerName: "Guest", characterName: "Hero",
  });
  expect(await t.query(api.effects.getVersions, { refs, sceneId, playerId, guestToken })).toHaveLength(1);
  expect(await t.query(api.effects.getVersions, { refs, sceneId, playerId, guestToken: "b".repeat(64) })).toEqual([]);
  expect(await t.query(api.effects.getVersions, { refs, sceneId, playerId: "member-player", guestToken })).toEqual([]);
  await owner.mutation(api.players.removePlayer, { sceneId, creatorId: "dm", playerId });
  expect(await t.query(api.effects.getVersions, { refs, sceneId, playerId, guestToken })).toEqual([]);
  await t.run((ctx) => ctx.db.patch(effectId, { visibility: "public" }));
  expect(await t.query(api.effects.getVersions, { refs, sceneId })).toHaveLength(1);
});

test("new account and guest enrollment require the current invite and reject ID-only joins atomically", async () => {
  const { t, outsider, owner, sceneId } = await setup();
  const guestToken = "c".repeat(64);
  const joinArgs = { sceneId, playerName: "New", characterName: "Hero", guestToken };
  const snapshot = () => t.run(async (ctx) => ({
    scene: await ctx.db.get(sceneId), bookmarks: await ctx.db.query("playerSceneBookmarks").collect(),
    sessions: await ctx.db.query("guestPlayerSessions").collect(),
  }));
  const before = await snapshot();
  for (const caller of [t, outsider]) {
    for (const inviteCode of [undefined, "", "wrong"]) {
      await expect(caller.mutation(api.players.joinScene, { ...joinArgs, inviteCode })).rejects.toThrow("Invalid scene invite");
      expect(await snapshot()).toEqual(before);
    }
  }
  await owner.mutation(api.players.regenerateInviteCode, { sceneId, creatorId: "dm" });
  await expect(outsider.mutation(api.players.joinScene, { ...joinArgs, inviteCode: "invite-secret" })).rejects.toThrow("Invalid scene invite");
  const currentInvite = (await snapshot()).scene!.inviteCode!;
  const id = await outsider.mutation(api.players.joinScene, { ...joinArgs, inviteCode: currentInvite });
  expect((await outsider.query(api.scenes.getById, { id: sceneId }))?._id).toBe(sceneId);
  expect(await outsider.mutation(api.players.joinScene, joinArgs)).toBe(id);
  await t.run((ctx) => ctx.db.patch(sceneId, { inviteCode: undefined }));
  await expect(t.mutation(api.players.joinScene, joinArgs)).rejects.toThrow("Invalid scene invite");
});

test("guest read proof is scoped to current player, scene and token, including refresh and removal", async () => {
  const { t, owner, outsider, sceneId } = await setup();
  const guestToken = "d".repeat(64);
  const playerId = await t.mutation(api.players.joinScene, {
    sceneId, inviteCode: "invite-secret", guestToken, playerName: "Guest", characterName: "Hero",
  });
  const proof = { id: sceneId, playerId, guestToken };
  for (const caller of [t, outsider]) {
    expect((await caller.query(api.scenes.getById, proof))?._id).toBe(sceneId);
    expect((await caller.query(api.scenes.getById, proof))?._id).toBe(sceneId);
  }
  for (const wrong of [
    { ...proof, guestToken: undefined }, { ...proof, guestToken: "short" },
    { ...proof, guestToken: "e".repeat(64) }, { ...proof, playerId: "member-player" },
    { ...proof, playerId: "missing" },
  ]) expect(await t.query(api.scenes.getById, wrong)).toBeNull();
  // Even a matching roster ID in another scene cannot reuse the first scene's session.
  const otherScene = await t.run((ctx) => ctx.db.insert("scenes", {
    creatorId: "other-dm", name: "Other", mapUrl: "map", lights: [], mirrors: [], presets: [], updatedAt: 1,
    players: [{ id: playerId, playerName: "Guest", characterName: "Hero", tokenInstanceIds: [] }],
  }));
  expect(await t.query(api.scenes.getById, { ...proof, id: otherScene })).toBeNull();
  await owner.mutation(api.players.removePlayer, { sceneId, creatorId: "dm", playerId });
  expect(await t.query(api.scenes.getById, proof)).toBeNull();
  await t.run((ctx) => ctx.db.delete(otherScene));
  expect(await owner.query(api.scenes.getById, { id: otherScene })).toBeNull();
});

test("invite lookups expose only join context and caller-specific membership", async () => {
  const { t, member, outsider, sceneId } = await setup();
  for (const caller of [t, outsider]) {
    expect(await caller.query(api.players.getSceneByInviteCode, { inviteCode: "invite-secret" })).toEqual({
      _id: sceneId, name: "Private table", dmOnline: true, alreadyJoined: false,
    });
  }
  expect(await member.query(api.players.getSceneByInviteCode, { inviteCode: "invite-secret" })).toEqual({
    _id: sceneId, name: "Private table", dmOnline: true, alreadyJoined: true,
  });
  expect(await t.query(api.players.getSceneByInviteCode, { inviteCode: "wrong" })).toBeNull();
});
