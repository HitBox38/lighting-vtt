import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { scenesTable } from "../../db/schema.js";
import type { UpdateScenePayload, UpdateSceneResponse } from "../../shared/index.js";

export const updateScene = async (payload?: UpdateScenePayload): Promise<UpdateSceneResponse> => {
  if (!payload) {
    return {
      message: "No payload provided",
      success: false,
    };
  }

  const { sceneId, creatorId, lightsState, mirrorsState } = payload;

  if (!sceneId || !creatorId) {
    return {
      message: "Missing required fields",
      success: false,
    };
  }

  // Verify scene exists and user is the creator
  const existingScene = await db
    .select({ id: scenesTable.id, creatorId: scenesTable.creatorId })
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
      message: "Unauthorized: Only the scene creator can update this scene",
      success: false,
    };
  }

  // Update the scene
  await db
    .update(scenesTable)
    .set({
      lightsState: { lights: lightsState },
      mirrorsState: { mirrors: mirrorsState },
      updatedAt: Date.now(),
    })
    .where(and(eq(scenesTable.id, sceneId), eq(scenesTable.creatorId, creatorId)));

  return {
    message: "Scene updated successfully",
    success: true,
  };
};
