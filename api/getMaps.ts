import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { scenesTable } from "../db/schema.js";

interface Payload {
  creatorId: string;
}

export const getMaps = async (payload?: Payload) => {
  if (!payload) {
    return {
      message: "No payload provided",
      payload: null,
    };
  }
  const maps = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.creatorId, payload.creatorId));

  return {
    message: "Maps fetched successfully",
    payload: maps,
  };
};
