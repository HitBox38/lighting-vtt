import { eq } from "drizzle-orm";
import { db } from "../../db";
import { scenesTable } from "../../db/schema";

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
