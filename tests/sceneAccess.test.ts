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
});
