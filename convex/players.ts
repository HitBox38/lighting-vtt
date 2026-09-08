import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { scenePlayerValidator } from "./schema";
import { assertCreatorMatchesIdentity, getCurrentUserIdOrNull } from "./lib/auth";
import { canAuthenticatePlayer, hashGuestPlayerToken } from "./lib/playerAuth";
import { isGuestPlayerToken } from "../shared/playerSession";

const DM_ONLINE_THRESHOLD_MS = 45_000;

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Generate (or regenerate) an invite code for a scene. */
export const createInviteCode = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can generate invite codes");
    }

    if (scene.inviteCode) {
      return scene.inviteCode;
    }

    const code = generateInviteCode();
    await ctx.db.patch(args.sceneId, { inviteCode: code });
    return code;
  },
});

/** Regenerate an invite code, invalidating the old one. */
export const regenerateInviteCode = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can generate invite codes");
    }

    const code = generateInviteCode();
    await ctx.db.patch(args.sceneId, { inviteCode: code });
    return code;
  },
});

/** Look up a scene by its invite code. Returns null if not found. */
export const getSceneByInviteCode = query({
  args: { inviteCode: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("scenes"),
      name: v.string(),
      mapUrl: v.string(),
      creatorId: v.string(),
      dmOnline: v.boolean(),
      players: v.array(scenePlayerValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scene = await ctx.db
      .query("scenes")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!scene) return null;

    const dmOnline =
      typeof scene.dmLastSeen === "number" &&
      Date.now() - scene.dmLastSeen < DM_ONLINE_THRESHOLD_MS;

    return {
      _id: scene._id,
      name: scene.name,
      mapUrl: scene.mapUrl,
      creatorId: scene.creatorId,
      dmOnline,
      players: scene.players ?? [],
    };
  },
});

/** DM heartbeat: marks the DM as online for this scene. */
export const dmHeartbeat = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.sceneId, { dmLastSeen: Date.now() });
    return null;
  },
});

/** Player joins a scene. Returns the new player ID. */
export const joinScene = mutation({
  args: {
    sceneId: v.id("scenes"),
    playerName: v.string(),
    characterName: v.string(),
    // Retained for older clients; authenticated identity is authoritative.
    clerkUserId: v.optional(v.string()),
    guestToken: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const clerkUserId = await getCurrentUserIdOrNull(ctx);
    if (args.clerkUserId !== undefined && args.clerkUserId !== clerkUserId) {
      throw new Error("Unauthorized: clerkUserId does not match the signed-in user");
    }
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");

    const dmOnline =
      typeof scene.dmLastSeen === "number" &&
      Date.now() - scene.dmLastSeen < DM_ONLINE_THRESHOLD_MS;
    if (!dmOnline) {
      throw new Error("Cannot join: the DM is not currently online");
    }

    const existingPlayers = scene.players ?? [];

    if (clerkUserId !== null) {
      const existing = existingPlayers.find(
        (p) => p.clerkUserId === clerkUserId,
      );
      if (existing) {
        return existing.id;
      }
    }

    if (clerkUserId === null && !isGuestPlayerToken(args.guestToken)) {
      throw new ConvexError("GUEST_SESSION_REQUIRED");
    }
    const playerId = crypto.randomUUID();

    const newPlayer = {
      id: playerId,
      playerName: args.playerName,
      characterName: args.characterName,
      ...(clerkUserId !== null ? { clerkUserId } : {}),
      tokenInstanceIds: [] as Array<string>,
    };

    await ctx.db.patch(args.sceneId, {
      players: [...existingPlayers, newPlayer],
    });

    if (clerkUserId === null && args.guestToken !== undefined) {
      await ctx.db.insert("guestPlayerSessions", {
        sceneId: args.sceneId,
        playerId,
        tokenHash: await hashGuestPlayerToken(args.guestToken),
      });
    }
    if (clerkUserId !== null) {
      const existingBookmark = await ctx.db
        .query("playerSceneBookmarks")
        .withIndex("by_clerkUserId_and_sceneId", (q) =>
          q.eq("clerkUserId", clerkUserId).eq("sceneId", args.sceneId),
        )
        .unique();

      if (!existingBookmark) {
        await ctx.db.insert("playerSceneBookmarks", {
          clerkUserId,
          sceneId: args.sceneId,
          playerId,
          playerName: args.playerName,
          characterName: args.characterName,
          savedAt: Date.now(),
        });
      } else {
        await ctx.db.patch(existingBookmark._id, {
          playerId,
          playerName: args.playerName,
          characterName: args.characterName,
          savedAt: Date.now(),
        });
      }
    }

    return playerId;
  },
});

/** DM updates a player's attributes (name, character, token assignments). */
export const updatePlayer = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    characterName: v.optional(v.string()),
    tokenInstanceIds: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can update players");
    }

    const players = scene.players ?? [];
    const index = players.findIndex((p) => p.id === args.playerId);
    if (index === -1) throw new Error("Player not found");

    const updated = { ...players[index] };
    if (args.playerName !== undefined) updated.playerName = args.playerName;
    if (args.characterName !== undefined) updated.characterName = args.characterName;
    if (args.tokenInstanceIds !== undefined) updated.tokenInstanceIds = args.tokenInstanceIds;

    const nextPlayers = [...players];
    nextPlayers[index] = updated;

    await ctx.db.patch(args.sceneId, { players: nextPlayers });
    return null;
  },
});

/** DM removes a player from a scene. */
export const removePlayer = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized: only the scene creator can remove players");
    }

    const players = scene.players ?? [];
    const nextPlayers = players.filter((p) => p.id !== args.playerId);
    if (nextPlayers.length === players.length) {
      throw new Error("Player not found");
    }

    const activePlayerIds = (scene.activePlayerIds ?? []).filter(
      (id) => id !== args.playerId,
    );

    await ctx.db.patch(args.sceneId, { players: nextPlayers, activePlayerIds });
    const session = await ctx.db.query("guestPlayerSessions")
      .withIndex("by_sceneId_and_playerId", (q) => q.eq("sceneId", args.sceneId).eq("playerId", args.playerId))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return null;
  },
});

/** DM toggles a player's turn (add/remove from activePlayerIds). */
export const setPlayerActive = mutation({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    playerId: v.string(),
    active: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertCreatorMatchesIdentity(ctx, args.creatorId);
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized");
    }

    const current = scene.activePlayerIds ?? [];
    let next: Array<string>;

    if (args.active) {
      next = current.includes(args.playerId)
        ? current
        : [...current, args.playerId];
    } else {
      next = current.filter((id) => id !== args.playerId);
    }

    await ctx.db.patch(args.sceneId, { activePlayerIds: next });
    return null;
  },
});

/** Remote player moves one of their assigned tokens. */
export const moveToken = mutation({
  args: {
    sceneId: v.id("scenes"),
    playerId: v.string(),
    guestToken: v.optional(v.string()),
    tokenId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) throw new Error("Scene not found");

    if (!await canAuthenticatePlayer(ctx, scene, args.playerId, args.guestToken)) {
      throw new ConvexError("PLAYER_AUTH_REQUIRED");
    }
    const players = scene.players ?? [];
    const player = players.find((p) => p.id === args.playerId);
    if (!player) throw new Error("Player not found in this scene");

    const activeIds = scene.activePlayerIds ?? [];
    if (!activeIds.includes(args.playerId)) {
      throw new Error("It is not your turn to move tokens");
    }

    if (!player.tokenInstanceIds.includes(args.tokenId)) {
      throw new Error("You are not assigned to this token");
    }

    const tokens = scene.tokens ?? [];
    const tokenIndex = tokens.findIndex((t) => t.id === args.tokenId);
    if (tokenIndex === -1) throw new Error("Token not found");

    const nextTokens = [...tokens];
    nextTokens[tokenIndex] = { ...nextTokens[tokenIndex], x: args.x, y: args.y };

    await ctx.db.patch(args.sceneId, {
      tokens: nextTokens,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Get all scene bookmarks for a logged-in player. */
export const getPlayerBookmarks = query({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("playerSceneBookmarks"),
      clerkUserId: v.string(),
      sceneId: v.id("scenes"),
      playerId: v.string(),
      playerName: v.string(),
      characterName: v.string(),
      savedAt: v.number(),
      sceneName: v.string(),
      dmOnline: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const bookmarks = await ctx.db
      .query("playerSceneBookmarks")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const results = [];
    for (const bookmark of bookmarks) {
      const scene = await ctx.db.get(bookmark.sceneId);
      if (!scene) continue;

      const dmOnline =
        typeof scene.dmLastSeen === "number" &&
        Date.now() - scene.dmLastSeen < DM_ONLINE_THRESHOLD_MS;

      results.push({
        _id: bookmark._id,
        clerkUserId: bookmark.clerkUserId,
        sceneId: bookmark.sceneId,
        playerId: bookmark.playerId,
        playerName: bookmark.playerName,
        characterName: bookmark.characterName,
        savedAt: bookmark.savedAt,
        sceneName: scene.name,
        dmOnline,
      });
    }

    return results;
  },
});

/** Remove a player scene bookmark. */
export const removeBookmark = mutation({
  args: { bookmarkId: v.id("playerSceneBookmarks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.bookmarkId);
    return null;
  },
});
