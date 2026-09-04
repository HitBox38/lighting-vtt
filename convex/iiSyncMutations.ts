import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { iiSyncValidator } from "./schema";

/**
 * Internal mutation to set the iiSync config on a scene.
 */
export const setIISyncConfig = internalMutation({
  args: {
    sceneId: v.id("scenes"),
    iiSync: iiSyncValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sceneId, {
      iiSync: args.iiSync,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to apply the diff from an II sync tick.
 * Compares incoming combatant data against existing tokens by `iiCombatantId`,
 * updates HP/AC and appends damage-log entries for HP changes.
 */
export const applySyncDiff = internalMutation({
  args: {
    sceneId: v.id("scenes"),
    combatants: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        currentHp: v.number(),
        maxHp: v.number(),
        tempHp: v.number(),
        ac: v.number(),
      }),
    ),
    round: v.number(),
    activeCombatantId: v.union(v.string(), v.null()),
    encounterId: v.string(),
  },
  handler: async (ctx, args) => {
    const scene = await ctx.db.get(args.sceneId);
    if (!scene) return;

    const tokens = [...(scene.tokens ?? [])];
    const templates = [...(scene.tokenTemplates ?? [])];
    let changed = false;

    // Build lookup of existing tokens by iiCombatantId
    const tokenByIIId = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].iiCombatantId) {
        tokenByIIId.set(tokens[i].iiCombatantId!, i);
      }
    }

    // Track names for template reuse
    const templateByName = new Map<string, string>();
    for (const t of templates) {
      templateByName.set(t.name.toLowerCase(), t.id);
    }

    const SPACING = 60;
    const existingCount = tokens.length;

    for (let ci = 0; ci < args.combatants.length; ci++) {
      const c = args.combatants[ci];
      const existingIdx = tokenByIIId.get(c.id);

      if (existingIdx !== undefined) {
        // Update existing token
        const token = tokens[existingIdx];
        const oldHp = token.currentHp ?? 0;
        const hpDelta = c.currentHp - oldHp;

        const updates: Record<string, unknown> = {
          ...token,
          currentHp: c.currentHp,
          maxHp: c.maxHp,
          tempHp: c.tempHp,
          ac: c.ac,
        };

        // Append damage log entry if HP changed
        if (hpDelta !== 0) {
          const existingLog = token.damageLog ?? [];
          updates.damageLog = [
            ...existingLog,
            {
              timestamp: Date.now(),
              delta: hpDelta,
              source: `iinit:${args.encounterId}`,
              round: args.round,
            },
          ];
        }

        tokens[existingIdx] = updates as (typeof tokens)[number];
        changed = true;
      } else {
        // New combatant — create token
        let templateId = templateByName.get(c.name.toLowerCase());
        if (!templateId) {
          templateId = crypto.randomUUID();
          templates.push({
            id: templateId,
            name: c.name,
            imageUrl: "https://utfs.io/f/placeholder-token.png",
            imageKey: `ii-sync-${templateId}`,
            borderColor: "#888888",
          });
          templateByName.set(c.name.toLowerCase(), templateId);
        }

        const newIdx = existingCount + ci;
        tokens.push({
          id: crypto.randomUUID(),
          templateId,
          x: 200 + (newIdx % 5) * SPACING,
          y: 200 + Math.floor(newIdx / 5) * SPACING,
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
        changed = true;
      }
    }

    // Mark tokens whose II combatant was removed as hidden
    const incomingIds = new Set(args.combatants.map((c) => c.id));
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.iiCombatantId && !incomingIds.has(t.iiCombatantId) && !t.hidden) {
        tokens[i] = { ...t, hidden: true };
        changed = true;
      }
    }

    if (changed) {
      await ctx.db.patch(args.sceneId, {
        tokens,
        tokenTemplates: templates,
        iiSync: {
          ...(scene.iiSync ?? {
            encounterId: args.encounterId,
            enabled: true,
          }),
          lastPulledAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
    }
  },
});
