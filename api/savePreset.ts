import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { scenesTable } from "../db/schema.ts";
import type { SavePresetPayload, SavePresetResponse, LightPreset } from "../shared/index.ts";

export const savePreset = async (payload?: SavePresetPayload): Promise<SavePresetResponse> => {
  if (!payload) {
    return {
      message: "No payload provided",
      success: false,
      payload: null,
    };
  }

  const { sceneId, creatorId, preset } = payload;

  if (!sceneId || !creatorId || !preset) {
    return {
      message: "Missing required fields",
      success: false,
      payload: null,
    };
  }

  // Verify scene exists and user is the creator
  const existingScene = await db
    .select({ id: scenesTable.id, creatorId: scenesTable.creatorId, presets: scenesTable.presets })
    .from(scenesTable)
    .where(eq(scenesTable.id, sceneId))
    .limit(1);

  if (existingScene.length === 0) {
    return {
      message: "Scene not found",
      success: false,
      payload: null,
    };
  }

  if (existingScene[0].creatorId !== creatorId) {
    return {
      message: "Unauthorized: Only the scene creator can modify presets",
      success: false,
      payload: null,
    };
  }

  const currentPresets: LightPreset[] = existingScene[0].presets ?? [];

  // Check if preset with this ID already exists (update) or is new (create)
  const existingPresetIndex = currentPresets.findIndex((p) => p.id === preset.id);

  let updatedPresets: LightPreset[];
  if (existingPresetIndex >= 0) {
    // Update existing preset
    updatedPresets = [...currentPresets];
    updatedPresets[existingPresetIndex] = preset;
  } else {
    // Add new preset
    updatedPresets = [...currentPresets, preset];
  }

  await db
    .update(scenesTable)
    .set({
      presets: updatedPresets,
      updatedAt: Date.now(),
    })
    .where(eq(scenesTable.id, sceneId));

  return {
    message:
      existingPresetIndex >= 0 ? "Preset updated successfully" : "Preset created successfully",
    success: true,
    payload: { presetId: preset.id },
  };
};
