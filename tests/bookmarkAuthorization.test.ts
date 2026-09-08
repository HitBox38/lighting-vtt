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
  const owner = t.withIdentity({ subject: "bookmark-owner" });
  const other = t.withIdentity({ subject: "other-player" });
  const { bookmarkId, otherBookmarkId, sceneId } = await t.run(async (ctx) => {
    const sceneId = await ctx.db.insert("scenes", {
      creatorId: "gm", name: "Private campaign", mapUrl: "map", lights: [], mirrors: [],
      presets: [], updatedAt: 1, dmLastSeen: Date.now(),
    });
    const bookmark = {
      sceneId, playerId: "player", playerName: "Player", characterName: "Character", savedAt: 1,
    };
    const bookmarkId = await ctx.db.insert("playerSceneBookmarks", { ...bookmark, clerkUserId: "bookmark-owner" });
    const otherBookmarkId = await ctx.db.insert("playerSceneBookmarks", { ...bookmark, clerkUserId: "other-player", playerId: "other" });
    return { bookmarkId, otherBookmarkId, sceneId };
  });
  return { t, owner, other, bookmarkId, otherBookmarkId, sceneId };
}

test("anonymous and cross-account bookmark lists are rejected", async () => {
  const { t, other } = await setup();
  await expect(t.query(api.players.getPlayerBookmarks, { clerkUserId: "bookmark-owner" })).rejects.toThrow("Not authenticated");
  await expect(other.query(api.players.getPlayerBookmarks, { clerkUserId: "bookmark-owner" })).rejects.toThrow("Unauthorized");
});

test("the owner gets only their bookmarks and missing scenes remain omitted", async () => {
  const { t, owner, other, bookmarkId, otherBookmarkId, sceneId } = await setup();
  const ownRows = await owner.query(api.players.getPlayerBookmarks, { clerkUserId: "bookmark-owner" });
  expect(ownRows).toHaveLength(1);
  expect(ownRows[0]).toMatchObject({ _id: bookmarkId, sceneId, sceneName: "Private campaign", dmOnline: true });
  expect((await other.query(api.players.getPlayerBookmarks, { clerkUserId: "other-player" })).map((row) => row._id)).toEqual([otherBookmarkId]);
  expect(await t.withIdentity({ subject: "no-bookmarks" }).query(api.players.getPlayerBookmarks, { clerkUserId: "no-bookmarks" })).toEqual([]);
  await t.run((ctx) => ctx.db.delete(sceneId));
  expect(await owner.query(api.players.getPlayerBookmarks, { clerkUserId: "bookmark-owner" })).toEqual([]);
});

test("anonymous and cross-account deletion cannot change an existing bookmark", async () => {
  const { t, other, bookmarkId } = await setup();
  await expect(t.mutation(api.players.removeBookmark, { bookmarkId })).rejects.toThrow("Not authenticated");
  await expect(other.mutation(api.players.removeBookmark, { bookmarkId })).rejects.toThrow("Unauthorized");
  expect(await t.run((ctx) => ctx.db.get(bookmarkId))).not.toBeNull();
});

test("owner deletion is idempotent and leaves other accounts untouched", async () => {
  const { t, owner, bookmarkId, otherBookmarkId } = await setup();
  expect(await owner.mutation(api.players.removeBookmark, { bookmarkId })).toBeNull();
  expect(await owner.mutation(api.players.removeBookmark, { bookmarkId })).toBeNull();
  expect(await t.run((ctx) => ctx.db.get(bookmarkId))).toBeNull();
  expect(await t.run((ctx) => ctx.db.get(otherBookmarkId))).not.toBeNull();
  await expect(t.mutation(api.players.removeBookmark, { bookmarkId })).rejects.toThrow("Not authenticated");
});
