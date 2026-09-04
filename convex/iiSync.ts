"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// ---------------------------------------------------------------------------
// Types for the improvedinitiative.app player-view JSON response
// ---------------------------------------------------------------------------

interface IICombatant {
  Id: string;
  Name: string;
  HPDisplay?: string; // e.g. "12/30" or a number
  HPColor?: string;
  AC?: number | string;
  InitiativeModifier?: number;
  IsPlayerCharacter?: boolean;
  ImageURL?: string;
  CurrentHP?: number;
  MaxHP?: number;
  TemporaryHP?: number;
}

interface IIPlayerView {
  ActiveCombatantId?: string;
  RoundCounter?: number;
  TurnTimer?: unknown;
  Combatants?: IICombatant[];
  EncounterId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const II_BASE_URL = "https://improvedinitiative.app";

/** Parse an encounter ID from a URL or raw ID string. */
function parseEncounterId(input: string): string {
  const trimmed = input.trim();

  // Handle full URLs like https://improvedinitiative.app/p/<id>
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?improvedinitiative\.app\/(?:p|playerviews?)\/([A-Za-z0-9_-]+)/,
  );
  if (urlMatch) return urlMatch[1];

  // Handle raw alphanumeric IDs
  if (/^[A-Za-z0-9_-]{4,48}$/.test(trimmed)) return trimmed;

  throw new Error(
    `Invalid encounter ID or URL: "${trimmed}". Expected an alphanumeric ID or a URL like https://improvedinitiative.app/p/<id>`,
  );
}

/** Normalize an II combatant into our flat shape. */
function normalizeCombatant(c: IICombatant) {
  // HP can come as "CurrentHP/MaxHP" string in HPDisplay, or as separate fields
  let currentHp: number | undefined = c.CurrentHP;
  let maxHp: number | undefined = c.MaxHP;
  const tempHp: number | undefined = c.TemporaryHP;

  if (currentHp === undefined && c.HPDisplay) {
    const parts = String(c.HPDisplay).split("/");
    if (parts.length === 2) {
      const cur = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(cur)) currentHp = cur;
      if (!isNaN(max)) maxHp = max;
    } else {
      const single = parseInt(String(c.HPDisplay), 10);
      if (!isNaN(single)) currentHp = single;
    }
  }

  let ac: number | undefined;
  if (typeof c.AC === "number") {
    ac = c.AC;
  } else if (typeof c.AC === "string") {
    const parsed = parseInt(c.AC, 10);
    if (!isNaN(parsed)) ac = parsed;
  }

  return {
    id: c.Id,
    name: c.Name,
    currentHp,
    maxHp,
    tempHp,
    ac,
    imageUrl: c.ImageURL,
  };
}

// ---------------------------------------------------------------------------
// Public action: fetch a player view (server-side to bypass CORS)
// ---------------------------------------------------------------------------

export const fetchPlayerView = action({
  args: { encounterId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const id = parseEncounterId(args.encounterId);
    const url = `${II_BASE_URL}/playerviews/${id}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch player view: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as IIPlayerView;

    // Normalize combatants
    const combatants = (data.Combatants ?? []).map(normalizeCombatant);

    return {
      encounterId: id,
      round: data.RoundCounter ?? 1,
      activeCombatantId: data.ActiveCombatantId ?? null,
      combatants,
    };
  },
});

// ---------------------------------------------------------------------------
// Public action: import encounter (one-shot)
// ---------------------------------------------------------------------------

export const importEncounter = action({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    encounterId: v.string(),
  },
  returns: v.object({ imported: v.number() }),
  handler: async (ctx, args) => {
    const id = parseEncounterId(args.encounterId);
    const url = `${II_BASE_URL}/playerviews/${id}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch player view: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as IIPlayerView;
    const combatants = (data.Combatants ?? []).map(normalizeCombatant);

    if (combatants.length === 0) {
      return { imported: 0 };
    }

    // Read the current scene to get existing templates
    const scene = await ctx.runQuery(api.scenes.getById, { id: args.sceneId });
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized");
    }

    const existingTemplates = scene.tokenTemplates ?? [];
    const existingTokens = scene.tokens ?? [];

    const newTemplates = [...existingTemplates];
    const newTokens = [...existingTokens];

    // Track names we've seen so we can reuse templates
    const templateByName = new Map<string, string>();
    for (const t of existingTemplates) {
      templateByName.set(t.name.toLowerCase(), t.id);
    }

    let importedCount = 0;
    const SPACING = 60; // pixels between placed tokens

    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];

      // Find or create template
      let templateId = templateByName.get(c.name.toLowerCase());
      if (!templateId) {
        templateId = crypto.randomUUID();
        newTemplates.push({
          id: templateId,
          name: c.name,
          imageUrl:
            c.imageUrl ||
            "https://utfs.io/f/placeholder-token.png",
          imageKey: `ii-import-${templateId}`,
          borderColor: "#888888",
        });
        templateByName.set(c.name.toLowerCase(), templateId);
      }

      // Check if this combatant already exists (by iiCombatantId)
      const existing = existingTokens.find(
        (t) => t.iiCombatantId === c.id,
      );
      if (existing) {
        // Update existing token's stats
        const idx = newTokens.findIndex((t) => t.id === existing.id);
        if (idx !== -1) {
          newTokens[idx] = {
            ...newTokens[idx],
            currentHp: c.currentHp,
            maxHp: c.maxHp,
            tempHp: c.tempHp,
            ac: c.ac,
          };
        }
        importedCount++;
        continue;
      }

      // Create new token instance
      const tokenId = crypto.randomUUID();
      newTokens.push({
        id: tokenId,
        templateId,
        x: 200 + (i % 5) * SPACING,
        y: 200 + Math.floor(i / 5) * SPACING,
        size: 22,
        hidden: false,
        initiative: undefined,
        currentHp: c.currentHp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        ac: c.ac,
        damageLog: [],
        iiCombatantId: c.id,
      });
      importedCount++;
    }

    // Write everything back
    await ctx.runMutation(api.scenes.update, {
      id: args.sceneId,
      creatorId: args.creatorId,
      lights: scene.lights,
      mirrors: scene.mirrors,
      tokenTemplates: newTemplates,
      tokens: newTokens,
    });

    return { imported: importedCount };
  },
});

// ---------------------------------------------------------------------------
// Enable / disable live sync
// ---------------------------------------------------------------------------

export const enableLiveSync = action({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
    encounterId: v.string(),
    pollIntervalMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = parseEncounterId(args.encounterId);
    const pollIntervalMs = args.pollIntervalMs ?? 3000;

    // Verify scene ownership
    const scene = await ctx.runQuery(api.scenes.getById, { id: args.sceneId });
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized");
    }

    // Set iiSync config on the scene
    await ctx.runMutation(internal.iiSyncMutations.setIISyncConfig, {
      sceneId: args.sceneId,
      iiSync: {
        encounterId: id,
        enabled: true,
        pollIntervalMs,
        lastPulledAt: Date.now(),
      },
    });

    // Schedule the first sync tick
    await ctx.scheduler.runAfter(pollIntervalMs, internal.iiSync.syncTick, {
      sceneId: args.sceneId,
    });

    return null;
  },
});

export const disableLiveSync = action({
  args: {
    sceneId: v.id("scenes"),
    creatorId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scene = await ctx.runQuery(api.scenes.getById, { id: args.sceneId });
    if (!scene) throw new Error("Scene not found");
    if (scene.creatorId !== args.creatorId) {
      throw new Error("Unauthorized");
    }

    if (scene.iiSync) {
      await ctx.runMutation(internal.iiSyncMutations.setIISyncConfig, {
        sceneId: args.sceneId,
        iiSync: {
          ...scene.iiSync,
          enabled: false,
        },
      });
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: sync tick (self-scheduling)
// ---------------------------------------------------------------------------

export const syncTick = internalAction({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, args) => {
    const scene = await ctx.runQuery(api.scenes.getById, { id: args.sceneId });
    if (!scene) return;

    const syncConfig = scene.iiSync;
    if (!syncConfig || !syncConfig.enabled) return;

    const pollIntervalMs = syncConfig.pollIntervalMs ?? 3000;

    try {
      const url = `${II_BASE_URL}/playerviews/${syncConfig.encounterId}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `iiSync.syncTick: fetch failed ${response.status} for ${syncConfig.encounterId}`,
        );
        // Re-schedule even on failure so sync resumes when the server comes back
        await ctx.scheduler.runAfter(pollIntervalMs, internal.iiSync.syncTick, {
          sceneId: args.sceneId,
        });
        return;
      }

      const data = (await response.json()) as IIPlayerView;
      const combatants = (data.Combatants ?? []).map(normalizeCombatant);

      // Apply the diff
      await ctx.runMutation(internal.iiSyncMutations.applySyncDiff, {
        sceneId: args.sceneId,
        combatants: combatants.map((c) => ({
          id: c.id,
          name: c.name,
          currentHp: c.currentHp ?? 0,
          maxHp: c.maxHp ?? 0,
          tempHp: c.tempHp ?? 0,
          ac: c.ac ?? 0,
        })),
        round: data.RoundCounter ?? 1,
        activeCombatantId: data.ActiveCombatantId ?? null,
        encounterId: syncConfig.encounterId,
      });
    } catch (error) {
      console.error("iiSync.syncTick error:", error);
    }

    // Re-schedule
    await ctx.scheduler.runAfter(pollIntervalMs, internal.iiSync.syncTick, {
      sceneId: args.sceneId,
    });
  },
});
