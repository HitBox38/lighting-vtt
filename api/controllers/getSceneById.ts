import { eq } from "drizzle-orm";
import { db } from "../../db";
import { scenesTable } from "../../db/schema";

interface Payload {
  id: string;
}

export const getSceneById = async (payload?: Payload) => {
  if (!payload || !payload.id) {
    return {
      message: "No scene ID provided",
      payload: null,
    };
  }

  const scenes = await db.select().from(scenesTable).where(eq(scenesTable.id, payload.id)).limit(1);

  if (scenes.length === 0) {
    return {
      message: "Scene not found",
      payload: null,
    };
  }

  return {
    message: "Scene fetched successfully",
    payload: scenes[0],
  };
};
