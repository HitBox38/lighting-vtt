import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { scenesTable } from "../../db/schema.ts";
import type { DeletePresetPayload, DeletePresetResponse, LightPreset } from "../../shared/index.ts";

export const deletePreset = async (
  payload?: DeletePresetPayload
): Promise<DeletePresetResponse> => {
  if (!payload) {
    return {
      message: "No payload provided",
      success: false,
    };
  }

  const { sceneId, creatorId, presetId } = payload;

  if (!sceneId || !creatorId || !presetId) {
    return {
      message: "Missing required fields",
      success: false,
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
    };
  }

  if (existingScene[0].creatorId !== creatorId) {
    return {
      message: "Unauthorized: Only the scene creator can modify presets",
      success: false,
    };
  }

  const currentPresets: LightPreset[] = existingScene[0].presets ?? [];
  const updatedPresets = currentPresets.filter((p) => p.id !== presetId);

  if (updatedPresets.length === currentPresets.length) {
    return {
      message: "Preset not found",
      success: false,
    };
  }

  await db
    .update(scenesTable)
    .set({
      presets: updatedPresets,
      updatedAt: Date.now(),
    })
    .where(eq(scenesTable.id, sceneId));

  return {
    message: "Preset deleted successfully",
    success: true,
  };
};
